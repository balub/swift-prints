/**
 * Edge-lit acrylic sign generator.
 *
 * Two pieces: a clear acrylic panel (engraved artwork, two tabs on the bottom
 * edge) and a base with matching slots — an LED strip under the panel edge
 * lights the engraving. Engraving is usually done on the BACK of the panel,
 * so the text can be mirrored to read correctly from the front.
 */

import {
  path,
  rect,
  roundedRect,
  text,
  translateShape,
  boundsOfGeometry,
  estimateTextWidth,
  type LaserGeometry,
  type PathShape,
  type Shape,
  type Vertex,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface EdgeLitParams {
  width: number;
  height: number;
  cornerRadius: number;
  textContent: string;
  fontSize: number;
  mirrored: boolean;
  baseDepth: number;
  thickness: number; // acrylic thickness
  kerf: number;
}

export const EDGE_LIT_DEFAULTS: EdgeLitParams = {
  width: 150,
  height: 100,
  cornerRadius: 8,
  textContent: "OPEN",
  fontSize: 28,
  mirrored: true,
  baseDepth: 40,
  thickness: 3,
  kerf: 0.15,
};

const TAB_W = 20;
const BASE_EXTRA = 24; // base is wider than the panel by this much

/** Panel tab center positions along the bottom edge. */
export function panelTabPositions(width: number): number[] {
  return width < 70 ? [width / 2] : [width * 0.25, width * 0.75];
}

/** Acrylic panel: rounded top corners, tabs on the bottom edge. */
export function edgeLitPanel(params: EdgeLitParams): PathShape {
  const { width: W, height: H, cornerRadius: r, thickness: t } = params;
  const b = Math.tan(Math.PI / 8);
  const vertices: Vertex[] = [{ x: 0, y: 0 }];
  for (const c of panelTabPositions(W)) {
    vertices.push({ x: c - TAB_W / 2, y: 0 }, { x: c - TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: -t }, { x: c + TAB_W / 2, y: 0 });
  }
  vertices.push({ x: W, y: 0 });
  if (r > 0) {
    vertices.push({ x: W, y: H - r, bulge: b }, { x: W - r, y: H }, { x: r, y: H, bulge: b }, { x: 0, y: H - r });
  } else {
    vertices.push({ x: W, y: H }, { x: 0, y: H });
  }
  return path(vertices, "CUT");
}

export function validateEdgeLit(params: EdgeLitParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const { width: W, height: H, thickness: t, kerf } = params;

  if (W <= 0 || H <= 0) warnings.push({ level: "error", message: "Panel width and height must be greater than 0." });
  if (t <= 0) warnings.push({ level: "error", message: "Acrylic thickness must be greater than 0." });
  if (kerf < 0) warnings.push({ level: "error", message: "Kerf cannot be negative." });
  if (kerf >= t && t > 0) warnings.push({ level: "error", message: "Kerf cannot be as large as the material thickness." });
  if (W > 0 && W < TAB_W + 10) warnings.push({ level: "error", message: "The panel is too narrow for a base tab." });
  if (warnings.some((w) => w.level === "error")) return warnings;

  if (params.baseDepth < 25) warnings.push({ level: "warning", message: "Bases under 25 mm deep tip over easily." });
  if (params.textContent.trim()) {
    if (params.fontSize < 5) warnings.push({ level: "warning", message: "Edge-lit engraving under 5 mm barely glows — go bigger." });
    const t2 = text(0, 0, params.fontSize, params.textContent.trim());
    if (estimateTextWidth(t2) > W - 12) {
      warnings.push({ level: "warning", message: "Text looks too wide for the panel — shorten it or reduce the font size." });
    }
  }
  return warnings;
}

export function generateEdgeLit(params: EdgeLitParams): GeneratedDesign {
  const warnings = validateEdgeLit(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const { width: W, height: H, thickness: t, kerf } = params;
  const shapes: Shape[] = [edgeLitPanel(params)];

  if (params.textContent.trim()) {
    const label = text(W / 2, H / 2 - params.fontSize / 2, params.fontSize, params.textContent.trim(), "center", "ENGRAVE");
    label.mirrored = params.mirrored;
    shapes.push(label);
  }

  // Base with matching slots, laid out below the panel.
  const baseW = W + BASE_EXTRA;
  const baseY = -(params.baseDepth + t + 10);
  shapes.push(translateShape(roundedRect(0, 0, baseW, params.baseDepth, 3, "CUT"), -BASE_EXTRA / 2, baseY));
  for (const c of panelTabPositions(W)) {
    shapes.push(
      translateShape(
        rect(c - (TAB_W - kerf) / 2, (params.baseDepth - Math.max(t - kerf, 0.2)) / 2, Math.max(TAB_W - kerf, 1), Math.max(t - kerf, 0.2), "CUT"),
        0,
        baseY,
      ),
    );
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Panel", value: `${W} × ${H} mm clear acrylic, ${t} mm` },
    { label: "Base", value: `${baseW} × ${params.baseDepth} mm (LED strip goes under the panel slot)` },
    { label: "Engraving", value: params.mirrored ? "mirrored — engrave the BACK, reads correct from the front" : "normal — engrave the front" },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
