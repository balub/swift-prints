/**
 * Display stand generator — an angled riser for products, cards and shelves.
 *
 * Four pieces: two side profiles (right trapezoids), a sloped top panel with
 * tabs into angled slots on the sides, and an optional front lip strip that
 * tabs into the panel to stop items sliding off.
 *
 * The tab slots in the side profiles are rotated rectangles centered half a
 * material thickness below the sloped edge, so the panel sits flush.
 */

import { path, rotatedRect, translateShape, boundsOfGeometry, type LaserGeometry, type PathShape, type Shape, type Vertex } from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface DisplayStandParams {
  /** Stand width (across the front), mm. */
  width: number;
  depth: number;
  backHeight: number;
  frontHeight: number;
  lip: boolean;
  lipHeight: number;
  thickness: number;
  kerf: number;
}

export const DISPLAY_STAND_DEFAULTS: DisplayStandParams = {
  width: 120,
  depth: 90,
  backHeight: 70,
  frontHeight: 25,
  lip: true,
  lipHeight: 12,
  thickness: 3,
  kerf: 0.15,
};

const TAB_W = 18;
const LIP_HOLE_X = 10; // lip slot distance from the panel's front edge, along the slope

/** Slope length of the top panel. */
export function slopeLength(params: DisplayStandParams): number {
  const rise = params.backHeight - params.frontHeight;
  return Math.hypot(params.depth, rise);
}

/** Tab center positions along the slope (shared by panel tabs and side slots). */
export function tabPositions(params: DisplayStandParams): number[] {
  const Ls = slopeLength(params);
  return Ls < 60 ? [Ls / 2] : [Ls * 0.28, Ls * 0.72];
}

/** Side profile with angled slots for the top panel tabs. */
export function sideProfile(params: DisplayStandParams): { outline: PathShape; slots: PathShape[] } {
  const { depth: D, backHeight: Hb, frontHeight: Hf, thickness: t, kerf } = params;
  const outline = path(
    [
      { x: 0, y: 0 },
      { x: D, y: 0 },
      { x: D, y: Hb },
      { x: 0, y: Hf },
    ],
    "CUT",
  );

  const Ls = slopeLength(params);
  const angle = Math.atan2(Hb - Hf, D);
  const u = { x: D / Ls, y: (Hb - Hf) / Ls }; // along the slope, front-top → back-top
  const nIn = { x: (Hb - Hf) / Ls, y: -D / Ls }; // into the material

  const slots = tabPositions(params).map((d) => {
    const cx = 0 + u.x * d + nIn.x * (t / 2);
    const cy = Hf + u.y * d + nIn.y * (t / 2);
    return rotatedRect(cx, cy, Math.max(TAB_W - kerf, 1), Math.max(t - kerf, 0.2), angle, "CUT");
  });

  return { outline, slots };
}

/** Sloped top panel: rect Ls × width with tabs on both long edges, plus lip slots. */
export function topPanel(params: DisplayStandParams): { outline: PathShape; lipSlots: PathShape[] } {
  const Ls = slopeLength(params);
  const W = params.width;
  const t = params.thickness;
  const tabs = tabPositions(params);

  const vertices: Vertex[] = [];
  // bottom edge (y = 0), tabs dip to -t
  vertices.push({ x: 0, y: 0 });
  for (const c of tabs) {
    vertices.push({ x: c - TAB_W / 2, y: 0 }, { x: c - TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: 0 });
  }
  vertices.push({ x: Ls, y: 0 }, { x: Ls, y: W });
  // top edge (y = W), walked right-to-left, tabs rise to W + t
  for (const c of [...tabs].reverse()) {
    vertices.push({ x: c + TAB_W / 2, y: W }, { x: c + TAB_W / 2, y: W + t }, { x: c - TAB_W / 2, y: W + t }, { x: c - TAB_W / 2, y: W });
  }
  vertices.push({ x: 0, y: W });

  const outline = path(vertices, "CUT");

  const lipSlots = params.lip
    ? [0.25, 0.75].map((f) =>
        rotatedRect(LIP_HOLE_X, W * f, Math.max(t - params.kerf, 0.2), Math.max(TAB_W - params.kerf, 1), 0, "CUT"),
      )
    : [];

  return { outline, lipSlots };
}

/** Front lip strip with two tabs down into the top panel. */
export function lipStrip(params: DisplayStandParams): PathShape {
  const W = params.width;
  const t = params.thickness;
  const positions = [0.25, 0.75].map((f) => W * f);
  const vertices: Vertex[] = [{ x: 0, y: 0 }];
  for (const c of positions) {
    vertices.push({ x: c - TAB_W / 2, y: 0 }, { x: c - TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: 0 });
  }
  vertices.push({ x: W, y: 0 }, { x: W, y: params.lipHeight }, { x: 0, y: params.lipHeight });
  return path(vertices, "CUT");
}

export function validateDisplayStand(params: DisplayStandParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width, depth, backHeight, frontHeight, thickness: t, kerf } = params;

  if (width <= 0 || depth <= 0 || backHeight <= 0 || frontHeight < 0) {
    warnings.push({ level: "error", message: "Width, depth and heights must be greater than 0." });
  }
  if (t <= 0) warnings.push({ level: "error", message: "Material thickness must be greater than 0." });
  if (kerf < 0) warnings.push({ level: "error", message: "Kerf cannot be negative." });
  if (kerf >= t && t > 0) warnings.push({ level: "error", message: "Kerf cannot be as large as the material thickness." });
  if (backHeight <= frontHeight) {
    warnings.push({ level: "error", message: "The back must be taller than the front — that's what makes it a display stand." });
  }
  if (warnings.some((w) => w.level === "error")) return warnings;

  const angle = (Math.atan2(backHeight - frontHeight, depth) * 180) / Math.PI;
  if (angle > 50) warnings.push({ level: "warning", message: `The face is ${Math.round(angle)}° steep — items may slide; enable the lip.` });
  if (angle < 5) warnings.push({ level: "warning", message: "The face is nearly flat — items won't face the viewer." });
  if (slopeLength(params) < TAB_W + 10) {
    warnings.push({ level: "error", message: "The sloped face is too short to fit a tab — increase the depth or heights." });
  }
  if (params.lip && LIP_HOLE_X + t > slopeLength(params) / 2) {
    warnings.push({ level: "warning", message: "The lip slots sit very close to the panel tabs." });
  }
  if (width < 40) warnings.push({ level: "warning", message: "Stands under 40 mm wide tip easily." });
  return warnings;
}

export function generateDisplayStand(params: DisplayStandParams): GeneratedDesign {
  const warnings = validateDisplayStand(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const spacing = 8;
  const side = sideProfile(params);
  const panel = topPanel(params);
  const shapes: Shape[] = [];

  // Two side profiles, side by side
  shapes.push(side.outline, ...side.slots);
  shapes.push(...[side.outline, ...side.slots].map((s) => translateShape(s, params.depth + spacing, 0)));

  // Top panel above (its tabs extend t below local y=0)
  const panelY = Math.max(params.backHeight, params.frontHeight) + spacing + params.thickness;
  shapes.push(...[panel.outline, ...panel.lipSlots].map((s) => translateShape(s, 0, panelY)));

  // Lip strip to the right of the panel
  if (params.lip) {
    shapes.push(translateShape(lipStrip(params), slopeLength(params) + spacing, panelY + params.thickness));
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const angle = Math.round((Math.atan2(params.backHeight - params.frontHeight, params.depth) * 180) / Math.PI);
  const summary: SummaryItem[] = [
    { label: "Pieces", value: `2 sides + top panel${params.lip ? " + lip" : ""}` },
    { label: "Display face", value: `${params.width} × ${Math.ceil(slopeLength(params))} mm at ${angle}°` },
    { label: "Footprint", value: `${params.width} × ${params.depth} mm` },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
