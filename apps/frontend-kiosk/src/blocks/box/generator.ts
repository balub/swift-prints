/**
 * Finger-joint box generator.
 *
 * Every panel outline is built from four "edge profiles". A profile is a list
 * of intervals along the edge; each interval is either at the outer edge line
 * (off = 0, material present) or inset by the material thickness
 * (off = t, material removed — a finger notch).
 *
 * Mating edges are produced from the SAME segmentation
 * (fingerIntervals(innerLen)), so joints line up by construction:
 *   - vertical corners: front/back are male, left/right are female
 *   - bottom (and closed-box top): the lid panel has tabs on all four edges,
 *     the walls carry matching notches
 *
 * Kerf compensation: every interior boundary between "material" and "notch"
 * is shifted by kerf/2 so material grows. After the laser removes kerf/2 on
 * each side of the beam path, tabs and notches land back on nominal size.
 */

import { path, text, translateShape, boundsOfGeometry, type LaserGeometry, type PathShape, type Shape, type Vertex } from "@/lib/geometry";
import type { DesignWarning, GeneratedDesign, SummaryItem } from "../types";

export interface BoxParams {
  length: number; // outer X, mm
  width: number; // outer Y, mm
  height: number; // outer Z, mm
  thickness: number;
  kerf: number;
  fingerSize: number;
  closedTop: boolean;
  spacing: number; // gap between panels in the flat layout
  labels: boolean; // engrave panel names
}

export const BOX_DEFAULTS: BoxParams = {
  length: 120,
  width: 80,
  height: 50,
  thickness: 3,
  kerf: 0.15,
  fingerSize: 10,
  closedTop: false,
  spacing: 8,
  labels: false,
};

/* ------------------------------------------------------------------ */
/* Edge profiles                                                       */
/* ------------------------------------------------------------------ */

interface Interval {
  len: number;
  /** Inset from the outer edge line: 0 = material to the edge, t = notch. */
  off: number;
}

/** Odd segment count so a fingered edge starts and ends with the same phase. */
export function fingerCount(innerLen: number, fingerSize: number): number {
  let n = Math.round(innerLen / fingerSize);
  if (n % 2 === 0) n -= 1;
  return Math.max(3, n);
}

/**
 * Alternating A/B intervals over innerLen (odd count, A first and last).
 * "aOff"/"bOff" pick which phase is material for this edge.
 */
function fingerIntervals(innerLen: number, fingerSize: number, aOff: number, bOff: number): Interval[] {
  const n = fingerCount(innerLen, fingerSize);
  const seg = innerLen / n;
  return Array.from({ length: n }, (_, i) => ({ len: seg, off: i % 2 === 0 ? aOff : bOff }));
}

const flat = (len: number): Interval[] => [{ len, off: 0 }];

/** Male vertical edge (front/back): fingers reach the edge, phase A out. */
const maleVertical = (h: number, f: number, t: number) => fingerIntervals(h, f, 0, t);

/** Female vertical edge (left/right): complementary phase. */
const femaleVertical = (h: number, f: number, t: number) => fingerIntervals(h, f, t, 0);

/** Wall bottom/top edge: notches for the lid panel tabs, t margin at both ends. */
function femaleHorizontal(w: number, f: number, t: number): Interval[] {
  return [{ len: t, off: 0 }, ...fingerIntervals(w - 2 * t, f, t, 0), { len: t, off: 0 }];
}

/** Lid (bottom/top) panel edge: tabs protrude to the outer line, corners inset. */
function lidEdge(w: number, f: number, t: number): Interval[] {
  return [{ len: t, off: t }, ...fingerIntervals(w - 2 * t, f, 0, t), { len: t, off: t }];
}

/** Shift interior boundaries by kerf/2 so material (off === 0) grows. */
function applyKerf(intervals: Interval[], kerf: number): Interval[] {
  if (!kerf) return intervals;
  const out = intervals.map((iv) => ({ ...iv }));
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i];
    const b = out[i + 1];
    if (a.off === b.off) continue;
    const shift = Math.min(kerf / 2, a.len / 2, b.len / 2);
    if (a.off === 0) {
      a.len += shift;
      b.len -= shift;
    } else {
      a.len -= shift;
      b.len += shift;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Panel outline from four edge profiles                               */
/* ------------------------------------------------------------------ */

interface EdgeSpec {
  profile: Interval[];
}

/**
 * Walk the four edges of a w×h rectangle counter-clockwise
 * (bottom, right, top, left) and emit the outline polygon.
 *
 * Corner points combine the inset of both adjacent edges; interior
 * transitions step between the outer line and the inset line.
 */
export function panelOutline(w: number, h: number, edges: [EdgeSpec, EdgeSpec, EdgeSpec, EdgeSpec]): PathShape {
  const geom = [
    { start: { x: 0, y: 0 }, d: { x: 1, y: 0 }, n: { x: 0, y: 1 } }, // bottom
    { start: { x: w, y: 0 }, d: { x: 0, y: 1 }, n: { x: -1, y: 0 } }, // right
    { start: { x: w, y: h }, d: { x: -1, y: 0 }, n: { x: 0, y: -1 } }, // top
    { start: { x: 0, y: h }, d: { x: 0, y: -1 }, n: { x: 1, y: 0 } }, // left
  ];

  const vertices: Vertex[] = [];
  const push = (x: number, y: number) => {
    const last = vertices[vertices.length - 1];
    if (last && Math.abs(last.x - x) < 1e-9 && Math.abs(last.y - y) < 1e-9) return;
    vertices.push({ x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) });
  };

  for (let i = 0; i < 4; i++) {
    const prev = edges[(i + 3) % 4];
    const cur = edges[i];
    const g = geom[i];
    const gPrev = geom[(i + 3) % 4];
    const prevLastOff = prev.profile[prev.profile.length - 1].off;
    const curFirstOff = cur.profile[0].off;

    // Corner between previous edge and this edge.
    push(
      g.start.x + gPrev.n.x * prevLastOff + g.n.x * curFirstOff,
      g.start.y + gPrev.n.y * prevLastOff + g.n.y * curFirstOff,
    );

    // Interior transitions.
    let s = 0;
    for (let j = 0; j < cur.profile.length - 1; j++) {
      s += cur.profile[j].len;
      const o1 = cur.profile[j].off;
      const o2 = cur.profile[j + 1].off;
      if (o1 === o2) continue;
      push(g.start.x + g.d.x * s + g.n.x * o1, g.start.y + g.d.y * s + g.n.y * o1);
      push(g.start.x + g.d.x * s + g.n.x * o2, g.start.y + g.d.y * s + g.n.y * o2);
    }
  }

  // Close: drop a duplicate of the first point if the walk ended on it.
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  if (first && last && Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) {
    vertices.pop();
  }
  return path(vertices, "CUT");
}

/* ------------------------------------------------------------------ */
/* Box                                                                 */
/* ------------------------------------------------------------------ */

export interface BoxPanel {
  name: string;
  w: number;
  h: number;
  outline: PathShape;
  /** Extra shapes (cutouts, engraving) in panel-local coordinates. */
  extras?: Shape[];
}

/**
 * Two-row flat layout of box panels: [Bottom, Front, Back] / [Left, Right, Top?].
 * Shared by the box builder and the electronics enclosure.
 */
export function layoutBoxPanels(panels: BoxPanel[], spacing: number, labels: boolean): Shape[] {
  const s = Math.max(spacing, 2);
  const rows: BoxPanel[][] = [panels.slice(0, 3), panels.slice(3)];
  const shapes: Shape[] = [];
  let y = 0;
  for (const row of rows) {
    let x = 0;
    let rowH = 0;
    for (const p of row) {
      shapes.push(translateShape(p.outline, x, y));
      for (const extra of p.extras ?? []) {
        shapes.push(translateShape(extra, x, y));
      }
      if (labels) {
        shapes.push(translateShape(text(p.w / 2, p.h / 2 - 2, 4, p.name, "center", "ENGRAVE"), x, y));
      }
      x += p.w + s;
      rowH = Math.max(rowH, p.h);
    }
    y += rowH + s;
  }
  return shapes;
}

export function generateBoxPanels(params: BoxParams): BoxPanel[] {
  const { length: L, width: W, height: H, thickness: t, kerf: k, fingerSize: f, closedTop } = params;
  const K = (iv: Interval[]) => applyKerf(iv, k);

  const wallTop = (w: number) => (closedTop ? K(femaleHorizontal(w, f, t)) : flat(w));

  const frontBack = (): PathShape =>
    panelOutline(L, H, [
      { profile: K(femaleHorizontal(L, f, t)) },
      { profile: K(maleVertical(H, f, t)) },
      { profile: wallTop(L) },
      { profile: K(maleVertical(H, f, t)) },
    ]);

  const side = (): PathShape =>
    panelOutline(W, H, [
      { profile: K(femaleHorizontal(W, f, t)) },
      { profile: K(femaleVertical(H, f, t)) },
      { profile: wallTop(W) },
      { profile: K(femaleVertical(H, f, t)) },
    ]);

  const lid = (): PathShape =>
    panelOutline(L, W, [
      { profile: K(lidEdge(L, f, t)) },
      { profile: K(lidEdge(W, f, t)) },
      { profile: K(lidEdge(L, f, t)) },
      { profile: K(lidEdge(W, f, t)) },
    ]);

  const panels: BoxPanel[] = [
    { name: "Bottom", w: L, h: W, outline: lid() },
    { name: "Front", w: L, h: H, outline: frontBack() },
    { name: "Back", w: L, h: H, outline: frontBack() },
    { name: "Left side", w: W, h: H, outline: side() },
    { name: "Right side", w: W, h: H, outline: side() },
  ];
  if (closedTop) panels.push({ name: "Top", w: L, h: W, outline: lid() });
  return panels;
}

export function validateBox(params: BoxParams): DesignWarning[] {
  const { length: L, width: W, height: H, thickness: t, kerf: k, fingerSize: f } = params;
  const warnings: DesignWarning[] = [];

  if (t <= 0) warnings.push({ level: "error", message: "Material thickness must be greater than 0." });
  if (f <= 0) warnings.push({ level: "error", message: "Finger size must be greater than 0." });
  const minDim = Math.min(L, W, H);
  if (t > 0 && minDim <= 2 * t + 1) {
    warnings.push({
      level: "error",
      message: `Box dimensions must be comfortably larger than twice the material thickness (${2 * t} mm).`,
    });
  }
  if (k < 0) warnings.push({ level: "error", message: "Kerf cannot be negative." });
  if (k > 1) warnings.push({ level: "warning", message: "Kerf above 1 mm is unusual for laser cutting — double-check your machine's kerf." });
  if (t > 0 && f > 0 && f < t) {
    warnings.push({ level: "warning", message: `Fingers narrower than the material thickness (${t} mm) tend to be fragile.` });
  }
  if (f > 0 && f < 3) warnings.push({ level: "warning", message: "Fingers under 3 mm may burn or snap during cutting." });
  if (f > 0 && minDim > 0 && f > minDim / 3) {
    warnings.push({ level: "warning", message: "Finger size is large relative to the box — joints get only 3 fingers per edge." });
  }
  return warnings;
}

const SHEET_W = 600;
const SHEET_H = 400;

export function generateBox(params: BoxParams): GeneratedDesign {
  const warnings = validateBox(params);
  if (warnings.some((w) => w.level === "error")) {
    return { geometry: { shapes: [] }, summary: [], warnings };
  }

  const panels = generateBoxPanels(params);
  const shapes = layoutBoxPanels(panels, params.spacing, params.labels);

  const geometry: LaserGeometry = { shapes };
  const b = boundsOfGeometry(geometry);
  const sheetW = Math.ceil(b.maxX - b.minX);
  const sheetH = Math.ceil(b.maxY - b.minY);
  if (sheetW > SHEET_W || sheetH > SHEET_H) {
    warnings.push({
      level: "warning",
      message: `Layout is ${sheetW} × ${sheetH} mm — larger than a common ${SHEET_W} × ${SHEET_H} mm sheet.`,
    });
  }

  const counts = new Map<string, { qty: number; w: number; h: number }>();
  for (const p of panels) {
    const key = p.name.replace(/(Left|Right) side/, "Side");
    const existing = counts.get(key);
    if (existing) existing.qty += 1;
    else counts.set(key, { qty: 1, w: p.w, h: p.h });
  }
  const summary: SummaryItem[] = [...counts.entries()].map(([name, c]) => ({
    label: name,
    value: `${c.qty} × (${c.w} × ${c.h} mm)`,
  }));
  summary.push({ label: "Layout size", value: `${sheetW} × ${sheetH} mm` });

  return { geometry, summary, warnings };
}
