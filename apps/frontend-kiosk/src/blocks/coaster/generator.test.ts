import { describe, expect, it } from "vitest";
import { boundsOfGeometry } from "@/lib/geometry";
import { COASTER_DEFAULTS, generateCoasterSet, hexagonHeight, validateCoaster } from "./generator";

describe("generateCoasterSet", () => {
  it("lays out the requested quantity", () => {
    const design = generateCoasterSet({ ...COASTER_DEFAULTS, quantity: 4, border: "none", engraveText: false });
    // one CUT outline per coaster, nothing else
    expect(design.geometry.shapes).toHaveLength(4);
    expect(design.geometry.shapes.every((s) => s.layer === "CUT")).toBe(true);
  });

  it("adds engraved rings and text per coaster", () => {
    const design = generateCoasterSet({ ...COASTER_DEFAULTS, quantity: 2, border: "double" });
    const engraves = design.geometry.shapes.filter((s) => s.layer === "ENGRAVE");
    // per coaster: 2 rings + 1 text
    expect(engraves).toHaveLength(2 * 3);
  });

  it("keeps every shape's bounds inside its coaster grid cell", () => {
    for (const shape of ["circle", "square", "hexagon"] as const) {
      const design = generateCoasterSet({ ...COASTER_DEFAULTS, shape, quantity: 1, engraveText: false });
      const b = boundsOfGeometry(design.geometry);
      const expectedH = shape === "hexagon" ? hexagonHeight(COASTER_DEFAULTS.size) : COASTER_DEFAULTS.size;
      expect(b.minX).toBeCloseTo(0, 1);
      expect(b.minY).toBeCloseTo(0, 1);
      expect(b.maxX - b.minX).toBeCloseTo(COASTER_DEFAULTS.size, 0);
      expect(b.maxY - b.minY).toBeCloseTo(expectedH, 0);
    }
  });

  it("does not overlap grid rows for hexagons", () => {
    const design = generateCoasterSet({ ...COASTER_DEFAULTS, shape: "hexagon", quantity: 4, engraveText: false, border: "none" });
    const b = boundsOfGeometry(design.geometry);
    // 2×2 grid: total height must be two full hexagon heights plus spacing
    expect(b.maxY - b.minY).toBeGreaterThan(2 * hexagonHeight(COASTER_DEFAULTS.size));
  });

  it("errors on invalid size and warns on tiny coasters", () => {
    expect(generateCoasterSet({ ...COASTER_DEFAULTS, size: 0 }).geometry.shapes).toHaveLength(0);
    expect(validateCoaster({ ...COASTER_DEFAULTS, size: 50 }).some((w) => w.level === "warning")).toBe(true);
  });
});
