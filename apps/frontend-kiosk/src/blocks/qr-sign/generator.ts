/**
 * QR code sign generator.
 *
 * A rounded-rectangle sign with an engraved QR code, an optional caption and
 * optional hanging holes. Dark QR modules become ENGRAVE-layer squares;
 * horizontal runs of dark modules are merged into single rectangles to keep
 * the DXF small and the engraving passes efficient.
 *
 * The sign height is derived from the content (QR size + caption + margins)
 * so the layout can never be invalid.
 */

import qrcode from "qrcode-generator";
import {
  circle,
  path,
  roundedRect,
  text,
  boundsOfGeometry,
  estimateTextWidth,
  type LaserGeometry,
  type Shape,
} from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export type QrErrorLevel = "L" | "M" | "Q" | "H";

export interface QrSignParams {
  content: string;
  errorLevel: QrErrorLevel;
  signWidth: number;
  qrSize: number;
  caption: string;
  captionSize: number;
  cornerRadius: number;
  hangingHoles: boolean;
  holeDiameter: number;
  thickness: number; // summary only
}

export const QR_SIGN_DEFAULTS: QrSignParams = {
  content: "https://autofab.app",
  errorLevel: "M",
  signWidth: 100,
  qrSize: 70,
  caption: "SCAN ME",
  captionSize: 7,
  cornerRadius: 4,
  hangingHoles: false,
  holeDiameter: 4,
  thickness: 3,
};

const SIDE_MARGIN_MIN = 6;
const TOP_MARGIN = 6;
const HOLE_ZONE = 12; // extra top space when hanging holes are on
const CAPTION_GAP = 5;
const BOTTOM_MARGIN = 7;

interface QrMatrix {
  count: number;
  isDark: (row: number, col: number) => boolean;
}

function buildMatrix(content: string, errorLevel: QrErrorLevel): QrMatrix | null {
  try {
    const qr = qrcode(0, errorLevel); // type 0 = auto-size
    qr.addData(content);
    qr.make();
    return { count: qr.getModuleCount(), isDark: (r, c) => qr.isDark(r, c) };
  } catch {
    return null;
  }
}

/** Merge horizontal runs of dark modules into rectangles (in module units). */
export function darkRuns(matrix: QrMatrix): { row: number; col: number; len: number }[] {
  const runs: { row: number; col: number; len: number }[] = [];
  for (let r = 0; r < matrix.count; r++) {
    let c = 0;
    while (c < matrix.count) {
      if (!matrix.isDark(r, c)) {
        c++;
        continue;
      }
      let len = 1;
      while (c + len < matrix.count && matrix.isDark(r, c + len)) len++;
      runs.push({ row: r, col: c, len });
      c += len;
    }
  }
  return runs;
}

export function signHeight(params: QrSignParams): number {
  const captionBlock = params.caption.trim() ? CAPTION_GAP + params.captionSize : 0;
  const top = TOP_MARGIN + (params.hangingHoles ? HOLE_ZONE : 0);
  return Math.ceil(top + params.qrSize + captionBlock + BOTTOM_MARGIN);
}

export function validateQrSign(params: QrSignParams, matrix: QrMatrix | null): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  if (!params.content.trim()) {
    warnings.push({ level: "error", message: "Enter a link or text to encode." });
    return warnings;
  }
  if (!matrix) {
    warnings.push({ level: "error", message: "That text is too long to fit in a QR code — shorten it or lower the error correction." });
    return warnings;
  }
  if (params.qrSize <= 0 || params.signWidth <= 0) {
    warnings.push({ level: "error", message: "Sign width and QR size must be greater than 0." });
    return warnings;
  }
  if (params.qrSize + 2 * SIDE_MARGIN_MIN > params.signWidth) {
    warnings.push({ level: "error", message: `The QR code needs at least ${SIDE_MARGIN_MIN} mm of quiet margin — widen the sign or shrink the QR.` });
  }

  const moduleSize = params.qrSize / matrix.count;
  if (moduleSize < 0.8) {
    warnings.push({
      level: "warning",
      message: `QR modules come out ${moduleSize.toFixed(2)} mm — under 0.8 mm they may engrave mushy and fail to scan. Enlarge the QR or shorten the link.`,
    });
  }
  if (params.caption.trim()) {
    const t = text(0, 0, params.captionSize, params.caption.trim());
    if (estimateTextWidth(t) > params.signWidth - 8) {
      warnings.push({ level: "warning", message: "Caption looks too wide for the sign." });
    }
  }
  return warnings;
}

export function generateQrSign(params: QrSignParams): GeneratedDesign {
  const matrix = buildMatrix(params.content.trim(), params.errorLevel);
  const warnings = validateQrSign(params, matrix);
  if (!matrix || warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const W = params.signWidth;
  const H = signHeight(params);
  const shapes: Shape[] = [roundedRect(0, 0, W, H, params.cornerRadius, "CUT")];

  if (params.hangingHoles) {
    const inset = 6;
    shapes.push(circle(inset, H - inset, params.holeDiameter / 2, "CUT"));
    shapes.push(circle(W - inset, H - inset, params.holeDiameter / 2, "CUT"));
  }

  // QR modules (y-up: row 0 is the TOP of the code)
  const m = params.qrSize / matrix.count;
  const qx = (W - params.qrSize) / 2;
  const qTop = H - TOP_MARGIN - (params.hangingHoles ? HOLE_ZONE : 0);
  const runs = darkRuns(matrix);
  for (const run of runs) {
    const x = qx + run.col * m;
    const yTop = qTop - run.row * m;
    shapes.push(
      path(
        [
          { x, y: yTop - m },
          { x: x + run.len * m, y: yTop - m },
          { x: x + run.len * m, y: yTop },
          { x, y: yTop },
        ],
        "ENGRAVE",
      ),
    );
  }

  if (params.caption.trim()) {
    const baseline = BOTTOM_MARGIN;
    shapes.push(text(W / 2, baseline, params.captionSize, params.caption.trim(), "center", "ENGRAVE"));
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Sign", value: `${W} × ${H} mm, ${params.thickness} mm` },
    { label: "QR", value: `${matrix.count} × ${matrix.count} modules @ ${(params.qrSize / matrix.count).toFixed(2)} mm` },
    { label: "Error correction", value: params.errorLevel },
    { label: "Operations", value: `Cut outline${params.hangingHoles ? " + holes" : ""}, engrave QR${params.caption.trim() ? " + caption" : ""}` },
    { label: "Layout size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
  ];

  return { geometry, summary, warnings };
}
