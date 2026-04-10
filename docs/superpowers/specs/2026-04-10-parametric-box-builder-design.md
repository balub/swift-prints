# Parametric Box Builder — Design Spec

## Overview

A `/design` page in `frontend-kiosk` where users configure a snap-fit two-part box (body + lid) by entering dimensions, preview it live in 3D, and send either part directly into the existing print order flow.

---

## Parameters

| Parameter | Input | Default | Range |
|-----------|-------|---------|-------|
| Length (interior) | Number + slider | 80mm | 20–300mm |
| Width (interior) | Number + slider | 60mm | 20–300mm |
| Height | Number + slider | 40mm | 10–200mm |
| Lid lip height | Number + slider | 8mm | 3–20mm |
| Corner radius | Slider | 3mm | 0–15mm |
| Fit clearance | Number input | 0.4mm | 0.1–1.0mm |
| Wall thickness | Fixed | 2mm | — |

---

## Architecture

```
BoxBuilderPage (/design)
  ├── Parameter form (inputs + sliders)
  ├── Part toggle — Body / Lid
  ├── STLViewer — live preview of selected part
  ├── useBoxGenerator hook
  │     └── box-generator.worker.ts (@jscad/modeling)
  │           → generates body STL + lid STL
  └── "Print Body" / "Print Lid" buttons
        → new File([stlBuffer], 'box-body.stl')
        → navigate('/order', { state: { upload, file } })
```

---

## JSCAD Geometry

**Body** — rounded hollow box, open top:
```
outer = roundedCuboid(L + 2*wall, W + 2*wall, H, cornerRadius)
inner = cuboid(L, W, H - wall)
body  = subtract(outer, translate([0, 0, wall], inner))
```

**Lid** — plate + interior lip with fit clearance:
```
plate = roundedCuboid(L + 2*wall, W + 2*wall, wall, cornerRadius)
lip   = cuboid(L - clearance, W - clearance, lipHeight)
lid   = union(plate, translate([0, 0, -lipHeight/2], lip))
```

Clearance defaults to 0.4mm (friction fit, removable by hand).

---

## Files

### Create
- `apps/frontend-kiosk/src/pages/BoxBuilder.tsx` — page component
- `apps/frontend-kiosk/src/workers/box-generator.worker.ts` — JSCAD in worker
- `apps/frontend-kiosk/src/hooks/useBoxGenerator.ts` — worker wrapper hook

### Modify
- `apps/frontend-kiosk/src/App.tsx` — add `/design` route
- `apps/frontend-kiosk/src/components/Navbar.tsx` — add "Build a Box" nav link
- `apps/frontend-kiosk/package.json` — add `@jscad/modeling` + `@jscad/stl-serializer`

---

## Order Flow Integration

Generated STL goes into the existing order flow unchanged:

1. User clicks "Print Body" or "Print Lid"
2. STL ArrayBuffer → `new File([buffer], 'box-body.stl', { type: 'application/octet-stream' })`
3. File sent to backend via existing `analyzeUpload(file)` to get `uploadId` + geometry analysis
4. Navigate to `/order` with `{ upload, file }` state — identical to normal upload flow
5. `useEstimator` runs locally for cost estimate as usual

---

## New Dependency

- `@jscad/modeling` — parametric CSG geometry
- `@jscad/stl-serializer` — serialize JSCAD geometry to binary STL ArrayBuffer

Both run exclusively inside the Web Worker — zero impact on main thread bundle.
