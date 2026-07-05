import { describe, expect, it } from "vitest";
import { flattenPath } from "@/lib/geometry";
import { geometryToDxf } from "@/lib/dxf";
import { geometryToSvg } from "@/lib/svg";
import { EDGE_LIT_DEFAULTS, edgeLitPanel, generateEdgeLit, panelTabPositions, validateEdgeLit } from "./generator";

describe("edgeLitPanel", () => {
  it("has the area of the panel minus corner cutoffs plus two tabs", () => {
    const params = { ...EDGE_LIT_DEFAULTS, kerf: 0 };
    const pts = flattenPath(edgeLitPanel(params), 0.01);
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      sum += a.x * b.y - b.x * a.y;
    }
    const r = params.cornerRadius;
    const expected = params.width * params.height - (4 - Math.PI) * r * r * 0.5 + 2 * 20 * params.thickness;
    expect(Math.abs(sum / 2)).toBeCloseTo(expected, 0);
  });

  it("uses one tab on narrow panels", () => {
    expect(panelTabPositions(60)).toHaveLength(1);
    expect(panelTabPositions(150)).toHaveLength(2);
  });
});

describe("generateEdgeLit", () => {
  it("emits panel, base and mirrored engraving", () => {
    const design = generateEdgeLit(EDGE_LIT_DEFAULTS);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    const textShape = design.geometry.shapes.find((s) => s.kind === "text");
    expect(textShape?.kind === "text" && textShape.mirrored).toBe(true);

    const dxf = geometryToDxf(design.geometry);
    expect(dxf).toContain("71\n2"); // mirrored TEXT generation flag

    const svg = geometryToSvg(design.geometry);
    expect(svg).toContain("scale(-1,1)");
  });

  it("skips mirroring when disabled", () => {
    const design = generateEdgeLit({ ...EDGE_LIT_DEFAULTS, mirrored: false });
    const dxf = geometryToDxf(design.geometry);
    expect(dxf).not.toContain("71\n2");
  });

  it("cuts matching slots in the base", () => {
    const design = generateEdgeLit(EDGE_LIT_DEFAULTS);
    const paths = design.geometry.shapes.filter((s) => s.kind === "path");
    // panel + base + 2 slots
    expect(paths).toHaveLength(4);
  });

  it("errors on invalid thickness and warns on shallow bases", () => {
    expect(validateEdgeLit({ ...EDGE_LIT_DEFAULTS, thickness: 0 }).some((w) => w.level === "error")).toBe(true);
    expect(validateEdgeLit({ ...EDGE_LIT_DEFAULTS, baseDepth: 20 }).some((w) => w.level === "warning")).toBe(true);
  });
});
