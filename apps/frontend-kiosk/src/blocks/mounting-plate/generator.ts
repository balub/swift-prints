/**
 * Mounting plate generator.
 *
 * A flat plate with a regular grid of holes (Pi/Arduino standoffs, pegboards,
 * sensor mounts) plus optional extra holes at exact positions. Grid and
 * custom holes share the same validation as the front panel block.
 */

import {
  circle,
  roundedRect,
  text,
  boundsOfGeometry,
  type LaserGeometry,
  type Shape,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface PlateHole {
  x: number;
  y: number;
  diameter: number;
}

export interface MountingPlateParams {
  width: number;
  height: number;
  cornerRadius: number;
  grid: {
    enabled: boolean;
    columns: number;
    rows: number;
    pitchX: number;
    pitchY: number;
    diameter: number;
  };
  holes: PlateHole[];
  engraveOrigin: boolean; // small crosshair label at (0,0) corner for alignment
  thickness: number; // summary only
}

export const MOUNTING_PLATE_DEFAULTS: MountingPlateParams = {
  width: 120,
  height: 80,
  cornerRadius: 3,
  grid: { enabled: true, columns: 4, rows: 3, pitchX: 25, pitchY: 25, diameter: 3.2 },
  holes: [],
  engraveOrigin: false,
  thickness: 3,
};

const MIN_EDGE_MARGIN = 2;

/** Grid hole centers, centered on the plate. */
export function gridHoleCenters(params: MountingPlateParams): { x: number; y: number }[] {
  const { grid, width: w, height: h } = params;
  if (!grid.enabled || grid.columns < 1 || grid.rows < 1) return [];
  const spanX = (grid.columns - 1) * grid.pitchX;
  const spanY = (grid.rows - 1) * grid.pitchY;
  const x0 = (w - spanX) / 2;
  const y0 = (h - spanY) / 2;
  const centers: { x: number; y: number }[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.columns; c++) {
      centers.push({ x: x0 + c * grid.pitchX, y: y0 + r * grid.pitchY });
    }
  }
  return centers;
}

export function validateMountingPlate(params: MountingPlateParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width: w, height: h, grid } = params;

  if (w <= 0 || h <= 0) warnings.push({ level: "error", message: "Plate width and height must be greater than 0." });

  const allHoles: { x: number; y: number; diameter: number; from: string }[] = [
    ...gridHoleCenters(params).map((c) => ({ ...c, diameter: grid.diameter, from: "grid" })),
    ...params.holes.map((hole, i) => ({ ...hole, from: `extra hole ${i + 1}` })),
  ];

  if (grid.enabled && grid.diameter <= 0) warnings.push({ level: "error", message: "Grid hole diameter must be greater than 0." });
  if (grid.enabled) {
    const spanX = (grid.columns - 1) * grid.pitchX + grid.diameter;
    const spanY = (grid.rows - 1) * grid.pitchY + grid.diameter;
    if (spanX > w - 2 * MIN_EDGE_MARGIN || spanY > h - 2 * MIN_EDGE_MARGIN) {
      warnings.push({ level: "error", message: "The hole grid doesn't fit on the plate — reduce the pitch, rows/columns, or enlarge the plate." });
    }
  }

  for (const hole of allHoles) {
    if (hole.diameter <= 0) {
      if (hole.from !== "grid") warnings.push({ level: "error", message: `Diameter of ${hole.from} must be greater than 0.` });
      continue;
    }
    const r = hole.diameter / 2;
    if (hole.from !== "grid" && (hole.x - r < MIN_EDGE_MARGIN || hole.x + r > w - MIN_EDGE_MARGIN || hole.y - r < MIN_EDGE_MARGIN || hole.y + r > h - MIN_EDGE_MARGIN)) {
      warnings.push({ level: "error", message: `${hole.from} sits outside the plate or too close to the edge.` });
    }
    if (hole.diameter < 1) warnings.push({ level: "warning", message: `${hole.from}: holes under 1 mm may fuse shut when cutting.` });
  }

  if (grid.enabled && (grid.pitchX < grid.diameter + 2 || grid.pitchY < grid.diameter + 2)) {
    warnings.push({ level: "warning", message: "Grid pitch is barely larger than the holes — the plate may be fragile." });
  }
  return warnings;
}

export function generateMountingPlate(params: MountingPlateParams): GeneratedDesign {
  const warnings = validateMountingPlate(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const { width: w, height: h } = params;
  const shapes: Shape[] = [roundedRect(0, 0, w, h, params.cornerRadius, "CUT")];

  const gridCenters = gridHoleCenters(params);
  for (const c of gridCenters) shapes.push(circle(c.x, c.y, params.grid.diameter / 2, "CUT"));
  for (const hole of params.holes) shapes.push(circle(hole.x, hole.y, hole.diameter / 2, "CUT"));

  if (params.engraveOrigin) {
    shapes.push(text(5, 4, 3, "0,0", "left", "ENGRAVE"));
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Plate", value: `${w} × ${h} mm, ${params.thickness} mm` },
    ...(params.grid.enabled
      ? [{ label: "Grid holes", value: `${gridCenters.length} × ⌀${params.grid.diameter} mm @ ${params.grid.pitchX}×${params.grid.pitchY} mm pitch` }]
      : []),
    ...(params.holes.length > 0 ? [{ label: "Extra holes", value: `${params.holes.length}` }] : []),
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
