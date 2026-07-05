/**
 * Drawer divider generator.
 *
 * A cross-lap grid: lengthwise strips (front-to-back) carry slots cut down
 * from their TOP edge, crosswise strips carry slots cut up from their BOTTOM
 * edge; both slot depths are half the divider height, so the strips press
 * together into a flat-topped grid.
 *
 * Slots are drawn (thickness − kerf) wide: after the beam removes kerf/2 on
 * each side the physical slot lands back on the material thickness for a
 * snug friction fit.
 */

import { path, translateShape, boundsOfGeometry, type LaserGeometry, type PathShape, type Shape, type Vertex } from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface DrawerDividerParams {
  /** Drawer interior width (left-right), mm. */
  width: number;
  /** Drawer interior depth (front-back), mm. */
  depth: number;
  /** Divider strip height, mm. */
  height: number;
  columns: number;
  rows: number;
  thickness: number;
  kerf: number;
}

export const DRAWER_DIVIDER_DEFAULTS: DrawerDividerParams = {
  width: 300,
  depth: 400,
  height: 60,
  columns: 3,
  rows: 4,
  thickness: 3,
  kerf: 0.15,
};

/**
 * Rectangle length × height with rectangular slots of the given width and
 * depth entering from the top or bottom edge, centered on each position.
 */
export function slottedStrip(
  length: number,
  height: number,
  slotPositions: number[],
  slotWidth: number,
  slotDepth: number,
  from: "top" | "bottom",
): PathShape {
  const sorted = [...slotPositions].sort((a, b) => a - b);
  const vertices: Vertex[] = [];

  if (from === "top") {
    vertices.push({ x: 0, y: 0 }, { x: length, y: 0 }, { x: length, y: height });
    // walk the top edge right-to-left
    for (const p of [...sorted].reverse()) {
      vertices.push(
        { x: p + slotWidth / 2, y: height },
        { x: p + slotWidth / 2, y: height - slotDepth },
        { x: p - slotWidth / 2, y: height - slotDepth },
        { x: p - slotWidth / 2, y: height },
      );
    }
    vertices.push({ x: 0, y: height });
  } else {
    // walk the bottom edge left-to-right
    vertices.push({ x: 0, y: 0 });
    for (const p of sorted) {
      vertices.push(
        { x: p - slotWidth / 2, y: 0 },
        { x: p - slotWidth / 2, y: slotDepth },
        { x: p + slotWidth / 2, y: slotDepth },
        { x: p + slotWidth / 2, y: 0 },
      );
    }
    vertices.push({ x: length, y: 0 }, { x: length, y: height }, { x: 0, y: height });
  }
  return path(vertices, "CUT");
}

export interface DividerPiece {
  name: string;
  outline: PathShape;
  length: number;
}

export function generateDividerPieces(params: DrawerDividerParams): DividerPiece[] {
  const { width: W, depth: D, height: H, columns: C, rows: R, thickness: t, kerf } = params;
  const slotWidth = Math.max(t - kerf, 0.1);
  const slotDepth = H / 2;

  const xPositions = Array.from({ length: C - 1 }, (_, i) => (W * (i + 1)) / C);
  const yPositions = Array.from({ length: R - 1 }, (_, j) => (D * (j + 1)) / R);

  const pieces: DividerPiece[] = [];
  xPositions.forEach((_, i) => {
    pieces.push({
      name: `Lengthwise ${i + 1}`,
      length: D,
      outline: slottedStrip(D, H, yPositions, slotWidth, slotDepth, "top"),
    });
  });
  yPositions.forEach((_, j) => {
    pieces.push({
      name: `Crosswise ${j + 1}`,
      length: W,
      outline: slottedStrip(W, H, xPositions, slotWidth, slotDepth, "bottom"),
    });
  });
  return pieces;
}

export function validateDrawerDivider(params: DrawerDividerParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width: W, depth: D, height: H, columns: C, rows: R, thickness: t, kerf } = params;

  if (W <= 0 || D <= 0 || H <= 0) warnings.push({ level: "error", message: "Drawer width, depth and divider height must be greater than 0." });
  if (t <= 0) warnings.push({ level: "error", message: "Material thickness must be greater than 0." });
  if (kerf < 0) warnings.push({ level: "error", message: "Kerf cannot be negative." });
  if (kerf >= t && t > 0) warnings.push({ level: "error", message: "Kerf cannot be as large as the material thickness." });
  if (C < 1 || R < 1) warnings.push({ level: "error", message: "Columns and rows must be at least 1." });
  if (C === 1 && R === 1) warnings.push({ level: "error", message: "1 × 1 has no dividers — add columns or rows." });
  if (C > 0 && R > 0 && W > 0 && D > 0) {
    const cell = Math.min(W / C, D / R);
    if (cell < 30) warnings.push({ level: "warning", message: `Compartments come out ${Math.floor(cell)} mm across — tight for most things.` });
  }
  if (H > 0 && H < 25) warnings.push({ level: "warning", message: "Dividers under 25 mm tall don't keep much in place." });
  if (H > 120) warnings.push({ level: "warning", message: "Dividers over 120 mm tall waste a lot of material." });
  return warnings;
}

export function generateDrawerDivider(params: DrawerDividerParams): GeneratedDesign {
  const warnings = validateDrawerDivider(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const pieces = generateDividerPieces(params);
  const spacing = 8;
  const shapes: Shape[] = [];
  let y = 0;
  for (const piece of pieces) {
    shapes.push(translateShape(piece.outline, 0, y));
    y += params.height + spacing;
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const lengthwise = params.columns - 1;
  const crosswise = params.rows - 1;
  const summary: SummaryItem[] = [
    ...(lengthwise > 0 ? [{ label: "Lengthwise strips", value: `${lengthwise} × (${params.depth} × ${params.height} mm)` }] : []),
    ...(crosswise > 0 ? [{ label: "Crosswise strips", value: `${crosswise} × (${params.width} × ${params.height} mm)` }] : []),
    {
      label: "Compartments",
      value: `${params.columns} × ${params.rows} (${Math.floor(params.width / params.columns)} × ${Math.floor(params.depth / params.rows)} mm each)`,
    },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
