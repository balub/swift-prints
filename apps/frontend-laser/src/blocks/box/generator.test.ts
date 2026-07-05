import { describe, expect, it } from "vitest";
import { boundsOfShape, flattenPath, type PathShape } from "@/lib/geometry";
import { BOX_DEFAULTS, fingerCount, generateBox, generateBoxPanels, panelOutline, validateBox, type BoxParams } from "./generator";

const P: BoxParams = { ...BOX_DEFAULTS, length: 120, width: 80, height: 50, thickness: 3, kerf: 0, fingerSize: 10, closedTop: false, labels: false };

function area(shape: PathShape): number {
  const pts = flattenPath(shape);
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

describe("panelOutline", () => {
  it("produces a plain rectangle for flat profiles", () => {
    const outline = panelOutline(100, 60, [
      { profile: [{ len: 100, off: 0 }] },
      { profile: [{ len: 60, off: 0 }] },
      { profile: [{ len: 100, off: 0 }] },
      { profile: [{ len: 60, off: 0 }] },
    ]);
    expect(outline.vertices).toHaveLength(4);
    expect(area(outline)).toBeCloseTo(6000, 6);
  });
});

describe("generateBoxPanels", () => {
  const { length: L, width: W, height: H, thickness: t, fingerSize: f } = P;

  it("panel areas match the closed-form finger-joint expectation", () => {
    const panels = generateBoxPanels(P);
    const byName = Object.fromEntries(panels.map((p) => [p.name, p]));

    // Front: L×H minus bottom-edge notches minus vertical-edge insets.
    const nB = fingerCount(L - 2 * t, f); // bottom span segments
    const segB = (L - 2 * t) / nB;
    const notchesBottom = ((nB + 1) / 2) * segB * t;
    const nV = fingerCount(H, f);
    const segV = H / nV;
    const insetPerVerticalEdge = ((nV - 1) / 2) * segV * t;
    const expectedFront = L * H - notchesBottom - 2 * insetPerVerticalEdge;
    expect(area(byName["Front"].outline)).toBeCloseTo(expectedFront, 3);

    // Side: W×H minus bottom notches minus female vertical insets (tabs = B phase).
    const nBS = fingerCount(W - 2 * t, f);
    const segBS = (W - 2 * t) / nBS;
    const notchesBottomS = ((nBS + 1) / 2) * segBS * t;
    const insetFemale = ((nV + 1) / 2) * segV * t;
    const expectedSide = W * H - notchesBottomS - 2 * insetFemale;
    expect(area(byName["Left side"].outline)).toBeCloseTo(expectedSide, 3);

    // Bottom: core plus protruding tabs on all four edges.
    const nL = fingerCount(L - 2 * t, f);
    const segL = (L - 2 * t) / nL;
    const nW = fingerCount(W - 2 * t, f);
    const segW = (W - 2 * t) / nW;
    const expectedBottom = (L - 2 * t) * (W - 2 * t) + 2 * ((nL + 1) / 2) * segL * t + 2 * ((nW + 1) / 2) * segW * t;
    expect(area(byName["Bottom"].outline)).toBeCloseTo(expectedBottom, 3);
  });

  it("front and side vertical edges are complementary (assembled corner is gap-free)", () => {
    const panels = generateBoxPanels(P);
    const front = panels.find((p) => p.name === "Front")!;
    const side = panels.find((p) => p.name === "Left side")!;
    // Sample the left edge of each panel at many heights; material-at-edge
    // must alternate: exactly one of the two panels owns each height.
    const frontPts = flattenPath(front.outline);
    const sidePts = flattenPath(side.outline);
    const atEdge = (pts: { x: number; y: number }[], y: number) =>
      edgeMaterialAt(pts, y);
    for (let y = 0.5; y < P.height; y += 0.5) {
      const f = atEdge(frontPts, y);
      const s = atEdge(sidePts, y);
      if (f === null || s === null) continue; // right on a transition
      expect(f !== s, `height ${y}: front=${f} side=${s}`).toBe(true);
    }
  });

  it("respects the closed-top option", () => {
    expect(generateBoxPanels({ ...P, closedTop: false })).toHaveLength(5);
    const closed = generateBoxPanels({ ...P, closedTop: true });
    expect(closed).toHaveLength(6);
    expect(closed[5].name).toBe("Top");
  });

  it("kerf compensation widens tabs and narrows notches", () => {
    const noKerf = generateBoxPanels({ ...P, kerf: 0 });
    const withKerf = generateBoxPanels({ ...P, kerf: 0.2 });
    const frontNo = area(noKerf.find((p) => p.name === "Front")!.outline);
    const frontYes = area(withKerf.find((p) => p.name === "Front")!.outline);
    expect(frontYes).toBeGreaterThan(frontNo); // material grew
    const sideNo = area(noKerf.find((p) => p.name === "Left side")!.outline);
    const sideYes = area(withKerf.find((p) => p.name === "Left side")!.outline);
    expect(sideYes).toBeGreaterThan(sideNo);
  });
});

/**
 * For a panel outline, determine whether material reaches x = 0 at height y
 * (scanline test: count crossings of the vertical line x = eps).
 */
function edgeMaterialAt(pts: { x: number; y: number }[], y: number): boolean | null {
  // Point-in-polygon at (eps, y)
  const x = 0.01;
  let inside = false;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (Math.abs(a.y - y) < 1e-6 || Math.abs(b.y - y) < 1e-6) return null;
    if (a.y > y !== b.y > y) {
      const xCross = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (xCross > x) inside = !inside;
    }
  }
  return inside;
}

describe("generateBox", () => {
  it("returns a cut list and layout size", () => {
    const design = generateBox(P);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    const labels = design.summary.map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(["Bottom", "Front", "Back", "Side", "Layout size"]));
    const side = design.summary.find((s) => s.label === "Side")!;
    expect(side.value).toContain("2 ×");
  });

  it("blocks generation on invalid thickness", () => {
    const design = generateBox({ ...P, thickness: 0 });
    expect(design.geometry.shapes).toHaveLength(0);
    expect(design.warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("warns on fragile fingers", () => {
    const warnings = validateBox({ ...P, fingerSize: 2 });
    expect(warnings.some((w) => w.level === "warning")).toBe(true);
  });
});
