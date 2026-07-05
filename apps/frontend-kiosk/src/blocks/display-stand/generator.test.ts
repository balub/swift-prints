import { describe, expect, it } from "vitest";
import { flattenPath, type PathShape } from "@/lib/geometry";
import {
  DISPLAY_STAND_DEFAULTS,
  generateDisplayStand,
  sideProfile,
  slopeLength,
  tabPositions,
  topPanel,
  validateDisplayStand,
} from "./generator";

function pointInPolygon(pts: { x: number; y: number }[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function area(shape: PathShape): number {
  const pts = flattenPath(shape);
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

describe("sideProfile", () => {
  it("keeps the angled slots fully inside the profile", () => {
    const { outline, slots } = sideProfile(DISPLAY_STAND_DEFAULTS);
    const profilePts = flattenPath(outline);
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      for (const corner of flattenPath(slot)) {
        expect(pointInPolygon(profilePts, corner.x, corner.y), `corner ${corner.x},${corner.y}`).toBe(true);
      }
    }
  });

  it("aligns the slots with the slope angle", () => {
    const { slots } = sideProfile({ ...DISPLAY_STAND_DEFAULTS, kerf: 0 });
    const [a, b] = slots[0].vertices;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const expected = Math.atan2(DISPLAY_STAND_DEFAULTS.backHeight - DISPLAY_STAND_DEFAULTS.frontHeight, DISPLAY_STAND_DEFAULTS.depth);
    expect(angle).toBeCloseTo(expected, 6);
  });
});

describe("topPanel", () => {
  it("has the area of the slope rectangle plus four tabs", () => {
    const params = { ...DISPLAY_STAND_DEFAULTS, kerf: 0 };
    const { outline } = topPanel(params);
    const Ls = slopeLength(params);
    const expected = Ls * params.width + 4 * 18 * params.thickness;
    expect(area(outline)).toBeCloseTo(expected, 3);
  });

  it("uses a single centered tab on short slopes", () => {
    const params = { ...DISPLAY_STAND_DEFAULTS, depth: 40, backHeight: 40, frontHeight: 15 };
    expect(tabPositions(params)).toHaveLength(1);
  });
});

describe("generateDisplayStand", () => {
  it("lays out sides, panel and lip", () => {
    const design = generateDisplayStand(DISPLAY_STAND_DEFAULTS);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    // 2×(outline+2 slots) + panel + 2 lip slots + lip
    expect(design.geometry.shapes).toHaveLength(10);
  });

  it("rejects a front taller than the back", () => {
    const warnings = validateDisplayStand({ ...DISPLAY_STAND_DEFAULTS, frontHeight: 80 });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("warns about steep faces", () => {
    const warnings = validateDisplayStand({ ...DISPLAY_STAND_DEFAULTS, backHeight: 140, depth: 60 });
    expect(warnings.some((w) => w.message.includes("steep"))).toBe(true);
  });
});
