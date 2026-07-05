import { describe, expect, it } from "vitest";
import { circle, path, text } from "./geometry";
import { geometryToDxf } from "./dxf";
import { geometryToSvg } from "./svg";

const geometry = {
  shapes: [
    path(
      [
        { x: 0, y: 0 },
        { x: 50, y: 0, bulge: 0.4142 },
        { x: 50, y: 30 },
        { x: 0, y: 30 },
      ],
      "CUT",
    ),
    circle(10, 15, 2.5, "CUT"),
    text(25, 12, 8, "HELLO", "center", "ENGRAVE"),
  ],
};

describe("geometryToDxf", () => {
  const dxf = geometryToDxf(geometry);

  it("declares R12 and the three layers", () => {
    expect(dxf).toContain("AC1009");
    for (const layer of ["CUT", "ENGRAVE", "SCORE"]) {
      expect(dxf).toContain(`\nLAYER\n2\n${layer}\n`);
    }
  });

  it("writes polyline vertices with bulge, circle and text entities", () => {
    expect(dxf).toContain("POLYLINE");
    expect((dxf.match(/\nVERTEX\n/g) ?? []).length).toBe(4);
    expect(dxf).toContain("42\n0.4142");
    expect(dxf).toContain("CIRCLE");
    expect(dxf).toContain("40\n2.5");
    expect(dxf).toContain("TEXT");
    expect(dxf).toContain("1\nHELLO");
    expect(dxf.trimEnd().endsWith("EOF")).toBe(true);
  });

  it("balances SECTION/ENDSEC pairs", () => {
    const sections = (dxf.match(/\nSECTION\n/g) ?? []).length;
    const ends = (dxf.match(/\nENDSEC\n/g) ?? []).length;
    expect(sections).toBeGreaterThan(0);
    expect(sections).toBe(ends);
  });
});

describe("geometryToSvg", () => {
  const svg = geometryToSvg(geometry);

  it("is a well-formed standalone SVG in mm", () => {
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/width="[\d.]+mm"/);
    expect(svg).toContain("<path");
    expect(svg).toContain("<circle");
    expect(svg).toContain(">HELLO</text>");
  });

  it("separates layers by color", () => {
    expect(svg).toContain('data-layer="CUT"');
    expect(svg).toContain('data-layer="ENGRAVE"');
  });
});
