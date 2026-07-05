/**
 * SVG serializer for laser-cut geometry.
 *
 * Uses the exact same LaserGeometry as the DXF export. Arcs (bulges) are
 * flattened to short line segments (0.1 mm chord tolerance) which laser
 * software handles fine. The viewBox is in millimeters; the Y axis is
 * flipped so the SVG visually matches the CAD (Y-up) coordinates.
 */

import { boundsOfGeometry, flattenPath, type LaserGeometry, type LayerName, type Shape } from "./geometry";

export const LAYER_COLORS: Record<LayerName, string> = {
  CUT: "#e11d1d",
  ENGRAVE: "#1d4ed8",
  SCORE: "#15803d",
};

const STROKE_WIDTH = 0.2; // mm, hairline-ish but visible

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function shapeToSvg(shape: Shape, flipY: (y: number) => number): string {
  const stroke = LAYER_COLORS[shape.layer];
  const common = `fill="none" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"`;
  switch (shape.kind) {
    case "path": {
      const pts = flattenPath(shape);
      const d =
        pts.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(flipY(p.y))}`).join(" ") +
        (shape.closed ? " Z" : "");
      return `<path d="${d}" ${common} data-layer="${shape.layer}"/>`;
    }
    case "circle":
      return `<circle cx="${round(shape.cx)}" cy="${round(flipY(shape.cy))}" r="${round(shape.r)}" ${common} data-layer="${shape.layer}"/>`;
    case "text": {
      const anchor = shape.align === "left" ? "start" : shape.align === "center" ? "middle" : "end";
      const mirror = shape.mirrored ? ` transform="translate(${round(2 * shape.x)},0) scale(-1,1)"` : "";
      // TextShape y is the baseline in CAD coords.
      return `<text x="${round(shape.x)}" y="${round(flipY(shape.y))}" font-size="${round(shape.height * 1.35)}" font-family="Inter, Arial, sans-serif" text-anchor="${anchor}" fill="${stroke}" stroke="none"${mirror} data-layer="${shape.layer}">${esc(shape.text)}</text>`;
    }
  }
}

function round(n: number): number {
  return Number(n.toFixed(4));
}

export function geometryToSvg(geometry: LaserGeometry, margin = 2): string {
  const b = boundsOfGeometry(geometry);
  const minX = b.minX - margin;
  const minY = b.minY - margin;
  const w = b.maxX - b.minX + margin * 2;
  const h = b.maxY - b.minY + margin * 2;
  // Flip Y: CAD y-up -> SVG y-down within the viewBox.
  const flipY = (y: number) => b.maxY + b.minY - y;
  const body = geometry.shapes.map((s) => shapeToSvg(s, flipY)).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${round(w)}mm" height="${round(h)}mm" viewBox="${round(minX)} ${round(minY)} ${round(w)} ${round(h)}">
  ${body}
</svg>
`;
}
