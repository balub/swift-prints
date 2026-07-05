import { describe, expect, it } from "vitest";
import { boundsOfShape, flattenPath, path, roundedRect } from "./geometry";

function area(points: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

describe("roundedRect", () => {
  it("keeps the requested bounding box", () => {
    const shape = roundedRect(0, 0, 70, 30, 5);
    const b = boundsOfShape(shape);
    expect(b.minX).toBeCloseTo(0, 3);
    expect(b.minY).toBeCloseTo(0, 3);
    expect(b.maxX).toBeCloseTo(70, 3);
    expect(b.maxY).toBeCloseTo(30, 3);
  });

  it("has the area of a rect minus the corner cutoffs", () => {
    const r = 5;
    const shape = roundedRect(0, 0, 70, 30, r);
    const expected = 70 * 30 - (4 - Math.PI) * r * r;
    expect(Math.abs(area(flattenPath(shape, 0.01)))).toBeCloseTo(expected, 0);
  });
});

describe("flattenPath bulge handling", () => {
  it("flattens a two-arc full circle to points on the circle", () => {
    const r = 10;
    const shape = path(
      [
        { x: -r, y: 0, bulge: 1 },
        { x: r, y: 0, bulge: 1 },
      ],
      "CUT",
    );
    const pts = flattenPath(shape, 0.01);
    expect(pts.length).toBeGreaterThan(16);
    for (const p of pts) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(r, 2);
    }
    expect(Math.abs(area(pts))).toBeCloseTo(Math.PI * r * r, 0);
  });
});
