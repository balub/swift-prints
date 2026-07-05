/**
 * Electronics enclosure generator.
 *
 * A closed finger-joint box (reusing the box builder's joint engine) with:
 *   - connector holes on the BACK panel (x from left, z from bottom)
 *   - an optional rectangular port cutout on the FRONT panel (USB, display…)
 *   - optional ventilation slot pattern on the lid or both side panels
 *
 * Panel-local coordinates: every wall panel is laid out with (0,0) at its
 * bottom-left corner, x along the wall, y = height above the box floor.
 */

import { circle, rect, roundedRect, boundsOfGeometry, type LaserGeometry, type Shape } from "@/lib/geometry";
import {
  generateBoxPanels,
  layoutBoxPanels,
  validateBox,
  type BoxParams,
  type BoxPanel,
} from "../box/generator";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export type VentPlacement = "none" | "lid" | "sides";

export interface EnclosureHole {
  x: number; // from panel left, mm
  z: number; // from panel bottom, mm
  diameter: number;
}

export interface EnclosureParams {
  length: number;
  width: number;
  height: number;
  thickness: number;
  kerf: number;
  fingerSize: number;
  spacing: number;
  labels: boolean;
  vents: VentPlacement;
  backHoles: EnclosureHole[];
  frontPort: { enabled: boolean; width: number; height: number; x: number; z: number };
}

export const ENCLOSURE_DEFAULTS: EnclosureParams = {
  length: 140,
  width: 90,
  height: 45,
  thickness: 3,
  kerf: 0.15,
  fingerSize: 10,
  spacing: 8,
  labels: false,
  vents: "lid",
  backHoles: [
    { x: 30, z: 22, diameter: 8 }, // DC barrel jack
    { x: 55, z: 22, diameter: 6.5 }, // toggle / LED
  ],
  frontPort: { enabled: true, width: 13, height: 7, x: 70, z: 18 },
};

const VENT_SLOT_H = 3;
const VENT_SLOT_GAP_X = 6;
const VENT_ROW_GAP = 5;
const VENT_MARGIN = 14; // keeps slots clear of the finger joints

/** Vent slot rects (panel-local) for a panel of size w × h, centered pattern. */
export function ventSlots(w: number, h: number): Shape[] {
  const availW = w - 2 * VENT_MARGIN;
  const availH = h - 2 * VENT_MARGIN;
  if (availW < 20 || availH < VENT_SLOT_H) return [];
  const slotL = Math.min(28, availW);
  const cols = Math.max(1, Math.floor((availW + VENT_SLOT_GAP_X) / (slotL + VENT_SLOT_GAP_X)));
  const rows = Math.max(1, Math.min(4, Math.floor((availH + VENT_ROW_GAP) / (VENT_SLOT_H + VENT_ROW_GAP))));
  const spanX = cols * slotL + (cols - 1) * VENT_SLOT_GAP_X;
  const spanY = rows * VENT_SLOT_H + (rows - 1) * VENT_ROW_GAP;
  const x0 = (w - spanX) / 2;
  const y0 = (h - spanY) / 2;

  const slots: Shape[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push(roundedRect(x0 + c * (slotL + VENT_SLOT_GAP_X), y0 + r * (VENT_SLOT_H + VENT_ROW_GAP), slotL, VENT_SLOT_H, 1.5, "CUT"));
    }
  }
  return slots;
}

export function validateEnclosure(params: EnclosureParams): DesignWarning[] {
  const boxParams: BoxParams = { ...params, closedTop: true };
  const warnings = validateBox(boxParams);
  const { length: L, height: H, thickness: t } = params;
  const margin = t + 2; // features must stay clear of the finger-joint band

  params.backHoles.forEach((hole, i) => {
    const n = i + 1;
    if (hole.diameter <= 0) {
      warnings.push({ level: "error", message: `Back hole ${n}: diameter must be greater than 0.` });
      return;
    }
    const r = hole.diameter / 2;
    if (hole.x - r < margin || hole.x + r > L - margin || hole.z - r < margin || hole.z + r > H - margin) {
      warnings.push({
        level: "error",
        message: `Back hole ${n} is outside the safe area — keep it ${margin} mm clear of the panel edges (finger joints live there).`,
      });
    }
  });

  const port = params.frontPort;
  if (port.enabled) {
    if (port.width <= 0 || port.height <= 0) {
      warnings.push({ level: "error", message: "Front port width and height must be greater than 0." });
    } else if (
      port.x - port.width / 2 < margin ||
      port.x + port.width / 2 > L - margin ||
      port.z - port.height / 2 < margin ||
      port.z + port.height / 2 > H - margin
    ) {
      warnings.push({ level: "error", message: `The front port is outside the safe area — keep it ${margin} mm clear of the panel edges.` });
    }
  }

  if (params.vents !== "none" && H < VENT_MARGIN * 2 + VENT_SLOT_H && params.vents === "sides") {
    warnings.push({ level: "warning", message: "The box is too low for side vents — they were skipped." });
  }
  return warnings;
}

export function generateEnclosure(params: EnclosureParams): GeneratedDesign {
  const warnings = validateEnclosure(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const boxParams: BoxParams = { ...params, closedTop: true };
  const panels: BoxPanel[] = generateBoxPanels(boxParams);
  const byName = new Map(panels.map((p) => [p.name, p]));

  // Back panel connector holes
  const back = byName.get("Back")!;
  back.extras = params.backHoles.map((hole) => circle(hole.x, hole.z, hole.diameter / 2, "CUT"));

  // Front rectangular port
  if (params.frontPort.enabled) {
    const front = byName.get("Front")!;
    const p = params.frontPort;
    front.extras = [rect(p.x - p.width / 2, p.z - p.height / 2, p.width, p.height, "CUT")];
  }

  // Ventilation
  let ventCount = 0;
  if (params.vents === "lid") {
    const top = byName.get("Top")!;
    top.extras = [...(top.extras ?? []), ...ventSlots(top.w, top.h)];
    ventCount = (top.extras ?? []).length;
  } else if (params.vents === "sides") {
    for (const name of ["Left side", "Right side"]) {
      const side = byName.get(name)!;
      const slots = ventSlots(side.w, side.h);
      side.extras = [...(side.extras ?? []), ...slots];
      ventCount += slots.length;
    }
  }

  const shapes = layoutBoxPanels(panels, params.spacing, params.labels);
  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);

  const summary: SummaryItem[] = [
    { label: "Enclosure", value: `${params.length} × ${params.width} × ${params.height} mm (6 panels)` },
    { label: "Back holes", value: `${params.backHoles.length}` },
    { label: "Front port", value: params.frontPort.enabled ? `${params.frontPort.width} × ${params.frontPort.height} mm` : "none" },
    { label: "Vent slots", value: params.vents === "none" ? "none" : `${ventCount} on ${params.vents === "lid" ? "the lid" : "the sides"}` },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
