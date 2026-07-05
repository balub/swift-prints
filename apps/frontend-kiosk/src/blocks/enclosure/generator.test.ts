import { describe, expect, it } from "vitest";
import { ENCLOSURE_DEFAULTS, generateEnclosure, validateEnclosure, ventSlots } from "./generator";

describe("ventSlots", () => {
  it("fills the available area without touching the joint margin", () => {
    const slots = ventSlots(140, 90);
    expect(slots.length).toBeGreaterThan(4);
    // defaults: 3 columns × 4 rows
    expect(slots).toHaveLength(12);
  });

  it("returns nothing for tiny panels", () => {
    expect(ventSlots(40, 20)).toHaveLength(0);
  });
});

describe("generateEnclosure", () => {
  it("emits 6 panels plus holes, port and lid vents", () => {
    const design = generateEnclosure(ENCLOSURE_DEFAULTS);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    const circles = design.geometry.shapes.filter((s) => s.kind === "circle");
    expect(circles).toHaveLength(ENCLOSURE_DEFAULTS.backHoles.length);
    // 6 panel outlines + 1 port + 12 lid vents + paths for everything else
    const paths = design.geometry.shapes.filter((s) => s.kind === "path");
    expect(paths).toHaveLength(6 + 1 + 12);
  });

  it("moves vents to the side panels when requested", () => {
    const lid = generateEnclosure({ ...ENCLOSURE_DEFAULTS, vents: "lid" });
    const sides = generateEnclosure({ ...ENCLOSURE_DEFAULTS, vents: "sides" });
    const none = generateEnclosure({ ...ENCLOSURE_DEFAULTS, vents: "none" });
    expect(none.geometry.shapes.length).toBeLessThan(lid.geometry.shapes.length);
    expect(sides.geometry.shapes.length).toBeGreaterThan(none.geometry.shapes.length);
  });

  it("errors when a back hole lands in the finger-joint band", () => {
    const warnings = validateEnclosure({
      ...ENCLOSURE_DEFAULTS,
      backHoles: [{ x: 2, z: 20, diameter: 6 }],
    });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("errors when the front port leaves the safe area", () => {
    const warnings = validateEnclosure({
      ...ENCLOSURE_DEFAULTS,
      frontPort: { enabled: true, width: 20, height: 10, x: 5, z: 20 },
    });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });
});
