/**
 * Coaster set generator.
 *
 * Each coaster: outer CUT outline (circle, rounded square or hexagon),
 * optional engraved border ring(s) inset from the edge, and optional
 * engraved center text (monogram or word). The set is laid out in a grid.
 */

import {
  circle,
  path,
  roundedRect,
  text,
  translateShape,
  boundsOfGeometry,
  estimateTextWidth,
  type LaserGeometry,
  type PathShape,
  type Shape,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export type CoasterShape = "circle" | "square" | "hexagon";
export type BorderStyle = "none" | "single" | "double";

export interface CoasterParams {
  shape: CoasterShape;
  /** Across-flats size (diameter / side width), mm. */
  size: number;
  quantity: number;
  cornerRadius: number; // square only
  border: BorderStyle;
  textContent: string;
  fontSize: number;
  engraveText: boolean;
  thickness: number; // summary only
}

export const COASTER_DEFAULTS: CoasterParams = {
  shape: "circle",
  size: 95,
  quantity: 4,
  cornerRadius: 8,
  border: "single",
  textContent: "B",
  fontSize: 24,
  engraveText: true,
  thickness: 3,
};

const BORDER_INSET = 5; // mm from the edge to the first ring
const RING_GAP = 2.5; // gap between double rings

/** Across-corners height of a pointy-top hexagon with the given across-flats width. */
export function hexagonHeight(acrossFlats: number): number {
  return acrossFlats / Math.cos(Math.PI / 6);
}

/**
 * Regular pointy-top hexagon, `acrossFlats` wide, sitting on y = 0
 * (bounds: [0, acrossFlats] × [0, hexagonHeight(acrossFlats)]).
 */
function hexagon(acrossFlats: number, layer: PathShape["layer"] = "CUT", inset = 0): PathShape {
  const cx = acrossFlats / 2;
  const cy = hexagonHeight(acrossFlats) / 2;
  const r = (acrossFlats / 2 - inset) / Math.cos(Math.PI / 6); // circumradius
  const vertices = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return path(vertices, layer);
}

/** Center of one coaster in its local frame. */
function coasterCenter(params: CoasterParams): { x: number; y: number } {
  const c = params.size / 2;
  return { x: c, y: params.shape === "hexagon" ? hexagonHeight(params.size) / 2 : c };
}

function coasterShapes(params: CoasterParams): Shape[] {
  const { shape, size, cornerRadius, border } = params;
  const c = size / 2;
  const center = coasterCenter(params);
  const shapes: Shape[] = [];

  // Outline
  if (shape === "circle") shapes.push(circle(c, c, c, "CUT"));
  else if (shape === "square") shapes.push(roundedRect(0, 0, size, size, cornerRadius, "CUT"));
  else shapes.push(hexagon(size, "CUT"));

  // Border rings (engraved)
  const insets = border === "none" ? [] : border === "single" ? [BORDER_INSET] : [BORDER_INSET, BORDER_INSET + RING_GAP];
  for (const inset of insets) {
    if (shape === "circle") shapes.push(circle(c, c, c - inset, "ENGRAVE"));
    else if (shape === "square") {
      shapes.push(roundedRect(inset, inset, size - 2 * inset, size - 2 * inset, Math.max(cornerRadius - inset, 0), "ENGRAVE"));
    } else shapes.push(hexagon(size, "ENGRAVE", inset));
  }

  // Center text
  if (params.engraveText && params.textContent.trim()) {
    shapes.push(text(center.x, center.y - params.fontSize / 2, params.fontSize, params.textContent.trim(), "center", "ENGRAVE"));
  }

  return shapes;
}

export function validateCoaster(params: CoasterParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  if (params.size <= 0) warnings.push({ level: "error", message: "Coaster size must be greater than 0." });
  if (params.quantity < 1) warnings.push({ level: "error", message: "Quantity must be at least 1." });
  if (params.size > 0 && params.size < 70) {
    warnings.push({ level: "warning", message: "Coasters under 70 mm barely fit a mug — 90–100 mm is typical." });
  }
  if (params.size > 150) warnings.push({ level: "warning", message: "That's a trivet, not a coaster — over 150 mm." });
  if (params.engraveText && params.textContent.trim()) {
    if (params.fontSize < 3) warnings.push({ level: "warning", message: "Text under 3 mm tends to engrave as a blur." });
    const t = text(0, 0, params.fontSize, params.textContent.trim());
    const maxWidth = (params.size - 2 * (BORDER_INSET + RING_GAP + 3)) * (params.shape === "square" ? 0.9 : 0.8);
    if (estimateTextWidth(t) > maxWidth) {
      warnings.push({ level: "warning", message: "Text looks too wide for the coaster — shorten it or reduce the font size." });
    }
  }
  return warnings;
}

export function generateCoasterSet(params: CoasterParams): GeneratedDesign {
  const warnings = validateCoaster(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const spacing = 6;
  const perRow = Math.ceil(Math.sqrt(params.quantity));
  const cellH = params.shape === "hexagon" ? hexagonHeight(params.size) : params.size;
  const one = coasterShapes(params);
  const shapes: Shape[] = [];
  for (let i = 0; i < params.quantity; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const dx = col * (params.size + spacing);
    const dy = row * (cellH + spacing);
    shapes.push(...one.map((s) => translateShape(s, dx, dy)));
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Coasters", value: `${params.quantity} × ${params.size} mm ${params.shape}` },
    { label: "Material", value: `${params.thickness} mm cork-backed plywood or acrylic` },
    {
      label: "Operations",
      value: `Cut outlines${params.border !== "none" ? ", engrave border" : ""}${params.engraveText && params.textContent.trim() ? ", engrave text" : ""}`,
    },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
