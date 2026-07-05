import { describe, expect, it } from "vitest";
import { flattenPath, type PathShape } from "@/lib/geometry";
import { generatePhoneStand, PHONE_STAND_DEFAULTS, standProfile, validatePhoneStand } from "./generator";

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

describe("standProfile", () => {
  it("keeps the brace hole fully inside the side profile", () => {
    const { outline, braceHole } = standProfile(PHONE_STAND_DEFAULTS);
    const profilePts = flattenPath(outline);
    for (const corner of flattenPath(braceHole)) {
      expect(pointInPolygon(profilePts, corner.x, corner.y), `corner ${corner.x},${corner.y}`).toBe(true);
    }
  });

  it("narrows the brace hole by the kerf", () => {
    const noKerf = standProfile({ ...PHONE_STAND_DEFAULTS, kerf: 0 });
    const withKerf = standProfile({ ...PHONE_STAND_DEFAULTS, kerf: 0.2 });
    expect(area(withKerf.braceHole)).toBeLessThan(area(noKerf.braceHole));
  });

  it("reclining further makes the stand deeper and shorter", () => {
    const upright = standProfile({ ...PHONE_STAND_DEFAULTS, reclineDeg: 15 });
    const reclined = standProfile({ ...PHONE_STAND_DEFAULTS, reclineDeg: 40 });
    expect(reclined.points.D).toBeGreaterThan(upright.points.D);
    expect(reclined.points.Ty).toBeLessThan(upright.points.Ty);
  });
});

describe("generatePhoneStand", () => {
  it("lays out two sides with holes and one brace", () => {
    const design = generatePhoneStand(PHONE_STAND_DEFAULTS);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    expect(design.geometry.shapes).toHaveLength(5); // 2 outlines + 2 brace holes + brace
  });

  it("errors when the brace cannot fit in the profile", () => {
    const warnings = validatePhoneStand({ ...PHONE_STAND_DEFAULTS, braceHeight: 80 });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("warns about narrow channels and extreme recline", () => {
    expect(validatePhoneStand({ ...PHONE_STAND_DEFAULTS, channel: 7 }).some((w) => w.level === "warning")).toBe(true);
    expect(validatePhoneStand({ ...PHONE_STAND_DEFAULTS, reclineDeg: 50 }).some((w) => w.level === "warning")).toBe(true);
  });
});
