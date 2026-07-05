/**
 * Generate sample DXF/SVG exports for external validation
 * (run with: pnpm exec vite-node scripts/generate-samples.ts <outdir>).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateBox, BOX_DEFAULTS } from "../src/blocks/box/generator";
import { generateKeychain, KEYCHAIN_DEFAULTS, type KeychainShape } from "../src/blocks/keychain/generator";
import { geometryToDxf } from "../src/lib/dxf";
import { geometryToSvg } from "../src/lib/svg";

const outDir = process.argv[2] ?? "samples";
mkdirSync(outDir, { recursive: true });

const cases: { name: string; geometry: ReturnType<typeof generateBox>["geometry"]; warnings: unknown[] }[] = [];

const boxOpen = generateBox({ ...BOX_DEFAULTS, labels: true });
cases.push({ name: "box-open-120x80x50", geometry: boxOpen.geometry, warnings: boxOpen.warnings });

const boxClosed = generateBox({ ...BOX_DEFAULTS, closedTop: true, kerf: 0.2, thickness: 4, fingerSize: 8 });
cases.push({ name: "box-closed-kerf", geometry: boxClosed.geometry, warnings: boxClosed.warnings });

for (const shape of ["rounded", "rectangle", "circle", "oval", "tag"] as KeychainShape[]) {
  const design = generateKeychain({ ...KEYCHAIN_DEFAULTS, shape });
  cases.push({ name: `keychain-${shape}`, geometry: design.geometry, warnings: design.warnings });
}

for (const c of cases) {
  if (c.geometry.shapes.length === 0) {
    console.error(`SKIP ${c.name}: no geometry`, c.warnings);
    continue;
  }
  writeFileSync(join(outDir, `${c.name}.dxf`), geometryToDxf(c.geometry));
  writeFileSync(join(outDir, `${c.name}.svg`), geometryToSvg(c.geometry));
  console.log(`wrote ${c.name} (${c.geometry.shapes.length} shapes)`);
}
