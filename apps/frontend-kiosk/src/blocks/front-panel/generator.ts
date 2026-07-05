/**
 * Front panel generator.
 *
 * A rounded-rectangle instrument panel with optional corner mounting holes
 * and a user-defined list of component holes (switches, jacks, LEDs, pots),
 * each with an optional engraved label underneath.
 *
 * Coordinates for component holes are measured from the bottom-left corner
 * of the panel, in mm — same convention as the PCB standoff builder.
 */

import {
  circle,
  roundedRect,
  text,
  boundsOfGeometry,
  estimateTextWidth,
  type LaserGeometry,
  type Shape,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface PanelHole {
  x: number;
  y: number;
  diameter: number;
  label: string;
}

export interface FrontPanelParams {
  width: number;
  height: number;
  cornerRadius: number;
  mountingHoles: boolean;
  mountingHoleDiameter: number;
  mountingHoleInset: number;
  holes: PanelHole[];
  engraveLabels: boolean;
  labelSize: number;
  thickness: number; // summary only
}

export const FRONT_PANEL_DEFAULTS: FrontPanelParams = {
  width: 160,
  height: 60,
  cornerRadius: 3,
  mountingHoles: true,
  mountingHoleDiameter: 3.2,
  mountingHoleInset: 6,
  holes: [
    { x: 40, y: 32, diameter: 12, label: "POWER" },
    { x: 80, y: 32, diameter: 6.3, label: "IN" },
    { x: 120, y: 32, diameter: 6.3, label: "OUT" },
  ],
  engraveLabels: true,
  labelSize: 3.5,
  thickness: 3,
};

const MIN_EDGE_MARGIN = 2; // material ring any hole must keep to the edge

export function validateFrontPanel(params: FrontPanelParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width: w, height: h } = params;

  if (w <= 0 || h <= 0) warnings.push({ level: "error", message: "Panel width and height must be greater than 0." });
  if (params.mountingHoles) {
    const need = params.mountingHoleInset * 2 + params.mountingHoleDiameter;
    if (need > Math.min(w, h)) {
      warnings.push({ level: "error", message: "Mounting holes don't fit — reduce the inset or hole diameter." });
    }
  }

  params.holes.forEach((hole, i) => {
    const n = i + 1;
    if (hole.diameter <= 0) {
      warnings.push({ level: "error", message: `Hole ${n}: diameter must be greater than 0.` });
      return;
    }
    if (hole.diameter < 1) warnings.push({ level: "warning", message: `Hole ${n}: under 1 mm may fuse shut when cutting.` });
    const r = hole.diameter / 2;
    if (hole.x - r < MIN_EDGE_MARGIN || hole.x + r > w - MIN_EDGE_MARGIN || hole.y - r < MIN_EDGE_MARGIN || hole.y + r > h - MIN_EDGE_MARGIN) {
      warnings.push({ level: "error", message: `Hole ${n} (“${hole.label || "unlabeled"}”) sits outside the panel or too close to the edge.` });
    }
  });

  // Pairwise overlap check
  for (let i = 0; i < params.holes.length; i++) {
    for (let j = i + 1; j < params.holes.length; j++) {
      const a = params.holes[i];
      const b = params.holes[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < (a.diameter + b.diameter) / 2 + 2) {
        warnings.push({ level: "warning", message: `Holes ${i + 1} and ${j + 1} are very close — the bridge between them may be fragile.` });
      }
    }
  }

  if (params.engraveLabels && params.labelSize < 2.5) {
    warnings.push({ level: "warning", message: "Labels under 2.5 mm tend to engrave illegibly." });
  }
  return warnings;
}

export function generateFrontPanel(params: FrontPanelParams): GeneratedDesign {
  const warnings = validateFrontPanel(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const { width: w, height: h } = params;
  const shapes: Shape[] = [roundedRect(0, 0, w, h, params.cornerRadius, "CUT")];

  if (params.mountingHoles) {
    const inset = params.mountingHoleInset;
    const r = params.mountingHoleDiameter / 2;
    for (const [cx, cy] of [
      [inset, inset],
      [w - inset, inset],
      [inset, h - inset],
      [w - inset, h - inset],
    ] as const) {
      shapes.push(circle(cx, cy, r, "CUT"));
    }
  }

  let labelCount = 0;
  for (const hole of params.holes) {
    shapes.push(circle(hole.x, hole.y, hole.diameter / 2, "CUT"));
    if (params.engraveLabels && hole.label.trim()) {
      const labelTop = hole.y - hole.diameter / 2 - 1.5;
      const t = text(hole.x, labelTop - params.labelSize, params.labelSize, hole.label.trim(), "center", "ENGRAVE");
      // Keep the label on the panel even for holes near the bottom edge.
      if (t.y >= 1) {
        shapes.push(t);
        labelCount++;
        if (estimateTextWidth(t) > w - 4) {
          warnings.push({ level: "warning", message: `Label “${hole.label.trim()}” is wider than the panel.` });
        }
      } else {
        warnings.push({ level: "warning", message: `No room to engrave “${hole.label.trim()}” below its hole — moved off, label skipped.` });
      }
    }
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Panel", value: `${w} × ${h} mm, ${params.thickness} mm` },
    { label: "Component holes", value: `${params.holes.length}` },
    { label: "Mounting holes", value: params.mountingHoles ? `4 × ⌀${params.mountingHoleDiameter} mm` : "none" },
    { label: "Engraved labels", value: params.engraveLabels ? `${labelCount}` : "off" },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
