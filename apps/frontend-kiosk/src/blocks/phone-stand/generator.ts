/**
 * Phone stand generator.
 *
 * Three pieces: two identical side profiles and a cross brace that slots
 * through rectangular holes in the sides (friction fit, kerf-compensated).
 *
 * Side profile (side view, x = toward the back, y = up):
 *
 *          (Tx,Ty)
 *            /|
 *           / |        back support at the recline angle
 *          /  |
 *   lip   /   |
 *   __   /    |
 *  |  | /     |
 *  |  |/______|
 *  (phone channel between lip and support)
 */

import { path, rect, rotatedRect, translateShape, boundsOfGeometry, type LaserGeometry, type PathShape, type Shape } from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface PhoneStandParams {
  /** Overall stand width (across the phone), mm. */
  width: number;
  /** Recline from vertical, degrees (0 = upright). */
  reclineDeg: number;
  /** Length of the back support edge, mm. */
  supportLength: number;
  /** Phone channel width (phone thickness + case + clearance), mm. */
  channel: number;
  lipHeight: number;
  braceHeight: number;
  thickness: number;
  kerf: number;
}

export const PHONE_STAND_DEFAULTS: PhoneStandParams = {
  width: 70,
  reclineDeg: 25,
  supportLength: 105,
  channel: 13,
  lipHeight: 14,
  braceHeight: 20,
  thickness: 4,
  kerf: 0.15,
};

const LEDGE_Y = 10; // channel floor height above the table
const LIP_T = 7; // lip wall thickness
const BRACE_CLEAR = 6; // brace hole clearance above the table

export interface StandProfile {
  outline: PathShape;
  braceHole: PathShape;
  /** Key points for the 3D preview and validation. */
  points: { D: number; Tx: number; Ty: number; xBack: number; braceCenter: { x: number; y: number } };
}

export function standProfile(params: PhoneStandParams): StandProfile {
  const { reclineDeg, supportLength: S, channel, lipHeight: lip, thickness: t, kerf, braceHeight: braceH } = params;
  const theta = ((90 - reclineDeg) * Math.PI) / 180;
  const xBack = LIP_T + channel;
  const Tx = xBack + S * Math.cos(theta);
  const Ty = LEDGE_Y + S * Math.sin(theta);
  const D = Tx + 8;

  const outline = path(
    [
      { x: 0, y: 0 },
      { x: D, y: 0 },
      { x: Tx, y: Ty },
      { x: xBack, y: LEDGE_Y },
      { x: LIP_T, y: LEDGE_Y },
      { x: LIP_T, y: LEDGE_Y + lip },
      { x: 0, y: LEDGE_Y + lip },
    ],
    "CUT",
  );

  const braceCenter = { x: xBack + (Tx - xBack) * 0.5, y: BRACE_CLEAR + braceH / 2 };
  const braceHole = rect(
    braceCenter.x - (t - kerf) / 2,
    braceCenter.y - (braceH - kerf) / 2,
    Math.max(t - kerf, 0.2),
    Math.max(braceH - kerf, 1),
    "CUT",
  );

  return { outline, braceHole, points: { D, Tx, Ty, xBack, braceCenter } };
}

/** Y of the inner support edge at a given x (between xBack and Tx). */
function innerSlopeY(params: PhoneStandParams, x: number): number {
  const { reclineDeg } = params;
  const theta = ((90 - reclineDeg) * Math.PI) / 180;
  const xBack = LIP_T + params.channel;
  return LEDGE_Y + (x - xBack) * Math.tan(theta);
}

export function validatePhoneStand(params: PhoneStandParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width, reclineDeg, supportLength, channel, thickness: t, kerf, braceHeight } = params;

  if (t <= 0) warnings.push({ level: "error", message: "Material thickness must be greater than 0." });
  if (kerf < 0) warnings.push({ level: "error", message: "Kerf cannot be negative." });
  if (kerf >= t && t > 0) warnings.push({ level: "error", message: "Kerf cannot be as large as the material thickness." });
  if (width < 3 * t) warnings.push({ level: "error", message: "Stand width must be at least three material thicknesses." });
  if (supportLength <= 0 || channel <= 0) warnings.push({ level: "error", message: "Support length and channel must be greater than 0." });
  if (reclineDeg < 10 || reclineDeg > 45) {
    warnings.push({ level: "warning", message: "Recline outside 10–45° tends to tip: shallow angles fall forward, steep ones slide." });
  }
  if (channel > 0 && channel < 9) warnings.push({ level: "warning", message: "A channel under 9 mm is tight for a phone with a case." });
  if (channel > 25) warnings.push({ level: "warning", message: "The channel is very wide — the phone will rattle." });
  if (width < 50) warnings.push({ level: "warning", message: "Stands under 50 mm wide wobble with large phones." });
  if (t < 3) warnings.push({ level: "warning", message: "Use 3 mm material or thicker — thin sides flex under the phone's weight." });

  if (warnings.some((w) => w.level === "error")) return warnings;

  const { points } = standProfile(params);
  const holeTop = BRACE_CLEAR + braceHeight;
  const solidTop = innerSlopeY(params, points.braceCenter.x) - 4;
  if (holeTop > solidTop) {
    warnings.push({ level: "error", message: "The brace hole doesn't fit inside the side profile — reduce the brace height or increase the support length/angle." });
  }
  return warnings;
}

export function generatePhoneStand(params: PhoneStandParams): GeneratedDesign {
  const warnings = validatePhoneStand(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const profile = standProfile(params);
  const { D, Ty } = profile.points;
  const spacing = 8;

  const shapes: Shape[] = [
    profile.outline,
    profile.braceHole,
    translateShape(profile.outline, D + spacing, 0),
    translateShape(profile.braceHole, D + spacing, 0),
    // Brace below the two sides
    translateShape(rect(0, 0, params.width, params.braceHeight, "CUT"), 0, -(params.braceHeight + spacing)),
  ];

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Pieces", value: `2 side profiles + 1 brace (${params.width} × ${params.braceHeight} mm)` },
    { label: "Footprint", value: `${Math.ceil(D)} mm deep, ${params.width} mm wide` },
    { label: "Height", value: `${Math.ceil(Ty)} mm` },
    { label: "Phone channel", value: `${params.channel} mm at ${params.reclineDeg}° recline` },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
