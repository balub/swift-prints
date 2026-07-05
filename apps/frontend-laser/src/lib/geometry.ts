/**
 * Minimal 2D geometry model for laser-cut paths.
 *
 * All coordinates are millimeters, Y-up (CAD convention).
 * A single LaserGeometry is the source of truth for the 2D preview,
 * the DXF export and the SVG export — they must never diverge.
 */

export type LayerName = "CUT" | "ENGRAVE" | "SCORE";

export interface Vertex {
  x: number;
  y: number;
  /**
   * DXF-style bulge for the arc from this vertex to the next one.
   * bulge = tan(includedAngle / 4); positive = counter-clockwise.
   * Omitted/0 = straight segment.
   */
  bulge?: number;
}

export interface PathShape {
  kind: "path";
  layer: LayerName;
  closed: boolean;
  vertices: Vertex[];
}

export interface CircleShape {
  kind: "circle";
  layer: LayerName;
  cx: number;
  cy: number;
  r: number;
}

/**
 * Engraving text. Exported as a DXF TEXT entity / SVG <text>.
 * (True text-to-path outlines are out of scope for the MVP.)
 */
export interface TextShape {
  kind: "text";
  layer: LayerName;
  x: number;
  y: number;
  /** Cap height in mm (DXF text height). */
  height: number;
  text: string;
  align: "left" | "center" | "right";
}

export type Shape = PathShape | CircleShape | TextShape;

export interface LaserGeometry {
  shapes: Shape[];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/* ------------------------------------------------------------------ */
/* Constructors                                                        */
/* ------------------------------------------------------------------ */

export function path(vertices: Vertex[], layer: LayerName = "CUT", closed = true): PathShape {
  return { kind: "path", layer, closed, vertices };
}

export function circle(cx: number, cy: number, r: number, layer: LayerName = "CUT"): CircleShape {
  return { kind: "circle", layer, cx, cy, r };
}

export function text(
  x: number,
  y: number,
  height: number,
  content: string,
  align: TextShape["align"] = "center",
  layer: LayerName = "ENGRAVE",
): TextShape {
  return { kind: "text", layer, x, y, height, text: content, align };
}

export function rect(x: number, y: number, w: number, h: number, layer: LayerName = "CUT"): PathShape {
  return path(
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    layer,
  );
}

/** Rounded rectangle using true arcs (bulge = tan(90deg/4)). */
export function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  layer: LayerName = "CUT",
): PathShape {
  const radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) return rect(x, y, w, h, layer);
  const b = Math.tan(Math.PI / 8); // 90° arc, CCW
  return path(
    [
      { x: x + radius, y },
      { x: x + w - radius, y, bulge: b },
      { x: x + w, y: y + radius },
      { x: x + w, y: y + h - radius, bulge: b },
      { x: x + w - radius, y: y + h },
      { x: x + radius, y: y + h, bulge: b },
      { x, y: y + h - radius },
      { x, y: y + radius, bulge: b },
    ],
    layer,
  );
}

/** Ellipse approximated by four 90° elliptic quadrants flattened to short segments. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, layer: LayerName = "CUT", segments = 64): PathShape {
  const vertices: Vertex[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return path(vertices, layer);
}

/* ------------------------------------------------------------------ */
/* Transforms and measurements                                         */
/* ------------------------------------------------------------------ */

export function translateShape<S extends Shape>(shape: S, dx: number, dy: number): S {
  switch (shape.kind) {
    case "path":
      return {
        ...shape,
        vertices: shape.vertices.map((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
      };
    case "circle":
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
    case "text":
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
  }
}

export function translateGeometry(geometry: LaserGeometry, dx: number, dy: number): LaserGeometry {
  return { shapes: geometry.shapes.map((s) => translateShape(s, dx, dy)) };
}

/**
 * Flatten one bulge segment into intermediate points (excluding endpoints).
 * Used by the SVG serializer, the preview and bounds computation.
 */
export function flattenBulge(from: Vertex, to: Vertex, bulge: number, chordTolerance = 0.1): { x: number; y: number }[] {
  if (!bulge) return [];
  const theta = 4 * Math.atan(bulge); // included angle, signed
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-9) return [];
  const radius = chord / (2 * Math.sin(Math.abs(theta) / 2));
  // Center: perpendicular offset from chord midpoint. For a CCW arc (bulge > 0)
  // with included angle < 180° the center sits on the LEFT of the chord;
  // cos() goes negative past 180° which flips the side automatically.
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const h = radius * Math.cos(Math.abs(theta) / 2) * Math.sign(bulge);
  const ux = -dy / chord; // left-perpendicular of the chord direction
  const uy = dx / chord;
  const cx = mx + ux * h;
  const cy = my + uy * h;
  const startAngle = Math.atan2(from.y - cy, from.x - cx);
  // Number of steps for the chord tolerance
  const sagittaSteps = Math.ceil(Math.abs(theta) / (2 * Math.acos(Math.max(0, 1 - chordTolerance / radius)) || 0.2));
  const steps = Math.max(2, Math.min(64, sagittaSteps));
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i < steps; i++) {
    const a = startAngle + (theta * i) / steps;
    points.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  }
  return points;
}

/** Flatten a path (bulges included) into a plain polyline point list. */
export function flattenPath(shape: PathShape, chordTolerance = 0.1): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const n = shape.vertices.length;
  for (let i = 0; i < n; i++) {
    const v = shape.vertices[i];
    out.push({ x: v.x, y: v.y });
    const isLast = i === n - 1;
    if (isLast && !shape.closed) break;
    const next = shape.vertices[(i + 1) % n];
    if (v.bulge) out.push(...flattenBulge(v, next, v.bulge, chordTolerance));
  }
  return out;
}

/** Rough advance-width estimate for engraving text (per char, relative to cap height). */
export const TEXT_WIDTH_FACTOR = 0.62;

export function estimateTextWidth(shape: TextShape): number {
  return shape.text.length * shape.height * TEXT_WIDTH_FACTOR;
}

export function boundsOfShape(shape: Shape): Bounds {
  switch (shape.kind) {
    case "circle":
      return {
        minX: shape.cx - shape.r,
        minY: shape.cy - shape.r,
        maxX: shape.cx + shape.r,
        maxY: shape.cy + shape.r,
      };
    case "text": {
      const w = estimateTextWidth(shape);
      const x0 = shape.align === "left" ? shape.x : shape.align === "center" ? shape.x - w / 2 : shape.x - w;
      return { minX: x0, minY: shape.y, maxX: x0 + w, maxY: shape.y + shape.height };
    }
    case "path": {
      const pts = flattenPath(shape);
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { minX, minY, maxX, maxY };
    }
  }
}

export function boundsOfGeometry(geometry: LaserGeometry): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of geometry.shapes) {
    const b = boundsOfShape(s);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}
