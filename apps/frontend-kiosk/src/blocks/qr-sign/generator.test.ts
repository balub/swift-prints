import { describe, expect, it } from "vitest";
import qrcode from "qrcode-generator";
import { flattenPath, type PathShape } from "@/lib/geometry";
import { darkRuns, generateQrSign, QR_SIGN_DEFAULTS, signHeight } from "./generator";

function referenceMatrix(content: string) {
  const qr = qrcode(0, "M");
  qr.addData(content);
  qr.make();
  return { count: qr.getModuleCount(), isDark: (r: number, c: number) => qr.isDark(r, c) };
}

describe("darkRuns", () => {
  it("merged runs cover exactly the dark modules", () => {
    const matrix = referenceMatrix(QR_SIGN_DEFAULTS.content);
    let darkCount = 0;
    for (let r = 0; r < matrix.count; r++) for (let c = 0; c < matrix.count; c++) if (matrix.isDark(r, c)) darkCount++;
    const runs = darkRuns(matrix);
    expect(runs.reduce((sum, run) => sum + run.len, 0)).toBe(darkCount);
    // no run crosses a light module
    for (const run of runs) {
      for (let k = 0; k < run.len; k++) expect(matrix.isDark(run.row, run.col + k)).toBe(true);
    }
  });
});

describe("generateQrSign", () => {
  it("emits outline plus engraved module rects and caption", () => {
    const design = generateQrSign(QR_SIGN_DEFAULTS);
    expect(design.warnings.filter((w) => w.level === "error")).toHaveLength(0);
    const engravePaths = design.geometry.shapes.filter((s): s is PathShape => s.kind === "path" && s.layer === "ENGRAVE");
    expect(engravePaths.length).toBeGreaterThan(50);
    expect(design.geometry.shapes.some((s) => s.kind === "text")).toBe(true);

    // Engraved module area equals darkCount * moduleSize^2
    const matrix = referenceMatrix(QR_SIGN_DEFAULTS.content);
    let darkCount = 0;
    for (let r = 0; r < matrix.count; r++) for (let c = 0; c < matrix.count; c++) if (matrix.isDark(r, c)) darkCount++;
    const m = QR_SIGN_DEFAULTS.qrSize / matrix.count;
    const totalArea = engravePaths.reduce((sum, p) => {
      const pts = flattenPath(p);
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const u = pts[i];
        const v = pts[(i + 1) % pts.length];
        a += u.x * v.y - v.x * u.y;
      }
      return sum + Math.abs(a / 2);
    }, 0);
    expect(totalArea).toBeCloseTo(darkCount * m * m, 1);
  });

  it("derives the sign height from content", () => {
    const noCaption = signHeight({ ...QR_SIGN_DEFAULTS, caption: "" });
    const withCaption = signHeight(QR_SIGN_DEFAULTS);
    const withHoles = signHeight({ ...QR_SIGN_DEFAULTS, hangingHoles: true });
    expect(withCaption).toBeGreaterThan(noCaption);
    expect(withHoles).toBeGreaterThan(withCaption);
  });

  it("adds hanging holes when enabled", () => {
    const design = generateQrSign({ ...QR_SIGN_DEFAULTS, hangingHoles: true });
    expect(design.geometry.shapes.filter((s) => s.kind === "circle")).toHaveLength(2);
  });

  it("errors on empty content and warns on unscannable module size", () => {
    expect(generateQrSign({ ...QR_SIGN_DEFAULTS, content: "  " }).geometry.shapes).toHaveLength(0);
    const long = generateQrSign({
      ...QR_SIGN_DEFAULTS,
      content: "https://example.com/a/very/long/path?with=lots&of=query&parameters=here&to=inflate&the=module&count=significantly",
      qrSize: 25,
      signWidth: 40,
    });
    expect(long.warnings.some((w) => w.message.includes("scan"))).toBe(true);
  });
});
