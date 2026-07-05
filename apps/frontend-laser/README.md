# Swift Cuts — Laser-Cut Design Blocks (MVP)

Laser-cutting companion to Swift Prints: users either customize a parametric
"design block" (no CAD needed) or upload their own DXF/SVG. Same visual
language as the Swift Prints configurator (beige surfaces, orange accent,
Jura, slider + numeric input pairs, right-hand preview cards).

```bash
pnpm dev:laser     # dev server on http://localhost:8082
pnpm build:laser   # production build
pnpm test:laser    # vitest (geometry, exports, generators)
```

## Routes

| Route                 | What it is                                                    |
| --------------------- | ------------------------------------------------------------- |
| `/`                   | Landing — the two paths (design block / upload)               |
| `/design`             | Design block gallery (2 functional blocks, 10 coming-soon)    |
| `/design/box-builder` | Finger-joint box: 2D flat layout, 3D assembled preview, cut list |
| `/design/keychain`    | Keychain/text tag: shapes, engraved text, keyring hole        |
| `/upload`             | DXF/SVG upload flow (placeholder — no real quoting yet)       |
| `/materials`          | Static material overview                                      |
| `/orders`             | Placeholder empty state                                       |

## Architecture — how a block works

```
Block params (page state)
    → generator (src/blocks/<block>/generator.ts) → { geometry, summary, warnings }
    → GeometryPreview (2D SVG, rendered from the SAME geometry)
    → geometryToDxf / geometryToSvg (src/lib) → download
```

- `src/lib/geometry.ts` — the single source of truth: paths (with DXF-style
  bulge arcs), circles, engraving text, on `CUT` / `ENGRAVE` / `SCORE` layers.
  Preview and both exporters consume this same model, so they cannot diverge.
- `src/lib/dxf.ts` — hand-rolled DXF R12 writer (POLYLINE + bulge VERTEX,
  CIRCLE, TEXT; layer table with colors). R12 is the most widely supported
  flavor; validated against ezdxf with zero audit errors.
- `src/lib/svg.ts` — standalone SVG in mm from the same geometry (arcs
  flattened at 0.1 mm chord tolerance).
- `src/blocks/registry.ts` — gallery metadata. **To add a block**: add a
  registry entry, a `src/blocks/<slug>/generator.ts` returning
  `GeneratedDesign`, a page under `src/pages/`, and a route in `App.tsx`.

Generation is pure synchronous 2D math, so pages recompute in `useMemo` on
every param change — no web worker needed (unlike the JSCAD-based 3D builders
in frontend-kiosk).

### Box joinery model

Panel outlines are built from four *edge profiles* (intervals at the outer
edge line, or inset by material thickness). Mating edges share the exact same
finger segmentation, so joints line up by construction: front/back are male
at vertical corners, sides female; bottom/top lids carry tabs, walls carry
notches. Kerf compensation shifts each material/notch boundary by kerf/2 so
parts land on nominal size after the beam removes material.

## Manual test results (2026-07-06)

- Box builder: dimension/thickness/finger sliders update 2D + 3D previews and
  cut list live; closed-top adds the Top panel everywhere; warnings fire for
  fragile fingers / invalid thickness; DXF + SVG download.
- Keychain: all 5 shapes × 3 hole positions keep the hole inside the outline
  (unit-tested); text edits update preview live; too-long text and tiny fonts
  warn.
- Upload: accepts .dxf/.svg (SVG gets a real preview), rejects other types
  with a message, placeholder quote CTA works.
- DXF validation: `scripts/generate-samples.ts` + ezdxf `recover.readfile`
  audit → 0 errors across box (open/closed/kerf) and all keychain shapes;
  rendered output visually checked (fingers complementary, labels engraved).
- Regression: `pnpm build:frontend` and `pnpm build:frontend-kiosk` still pass.

## Known limitations

- Engraved text is exported as DXF `TEXT` / SVG `<text>`, not vector
  outlines — laser software substitutes its own font, so text width varies by
  viewer (the width warning uses a conservative estimate). Text-to-path is
  the planned upgrade.
- Kerf compensation adjusts joint fit only (tab/notch widths), not the whole
  contour offset.
- Finger phase at box corners is fixed (front/back male); extreme
  finger-size/thickness ratios can produce small corner overhangs — fine for
  a first test cut.
- Units are mm only; joint type is finger-only (others stubbed in the UI).
- Upload flow stores nothing and quotes nothing yet — it is a credible
  front-end for the future quoting engine.
