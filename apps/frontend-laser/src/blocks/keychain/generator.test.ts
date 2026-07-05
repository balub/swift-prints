import { describe, expect, it } from "vitest";
import { boundsOfGeometry } from "@/lib/geometry";
import { generateKeychain, KEYCHAIN_DEFAULTS, validateKeychain, type KeychainParams } from "./generator";

const P: KeychainParams = { ...KEYCHAIN_DEFAULTS };

describe("generateKeychain", () => {
  it("emits outline + hole + engraved text", () => {
    const design = generateKeychain(P);
    const kinds = design.geometry.shapes.map((s) => s.kind);
    expect(kinds).toContain("path");
    expect(kinds).toContain("circle");
    expect(kinds).toContain("text");
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
  });

  it("keeps the hole inside the outline for every shape and position", () => {
    for (const shape of ["rectangle", "rounded", "circle", "oval", "tag"] as const) {
      for (const holePosition of ["left", "right", "top"] as const) {
        const design = generateKeychain({ ...P, shape, holePosition });
        const outline = design.geometry.shapes.find((s) => s.kind === "path")!;
        const hole = design.geometry.shapes.find((s) => s.kind === "circle");
        expect(hole, `${shape}/${holePosition}`).toBeDefined();
        if (hole?.kind !== "circle") continue;
        const b = boundsOfGeometry({ shapes: [outline] });
        expect(hole.cx - hole.r).toBeGreaterThan(b.minX);
        expect(hole.cx + hole.r).toBeLessThan(b.maxX);
        expect(hole.cy - hole.r).toBeGreaterThan(b.minY);
        expect(hole.cy + hole.r).toBeLessThan(b.maxY);
      }
    }
  });

  it("omits text when engraving is off or text is blank", () => {
    expect(generateKeychain({ ...P, engraveText: false }).geometry.shapes.some((s) => s.kind === "text")).toBe(false);
    expect(generateKeychain({ ...P, textContent: "  " }).geometry.shapes.some((s) => s.kind === "text")).toBe(false);
  });

  it("errors when the hole cannot fit", () => {
    const design = generateKeychain({ ...P, holeDiameter: 40, height: 20 });
    expect(design.geometry.shapes).toHaveLength(0);
    expect(design.warnings.some((w) => w.level === "error")).toBe(true);
  });

  it("warns about tiny engraving text", () => {
    const warnings = validateKeychain({ ...P, fontSize: 2 });
    expect(warnings.some((w) => w.message.includes("engrave"))).toBe(true);
  });
});
