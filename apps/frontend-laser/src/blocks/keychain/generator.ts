/**
 * Keychain / text tag generator.
 *
 * One outer CUT outline (rectangle, rounded rectangle, circle, oval or tag),
 * a CUT keyring hole, and optional ENGRAVE text. Text is exported as a DXF
 * TEXT entity / SVG <text>; converting text to vector outlines is a known
 * MVP limitation (laser software rasterizes text for engraving anyway).
 */

import {
  circle,
  ellipse,
  estimateTextWidth,
  path,
  rect,
  roundedRect,
  text,
  type LaserGeometry,
  type PathShape,
  type Shape,
  type TextShape,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export type KeychainShape = "rectangle" | "rounded" | "circle" | "oval" | "tag";
export type HolePosition = "left" | "right" | "top";

export interface KeychainParams {
  shape: KeychainShape;
  width: number;
  height: number;
  cornerRadius: number; // rounded rectangle only
  textContent: string;
  fontSize: number;
  engraveText: boolean;
  holeDiameter: number;
  holePosition: HolePosition;
  thickness: number; // for the production summary only
}

export const KEYCHAIN_DEFAULTS: KeychainParams = {
  shape: "rounded",
  width: 70,
  height: 30,
  cornerRadius: 5,
  textContent: "SWIFT CUTS",
  fontSize: 8,
  engraveText: true,
  holeDiameter: 4,
  holePosition: "left",
  thickness: 3,
};

const EDGE_MARGIN = 2.5; // minimum material ring around the hole, mm

function outlineFor(params: KeychainParams): PathShape {
  const { shape, width: w, height: h, cornerRadius } = params;
  switch (shape) {
    case "rectangle":
      return rect(0, 0, w, h);
    case "rounded":
      return roundedRect(0, 0, w, h, cornerRadius);
    case "circle":
      return path(circleAsPathVertices(w / 2, w / 2, w / 2), "CUT");
    case "oval":
      return ellipse(w / 2, h / 2, w / 2, h / 2);
    case "tag": {
      const c = Math.min(h / 3, 10);
      return path(
        [
          { x: c, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: c, y: h },
          { x: 0, y: h - c },
          { x: 0, y: c },
        ],
        "CUT",
      );
    }
  }
}

/** Full circle as a two-arc bulge path so the outer outline stays a single closed path. */
function circleAsPathVertices(cx: number, cy: number, r: number) {
  return [
    { x: cx - r, y: cy, bulge: 1 }, // 180° arc
    { x: cx + r, y: cy, bulge: 1 },
  ];
}

function effectiveHeight(params: KeychainParams): number {
  return params.shape === "circle" ? params.width : params.height;
}

function holeCenter(params: KeychainParams): { x: number; y: number } {
  const w = params.width;
  const h = effectiveHeight(params);
  const inset = params.holeDiameter / 2 + EDGE_MARGIN;
  switch (params.holePosition) {
    case "left":
      return { x: inset, y: h / 2 };
    case "right":
      return { x: w - inset, y: h / 2 };
    case "top":
      return { x: w / 2, y: h - inset };
  }
}

function textPlacement(params: KeychainParams, hole: { x: number; y: number }): TextShape {
  const w = params.width;
  const h = effectiveHeight(params);
  const holeR = params.holeDiameter / 2;
  const pad = 3;

  let x0 = pad;
  let x1 = w - pad;
  if (params.holePosition === "left") x0 = hole.x + holeR + 2;
  if (params.holePosition === "right") x1 = hole.x - holeR - 2;

  const cx = (x0 + x1) / 2;
  // Baseline so the cap height is vertically centered.
  let baseline = h / 2 - params.fontSize / 2;
  if (params.holePosition === "top") baseline = Math.min(baseline, hole.y - holeR - 2 - params.fontSize);
  return text(cx, baseline, params.fontSize, params.textContent, "center", "ENGRAVE");
}

export function validateKeychain(params: KeychainParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  const w = params.width;
  const h = effectiveHeight(params);

  if (w <= 0 || h <= 0) warnings.push({ level: "error", message: "Width and height must be greater than 0." });
  if (params.holeDiameter <= 0) warnings.push({ level: "error", message: "Hole diameter must be greater than 0." });
  if (params.holeDiameter > 0 && params.holeDiameter < 1) {
    warnings.push({ level: "warning", message: "Holes under 1 mm may fuse shut when cutting — 3–5 mm fits most keyrings." });
  }
  if (w > 0 && h > 0) {
    if (Math.min(w, h) < 15) warnings.push({ level: "warning", message: "Tags under 15 mm are fiddly to cut and engrave cleanly." });
    const holeSpan = params.holeDiameter + 2 * EDGE_MARGIN;
    if (holeSpan > Math.min(w, h)) {
      warnings.push({ level: "error", message: `The keyring hole needs at least ${Math.ceil(holeSpan)} mm of material to stay strong.` });
    }
  }
  if (params.engraveText && params.textContent.trim()) {
    if (params.fontSize < 3) warnings.push({ level: "warning", message: "Text under 3 mm tends to engrave as a blur — try 4 mm or larger." });
    const hole = holeCenter(params);
    const t = textPlacement(params, hole);
    const estimated = estimateTextWidth(t);
    const available =
      (params.holePosition === "top" ? w - 6 : w - params.holeDiameter - 2 * EDGE_MARGIN - 8) *
      (params.shape === "circle" || params.shape === "oval" ? 0.8 : 1);
    if (estimated > available) {
      warnings.push({ level: "warning", message: "Text looks too long for the tag — shorten it, reduce the font size, or widen the tag." });
    }
  }
  return warnings;
}

export function generateKeychain(params: KeychainParams): GeneratedDesign {
  const warnings = validateKeychain(params);
  if (warnings.some((warning) => warning.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const h = effectiveHeight(params);
  const hole = holeCenter(params);
  const shapes: Shape[] = [outlineFor(params), circle(hole.x, hole.y, params.holeDiameter / 2, "CUT")];

  const hasText = params.engraveText && params.textContent.trim().length > 0;
  if (hasText) shapes.push(textPlacement(params, hole));

  const operations = ["Cut outer shape", "cut keyring hole", ...(hasText ? ["engrave text"] : [])].join(", ");
  const summary: SummaryItem[] = [
    { label: "Material", value: `${params.thickness} mm acrylic or plywood` },
    { label: "Operations", value: operations },
    { label: "Estimated size", value: `${params.width} × ${Math.round(h)} mm` },
  ];

  return { geometry: { shapes }, summary, warnings };
}
