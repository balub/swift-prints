import { describe, expect, it } from "vitest";
import { FRONT_PANEL_DEFAULTS, generateFrontPanel, validateFrontPanel } from "./generator";

describe("generateFrontPanel", () => {
  it("emits outline, mounting holes, component holes and labels", () => {
    const design = generateFrontPanel(FRONT_PANEL_DEFAULTS);
    const circles = design.geometry.shapes.filter((s) => s.kind === "circle");
    const texts = design.geometry.shapes.filter((s) => s.kind === "text");
    expect(circles).toHaveLength(4 + FRONT_PANEL_DEFAULTS.holes.length);
    expect(texts).toHaveLength(3);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
  });

  it("omits mounting holes and labels when disabled", () => {
    const design = generateFrontPanel({ ...FRONT_PANEL_DEFAULTS, mountingHoles: false, engraveLabels: false });
    expect(design.geometry.shapes.filter((s) => s.kind === "circle")).toHaveLength(3);
    expect(design.geometry.shapes.filter((s) => s.kind === "text")).toHaveLength(0);
  });

  it("errors when a hole leaves the panel", () => {
    const warnings = validateFrontPanel({
      ...FRONT_PANEL_DEFAULTS,
      holes: [{ x: 158, y: 30, diameter: 10, label: "X" }],
    });
    expect(warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("warns when two holes nearly touch", () => {
    const warnings = validateFrontPanel({
      ...FRONT_PANEL_DEFAULTS,
      holes: [
        { x: 50, y: 30, diameter: 10, label: "A" },
        { x: 58, y: 30, diameter: 10, label: "B" },
      ],
    });
    expect(warnings.some((w) => w.message.includes("very close"))).toBe(true);
  });

  it("skips labels that would fall off the bottom edge", () => {
    const design = generateFrontPanel({
      ...FRONT_PANEL_DEFAULTS,
      holes: [{ x: 80, y: 8, diameter: 6, label: "LOW" }],
    });
    expect(design.geometry.shapes.filter((s) => s.kind === "text")).toHaveLength(0);
    expect(design.warnings.some((w) => w.message.includes("No room"))).toBe(true);
  });
});
