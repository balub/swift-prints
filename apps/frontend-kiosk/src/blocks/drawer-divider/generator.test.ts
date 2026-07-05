import { describe, expect, it } from "vitest";
import { flattenPath } from "@/lib/geometry";
import {
  DRAWER_DIVIDER_DEFAULTS,
  generateDividerPieces,
  generateDrawerDivider,
  slottedStrip,
  validateDrawerDivider,
} from "./generator";

function area(pts: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

describe("slottedStrip", () => {
  it("removes exactly the slot area", () => {
    const outline = slottedStrip(200, 60, [50, 100, 150], 3, 30, "top");
    expect(area(flattenPath(outline))).toBeCloseTo(200 * 60 - 3 * 3 * 30, 6);
    const bottom = slottedStrip(200, 60, [50], 3, 30, "bottom");
    expect(area(flattenPath(bottom))).toBeCloseTo(200 * 60 - 3 * 30, 6);
  });
});

describe("generateDividerPieces", () => {
  it("produces (columns-1) lengthwise and (rows-1) crosswise strips with matching slot positions", () => {
    const pieces = generateDividerPieces(DRAWER_DIVIDER_DEFAULTS);
    const { columns, rows, width, depth, height } = DRAWER_DIVIDER_DEFAULTS;
    expect(pieces).toHaveLength(columns - 1 + (rows - 1));

    // Lengthwise strips have (rows-1) slots at depth fractions, entering from the top.
    const lengthwise = pieces.filter((p) => p.name.startsWith("Lengthwise"));
    for (const piece of lengthwise) {
      const pts = flattenPath(piece.outline);
      const slotBottoms = pts.filter((p) => Math.abs(p.y - height / 2) < 1e-9);
      expect(slotBottoms).toHaveLength(2 * (rows - 1));
      // slot centers sit at depth*j/rows
      for (let j = 1; j < rows; j++) {
        const center = (depth * j) / rows;
        expect(slotBottoms.some((p) => Math.abs(p.x - center) < DRAWER_DIVIDER_DEFAULTS.thickness)).toBe(true);
      }
    }

    // Crosswise strips carry slots from the bottom at width fractions.
    const crosswise = pieces.filter((p) => p.name.startsWith("Crosswise"));
    for (const piece of crosswise) {
      const pts = flattenPath(piece.outline);
      for (let i = 1; i < columns; i++) {
        const center = (width * i) / columns;
        expect(pts.some((p) => Math.abs(p.y - height / 2) < 1e-9 && Math.abs(p.x - center) < DRAWER_DIVIDER_DEFAULTS.thickness)).toBe(true);
      }
    }
  });

  it("narrows slots by the kerf for a snug fit", () => {
    const noKerf = generateDividerPieces({ ...DRAWER_DIVIDER_DEFAULTS, kerf: 0 });
    const withKerf = generateDividerPieces({ ...DRAWER_DIVIDER_DEFAULTS, kerf: 0.2 });
    const a0 = area(flattenPath(noKerf[0].outline));
    const a1 = area(flattenPath(withKerf[0].outline));
    expect(a1).toBeGreaterThan(a0); // narrower slots leave more material
  });
});

describe("generateDrawerDivider", () => {
  it("returns a cut list and layout", () => {
    const design = generateDrawerDivider(DRAWER_DIVIDER_DEFAULTS);
    expect(design.geometry.shapes.length).toBeGreaterThan(0);
    expect(design.summary.some((s) => s.label === "Compartments")).toBe(true);
  });

  it("rejects a 1×1 grid and kerf >= thickness", () => {
    expect(validateDrawerDivider({ ...DRAWER_DIVIDER_DEFAULTS, columns: 1, rows: 1 }).some((w) => w.level === "error")).toBe(true);
    expect(validateDrawerDivider({ ...DRAWER_DIVIDER_DEFAULTS, kerf: 3 }).some((w) => w.level === "error")).toBe(true);
  });

  it("warns about cramped compartments", () => {
    const warnings = validateDrawerDivider({ ...DRAWER_DIVIDER_DEFAULTS, columns: 12, rows: 16 });
    expect(warnings.some((w) => w.message.includes("Compartments"))).toBe(true);
  });
});
