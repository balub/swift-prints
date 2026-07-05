import { describe, expect, it } from "vitest";
import { generateMountingPlate, gridHoleCenters, MOUNTING_PLATE_DEFAULTS, validateMountingPlate } from "./generator";

describe("generateMountingPlate", () => {
  it("emits outline plus grid and extra holes", () => {
    const design = generateMountingPlate({
      ...MOUNTING_PLATE_DEFAULTS,
      holes: [{ x: 10, y: 10, diameter: 5 }],
    });
    const circles = design.geometry.shapes.filter((s) => s.kind === "circle");
    expect(circles).toHaveLength(4 * 3 + 1);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
  });

  it("centers the grid on the plate", () => {
    const centers = gridHoleCenters(MOUNTING_PLATE_DEFAULTS);
    const xs = centers.map((c) => c.x);
    const ys = centers.map((c) => c.y);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(MOUNTING_PLATE_DEFAULTS.width / 2, 6);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(MOUNTING_PLATE_DEFAULTS.height / 2, 6);
  });

  it("errors when the grid overflows the plate", () => {
    const warnings = validateMountingPlate({
      ...MOUNTING_PLATE_DEFAULTS,
      grid: { ...MOUNTING_PLATE_DEFAULTS.grid, pitchX: 60, columns: 4 },
    });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("errors on an extra hole outside the plate", () => {
    const warnings = validateMountingPlate({
      ...MOUNTING_PLATE_DEFAULTS,
      holes: [{ x: 130, y: 40, diameter: 4 }],
    });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });
});
