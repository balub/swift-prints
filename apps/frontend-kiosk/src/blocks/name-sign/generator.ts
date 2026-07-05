/**
 * Name sign generator — real vector text, cut as one piece.
 *
 * Pipeline: opentype.js glyph outlines → flattened polygons (quadratic /
 * cubic béziers sampled) → per-glyph XOR (keeps letter counters like the
 * hole in "o") → union across glyphs and an optional base bar
 * (polygon-clipping), so overlapping script letters merge into ONE cut
 * outline instead of slicing each other apart.
 *
 * Bundled font: Pacifico (SIL Open Font License) — a connected script, so
 * lowercase names naturally hold together.
 */

import type { Font } from "opentype.js";
import polygonClipping from "polygon-clipping";
import { circle, path, boundsOfGeometry, type LaserGeometry, type Shape } from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

type Pair = [number, number];
type Ring = Pair[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

export interface NameSignParams {
  name: string;
  /** Target overall width of the text, mm. */
  width: number;
  baseBar: boolean;
  barHeight: number;
  hangingHoles: boolean;
  holeDiameter: number;
  thickness: number; // summary only
}

export const NAME_SIGN_DEFAULTS: NameSignParams = {
  name: "Milo",
  width: 250,
  baseBar: true,
  barHeight: 12,
  hangingHoles: false,
  holeDiameter: 4,
  thickness: 6,
};

const RAW_FONT_SIZE = 100;
const CURVE_STEPS = 10;

/* ------------------------------------------------------------------ */
/* Glyphs → polygons                                                    */
/* ------------------------------------------------------------------ */

interface PathCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

/** Flatten one opentype path into closed contours (y flipped to CAD y-up). */
export function pathToContours(commands: PathCommand[]): Ring[] {
  const contours: Ring[] = [];
  let current: Ring = [];
  let cursor: Pair = [0, 0];

  const push = (x: number, y: number) => {
    const pt: Pair = [x, -y]; // opentype is y-down
    const last = current[current.length - 1];
    if (!last || Math.abs(last[0] - pt[0]) > 1e-9 || Math.abs(last[1] - pt[1]) > 1e-9) current.push(pt);
    cursor = [x, y];
  };

  for (const c of commands) {
    switch (c.type) {
      case "M":
        if (current.length >= 3) contours.push(current);
        current = [];
        push(c.x!, c.y!);
        break;
      case "L":
        push(c.x!, c.y!);
        break;
      case "Q": {
        const [x0, y0] = cursor;
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const mt = 1 - t;
          push(mt * mt * x0 + 2 * mt * t * c.x1! + t * t * c.x!, mt * mt * y0 + 2 * mt * t * c.y1! + t * t * c.y!);
        }
        break;
      }
      case "C": {
        const [x0, y0] = cursor;
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const mt = 1 - t;
          push(
            mt * mt * mt * x0 + 3 * mt * mt * t * c.x1! + 3 * mt * t * t * c.x2! + t * t * t * c.x!,
            mt * mt * mt * y0 + 3 * mt * mt * t * c.y1! + 3 * mt * t * t * c.y2! + t * t * t * c.y!,
          );
        }
        break;
      }
      case "Z":
        if (current.length >= 3) contours.push(current);
        current = [];
        break;
    }
  }
  if (current.length >= 3) contours.push(current);
  return contours;
}

/** Union of all glyph shapes of the string, in raw font-render units. */
export function textToPolygons(font: Font, content: string): MultiPolygon {
  const glyphPaths = font.getPaths(content, 0, 0, RAW_FONT_SIZE);
  const glyphShapes: MultiPolygon[] = [];
  for (const p of glyphPaths) {
    const contours = pathToContours(p.commands as PathCommand[]);
    if (contours.length === 0) continue;
    // XOR the contours of one glyph: outer minus counters (even-odd fill).
    const shape = polygonClipping.xor(...contours.map((ring): Polygon[] => [[ring]]));
    if (shape.length > 0) glyphShapes.push(shape as MultiPolygon);
  }
  if (glyphShapes.length === 0) return [];
  return polygonClipping.union(...glyphShapes.map((s): [MultiPolygon] => [s]).map((a) => a[0])) as MultiPolygon;
}

function boundsOfMulti(mp: MultiPolygon) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const poly of mp)
    for (const ring of poly)
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
  return { minX, minY, maxX, maxY };
}

/* ------------------------------------------------------------------ */
/* Generator                                                            */
/* ------------------------------------------------------------------ */

export function validateNameSign(params: NameSignParams): DesignWarning[] {
  const warnings: DesignWarning[] = [];
  if (!params.name.trim()) warnings.push({ level: "error", message: "Enter a name to cut." });
  if (params.width <= 0) warnings.push({ level: "error", message: "Width must be greater than 0." });
  if (params.width > 0 && params.width < 80) {
    warnings.push({ level: "warning", message: "Signs under 80 mm wide have fragile letter strokes — go bigger or use fewer letters." });
  }
  if (params.baseBar && params.barHeight < 6) warnings.push({ level: "warning", message: "A base bar under 6 mm is fragile." });
  return warnings;
}

export function generateNameSign(params: NameSignParams, font: Font): GeneratedDesign {
  const warnings = validateNameSign(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const textPolys = textToPolygons(font, params.name.trim());
  if (textPolys.length === 0) {
    warnings.push({ level: "error", message: "Those characters produced no outlines — try different text." });
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const rawBounds = boundsOfMulti(textPolys);
  const scale = params.width / (rawBounds.maxX - rawBounds.minX);

  let combined = textPolys;
  let barRect: { x0: number; x1: number; cy: number } | null = null;
  if (params.baseBar) {
    // Bar top sits just above the baseline (y = 0 in raw units) so every
    // letter that touches the baseline fuses with it.
    const barPadRaw = 3 / scale;
    const barTopRaw = 2 / scale;
    const barHRaw = params.barHeight / scale;
    const bar: Polygon = [
      [
        [rawBounds.minX - barPadRaw, barTopRaw - barHRaw],
        [rawBounds.maxX + barPadRaw, barTopRaw - barHRaw],
        [rawBounds.maxX + barPadRaw, barTopRaw],
        [rawBounds.minX - barPadRaw, barTopRaw],
      ],
    ];
    combined = polygonClipping.union(combined, [bar]) as MultiPolygon;
    barRect = { x0: rawBounds.minX - barPadRaw, x1: rawBounds.maxX + barPadRaw, cy: barTopRaw - barHRaw / 2 };
  }

  // Scale + translate into final mm, origin at bottom-left.
  const finalBounds = boundsOfMulti(combined);
  const toFinal = ([x, y]: Pair): Pair => [(x - finalBounds.minX) * scale, (y - finalBounds.minY) * scale];

  const shapes: Shape[] = [];
  let pieceCount = 0;
  for (const poly of combined) {
    pieceCount++;
    for (const ring of poly) {
      const pts = ring.map(toFinal);
      // polygon-clipping closes rings with a repeated first point — drop it.
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first && last && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) pts.pop();
      shapes.push(path(pts.map(([x, y]) => ({ x, y })), "CUT"));
    }
  }

  if (params.hangingHoles && barRect) {
    const [hx0, hy] = toFinal([barRect.x0, barRect.cy]);
    const [hx1] = toFinal([barRect.x1, barRect.cy]);
    shapes.push(circle(hx0 + 8, hy, params.holeDiameter / 2, "CUT"));
    shapes.push(circle(hx1 - 8, hy, params.holeDiameter / 2, "CUT"));
  }

  if (pieceCount > 1) {
    warnings.push({
      level: params.baseBar ? "info" : "warning",
      message: `The sign cuts as ${pieceCount} separate pieces (dots on i/j and accents are their own parts)${params.baseBar ? "" : " — enable the base bar to connect the letters"}.`,
    });
  }

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const summary: SummaryItem[] = [
    { label: "Sign", value: `“${params.name.trim()}” in Pacifico script` },
    { label: "Size", value: `${Math.ceil(b.maxX - b.minX)} × ${Math.ceil(b.maxY - b.minY)} mm` },
    { label: "Material", value: `${params.thickness} mm plywood or acrylic` },
    { label: "Pieces", value: `${pieceCount}` },
  ];

  return { geometry, summary, warnings };
}
