import { useMemo } from "react";
import { boundsOfGeometry, flattenPath, type LaserGeometry, type Shape } from "@/lib/geometry";
import { LAYER_COLORS } from "@/lib/svg";

interface GeometryPreviewProps {
  geometry: LaserGeometry;
  /** Overall size annotations around the drawing. */
  showDimensions?: boolean;
  maxHeightClass?: string;
}

/**
 * Inline SVG preview rendered from the SAME LaserGeometry that is exported
 * to DXF/SVG, so what you see is exactly what gets cut.
 */
export function GeometryPreview({ geometry, showDimensions = true, maxHeightClass = "max-h-[300px]" }: GeometryPreviewProps) {
  const { bounds, shapes } = useMemo(
    () => ({ bounds: boundsOfGeometry(geometry), shapes: geometry.shapes }),
    [geometry],
  );

  if (shapes.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-sm text-text-muted border border-dashed rounded-xl bg-neutral-50">
        Fix the errors below to see the preview
      </div>
    );
  }

  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const pad = Math.max(w, h) * 0.08 + 4;
  const dimStroke = "#9a8f80";
  const fontSize = Math.max(w, h) * 0.032;
  const flipY = (y: number) => bounds.maxY + bounds.minY - y;

  const viewMinX = bounds.minX - pad;
  const viewMinY = bounds.minY - pad;
  const viewW = w + pad * 2;
  const viewH = h + pad * 2;

  return (
    <svg
      viewBox={`${viewMinX} ${viewMinY} ${viewW} ${viewH}`}
      className={`w-full rounded-xl bg-white ${maxHeightClass}`}
      style={{ aspectRatio: `${viewW} / ${viewH}` }}
      role="img"
      aria-label="2D cut preview"
    >
      {shapes.map((shape, i) => (
        <PreviewShape key={i} shape={shape} flipY={flipY} strokeWidth={Math.max(w, h) * 0.004} />
      ))}

      {showDimensions && (
        <g stroke={dimStroke} strokeWidth={Math.max(w, h) * 0.0015} fill={dimStroke} fontSize={fontSize}>
          {/* width */}
          <line x1={bounds.minX} y1={bounds.minY - pad * 0.45} x2={bounds.maxX} y2={bounds.minY - pad * 0.45} />
          <text
            x={bounds.minX + w / 2}
            y={bounds.minY - pad * 0.6}
            textAnchor="middle"
            stroke="none"
            fontFamily="Inter, sans-serif"
          >
            {Math.round(w * 10) / 10} mm
          </text>
          {/* height */}
          <line x1={bounds.minX - pad * 0.45} y1={bounds.minY} x2={bounds.minX - pad * 0.45} y2={bounds.maxY} />
          <text
            x={bounds.minX - pad * 0.6}
            y={bounds.minY + h / 2}
            textAnchor="middle"
            stroke="none"
            fontFamily="Inter, sans-serif"
            transform={`rotate(-90, ${bounds.minX - pad * 0.6}, ${bounds.minY + h / 2})`}
          >
            {Math.round(h * 10) / 10} mm
          </text>
        </g>
      )}
    </svg>
  );
}

function PreviewShape({ shape, flipY, strokeWidth }: { shape: Shape; flipY: (y: number) => number; strokeWidth: number }) {
  const stroke = LAYER_COLORS[shape.layer];
  switch (shape.kind) {
    case "path": {
      const pts = flattenPath(shape);
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${flipY(p.y)}`).join(" ") + (shape.closed ? " Z" : "");
      return <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} />;
    }
    case "circle":
      return <circle cx={shape.cx} cy={flipY(shape.cy)} r={shape.r} fill="none" stroke={stroke} strokeWidth={strokeWidth} />;
    case "text": {
      const anchor = shape.align === "left" ? "start" : shape.align === "center" ? "middle" : "end";
      return (
        <text
          x={shape.x}
          y={flipY(shape.y)}
          fontSize={shape.height * 1.35}
          fontFamily="Inter, Arial, sans-serif"
          textAnchor={anchor}
          fill={stroke}
          transform={shape.mirrored ? `translate(${2 * shape.x},0) scale(-1,1)` : undefined}
        >
          {shape.text}
        </text>
      );
    }
  }
}

/** Small cut/engrave legend to place under a GeometryPreview. */
export function LayerLegend({ hasEngrave = true }: { hasEngrave?: boolean }) {
  return (
    <div className="flex items-center gap-4 text-xs text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-0.5 rounded" style={{ background: LAYER_COLORS.CUT }} />
        Cut
      </span>
      {hasEngrave && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: LAYER_COLORS.ENGRAVE }} />
          Engrave
        </span>
      )}
    </div>
  );
}
