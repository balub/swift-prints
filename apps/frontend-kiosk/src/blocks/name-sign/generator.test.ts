import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, type Font } from "opentype.js";
import { boundsOfGeometry } from "@/lib/geometry";
import { generateNameSign, NAME_SIGN_DEFAULTS, textToPolygons, validateNameSign } from "./generator";

function loadFont(): Font {
  const buf = readFileSync(resolve(__dirname, "../../assets/fonts/Pacifico-Regular.ttf"));
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

const font = loadFont();

describe("textToPolygons", () => {
  it("produces outlines with counters preserved as holes", () => {
    const polys = textToPolygons(font, "o");
    expect(polys.length).toBeGreaterThan(0);
    // "o" must have at least one polygon with an interior ring (the counter)
    expect(polys.some((poly) => poly.length >= 2)).toBe(true);
  });

  it("merges overlapping script letters into fewer pieces than letters", () => {
    const polys = textToPolygons(font, "anna");
    // Pacifico connects lowercase letters — far fewer pieces than glyphs.
    expect(polys.length).toBeLessThan(4);
  });
});

describe("generateNameSign", () => {
  it("scales the sign to the requested width", () => {
    const design = generateNameSign(NAME_SIGN_DEFAULTS, font);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    const b = boundsOfGeometry(design.geometry);
    // bar adds 3 mm padding per side
    expect(b.maxX - b.minX).toBeGreaterThanOrEqual(NAME_SIGN_DEFAULTS.width);
    expect(b.maxX - b.minX).toBeLessThanOrEqual(NAME_SIGN_DEFAULTS.width + 8);
  });

  it("connects letters with the base bar", () => {
    const withBar = generateNameSign({ ...NAME_SIGN_DEFAULTS, name: "coco", baseBar: true }, font);
    const withoutBar = generateNameSign({ ...NAME_SIGN_DEFAULTS, name: "coco", baseBar: false }, font);
    const pieces = (design: typeof withBar) => Number(design.summary.find((s) => s.label === "Pieces")?.value ?? "0");
    expect(pieces(withBar)).toBeLessThanOrEqual(pieces(withoutBar));
    expect(pieces(withBar)).toBe(1);
  });

  it("adds hanging holes in the bar", () => {
    const design = generateNameSign({ ...NAME_SIGN_DEFAULTS, hangingHoles: true }, font);
    expect(design.geometry.shapes.filter((s) => s.kind === "circle")).toHaveLength(2);
  });

  it("warns about multi-piece signs without a bar", () => {
    const design = generateNameSign({ ...NAME_SIGN_DEFAULTS, name: "ii", baseBar: false }, font);
    expect(design.warnings.some((w) => w.level === "warning" && w.message.includes("separate"))).toBe(true);
  });

  it("errors on empty names", () => {
    expect(validateNameSign({ ...NAME_SIGN_DEFAULTS, name: "  " }).some((w) => w.level === "error")).toBe(true);
  });
});
