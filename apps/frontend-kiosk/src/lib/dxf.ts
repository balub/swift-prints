/**
 * Minimal DXF writer for laser-cut geometry.
 *
 * Writes DXF R12 (AC1009) — the most widely supported flavor across laser
 * software (LightBurn, Inkscape, ezdxf, most CAM tools). R12 needs no entity
 * handles, keeping the output small and predictable.
 *
 * Units are millimeters by convention (R12 has no $INSUNITS header variable).
 * Layers: CUT / ENGRAVE / SCORE, color-coded for easy mapping in laser software.
 */

import type { LaserGeometry, LayerName, Shape } from "./geometry";

const LAYERS: { name: LayerName; color: number }[] = [
  { name: "CUT", color: 1 }, // red
  { name: "ENGRAVE", color: 5 }, // blue
  { name: "SCORE", color: 3 }, // green
];

/** One "group code / value" pair per line, as DXF requires. */
function pair(code: number, value: string | number): string {
  return `${code}\n${value}`;
}

function fmt(n: number): string {
  // Fixed precision keeps files deterministic; trim trailing zeros.
  return Number(n.toFixed(6)).toString();
}

function entityToDxf(shape: Shape): string[] {
  const out: string[] = [];
  switch (shape.kind) {
    case "path": {
      // POLYLINE + VERTEX (+ bulge) + SEQEND — R12-compatible polyline.
      out.push(pair(0, "POLYLINE"), pair(8, shape.layer), pair(66, 1), pair(70, shape.closed ? 1 : 0));
      for (const v of shape.vertices) {
        out.push(pair(0, "VERTEX"), pair(8, shape.layer), pair(10, fmt(v.x)), pair(20, fmt(v.y)), pair(30, 0));
        if (v.bulge) out.push(pair(42, fmt(v.bulge)));
      }
      out.push(pair(0, "SEQEND"), pair(8, shape.layer));
      break;
    }
    case "circle": {
      out.push(
        pair(0, "CIRCLE"),
        pair(8, shape.layer),
        pair(10, fmt(shape.cx)),
        pair(20, fmt(shape.cy)),
        pair(30, 0),
        pair(40, fmt(shape.r)),
      );
      break;
    }
    case "text": {
      const hAlign = shape.align === "left" ? 0 : shape.align === "center" ? 1 : 2;
      out.push(
        pair(0, "TEXT"),
        pair(8, shape.layer),
        pair(10, fmt(shape.x)),
        pair(20, fmt(shape.y)),
        pair(30, 0),
        pair(40, fmt(shape.height)),
        pair(1, shape.text),
      );
      if (hAlign !== 0) {
        // With non-default alignment the second alignment point (11/21) is used.
        out.push(pair(72, hAlign), pair(11, fmt(shape.x)), pair(21, fmt(shape.y)), pair(31, 0));
      }
      break;
    }
  }
  return out;
}

export function geometryToDxf(geometry: LaserGeometry): string {
  const lines: string[] = [];

  // HEADER
  lines.push(pair(0, "SECTION"), pair(2, "HEADER"));
  lines.push(pair(9, "$ACADVER"), pair(1, "AC1009"));
  lines.push(pair(9, "$MEASUREMENT"), pair(70, 1)); // metric
  lines.push(pair(0, "ENDSEC"));

  // TABLES — layer definitions
  lines.push(pair(0, "SECTION"), pair(2, "TABLES"));
  lines.push(pair(0, "TABLE"), pair(2, "LAYER"), pair(70, LAYERS.length));
  for (const layer of LAYERS) {
    lines.push(
      pair(0, "LAYER"),
      pair(2, layer.name),
      pair(70, 0),
      pair(62, layer.color),
      pair(6, "CONTINUOUS"),
    );
  }
  lines.push(pair(0, "ENDTAB"), pair(0, "ENDSEC"));

  // ENTITIES
  lines.push(pair(0, "SECTION"), pair(2, "ENTITIES"));
  for (const shape of geometry.shapes) {
    lines.push(...entityToDxf(shape));
  }
  lines.push(pair(0, "ENDSEC"), pair(0, "EOF"));

  return lines.join("\n") + "\n";
}
