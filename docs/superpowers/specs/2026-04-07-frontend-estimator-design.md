# Frontend STL Estimator Design

**Date:** 2026-04-07
**Status:** Approved

## Problem

The backend currently spawns `prusa-slicer` as a child process to produce G-code, then immediately discards the G-code and only uses two numbers parsed from its comments: `filamentUsedGrams` and `printTimeHours`. This is a 5-minute native binary invocation to compute two numbers that can be calculated with math.

## Goal

Move filament + print time estimation entirely to the browser. Both `frontend` and `frontend-kiosk` get instant local estimates with no backend call. The `POST /pricing/estimate` endpoint (which spawns PrusaSlicer) is deprecated.

## New Package: `packages/estimator`

```
packages/estimator/
├── package.json        (@swift-prints/estimator)
├── tsconfig.json
└── src/
    ├── stl-parser.ts   # Parse binary + ASCII STL → Triangle[]
    ├── estimator.ts    # Core estimation math
    ├── worker.ts       # Web Worker entrypoint
    └── index.ts        # Export types: EstimateParams, EstimateResult
```

### Types

```ts
interface EstimateParams {
  stlBuffer: ArrayBuffer;
  layerHeight: number;      // mm, default 0.2
  infill: number;           // %, default 20
  perimeterCount: number;   // default 2
}

interface EstimateResult {
  filamentUsedGrams: number;
  printTimeHours: number;
  volumeMm3: number;
  boundingBox: { x: number; y: number; z: number };
  needsSupports: boolean;
}
```

### STL Parser (`stl-parser.ts`)

Direct port of `apps/backend/src/uploads/stl-analyzer.service.ts`:
- `isBinaryStl(buffer)` — detect format
- `parseBinaryStl(buffer)` — read 50-byte triangle records
- `parseAsciiStl(content)` — parse facet/vertex lines
- `calculateBoundingBox(triangles)`
- `calculateVolume(triangles)` — signed tetrahedron method
- `detectSupportsNeeded(triangles)` — >5% triangles with normal.z < -cos(45°)

### Estimation Math (`estimator.ts`)

Constants (from `slicer-config/config_pla.ini`):
- Nozzle diameter: `0.4mm`
- Top/bottom solid layers: `3`
- Perimeter speed: `45 mm/s`
- PLA density: `1.24 g/cm³`
- Filament diameter: `1.75mm`
- Overhead factor: `1.3`

```
filamentVolumeMm3 =
  infillVolume      = volumeMm3 × (infill / 100)
  perimeterVolume   = surfaceAreaMm2 × nozzleWidth(0.4) × layerHeight × perimeterCount
  topBottomVolume   = boundingBox.x × boundingBox.y × nozzleWidth(0.4) × (topLayers + bottomLayers)

filamentRadiusMm    = 1.75 / 2 = 0.875
filamentGrams       = (filamentVolumeMm3 / (π × 0.875²)) × π × 0.875² × (1.24 / 1000)
                    = filamentVolumeMm3 × (1.24 / 1000)   [simplified]

printTimeSecs       = (filamentVolumeMm3 / (π × 0.875²) / printSpeedMmSec) × overheadFactor
printTimeHours      = printTimeSecs / 3600
```

Surface area is computed as the sum of each triangle's area: `0.5 × |AB × AC|`.

### Web Worker (`worker.ts`)

```ts
self.onmessage = (e: MessageEvent<EstimateParams>) => {
  const result = runEstimate(e.data);
  self.postMessage(result);
};
```

## Support Surcharge

### Backend: Prisma schema change

Add to `Printer` model:
```prisma
supportSurcharge Float @default(0)
```

Migration: `add_support_surcharge_to_printer`.

The field is included in all existing `Printer` API responses (GET /printers, GET /printers/:id).

### Admin Panel (`frontend-kiosk`)

Add a "Support Surcharge (₹)" number input to the create/edit printer forms in `AdminPrinters.tsx`. Passed through `admin.service.ts` create/update calls.

### Frontend Pricing Calculation

```ts
const supportFee = result.needsSupports ? printer.supportSurcharge : 0;
const totalCost = (result.filamentUsedGrams × filament.pricePerGram)
                + (result.printTimeHours × printer.hourlyRate)
                + supportFee;
```

UI shows "Includes ₹X support surcharge" notice when `needsSupports && supportSurcharge > 0`.

## `useEstimator` Hook

Both frontends get `src/hooks/useEstimator.ts`:

```ts
const { estimate, result, isLoading, error } = useEstimator();
estimate(file, params); // triggers worker, returns EstimateResult
```

Internally: creates a `Worker` from `@swift-prints/estimator/worker`, sends `ArrayBuffer` via `postMessage`, resolves on `onmessage`.

## File Memory Strategy

The STL `File` object only exists in the browser during the upload step. By the time the user reaches `OrderPage`, only `UploadResponse` (server metadata) is in `location.state` — the file is gone.

**Solution:** Pass the `File` object through navigation state alongside `UploadResponse`.

In `Landing.tsx` (after upload succeeds):
```ts
navigate('/order', {
  state: { upload: uploadResponse, file: selectedFile }
});
```

In `OrderPage.tsx`:
```ts
const upload = location.state?.upload as UploadResponse;
const file = location.state?.file as File;
```

The `File` object is kept in memory only for the duration of the `OrderPage` session (~seconds). STL files are typically 1–20MB — fine for short-term JS heap use.

## Integration Points

### `frontend-kiosk/OrderPage.tsx`
- Replace `useEstimate()` mutation with `useEstimator()` hook
- Pass `file` from navigation state + current print params to `estimate()`
- Re-run estimate when printer/filament selection changes
- Show support surcharge notice when `needsSupports === true && printer.supportSurcharge > 0`

### `frontend-kiosk/Landing.tsx` (or wherever the upload completes)
- After successful upload, include `file` in navigation state alongside `upload`

### `frontend/` (wherever pricing estimates are triggered)
- Same `useEstimator()` hook pattern
- Same file-passing strategy through navigation state

## What Gets Removed / Deprecated

- `POST /pricing/estimate` — no longer called by either frontend (keep endpoint, don't delete yet)
- `apps/backend/src/slicing/slicing.service.ts` — no longer needed once endpoint is removed

## Accuracy

Expected accuracy: within 10–15% of PrusaSlicer for typical FDM models. Sufficient for pricing estimates at a hackathon kiosk. Edge cases (thin walls, complex lattices) may be less accurate but are rare in hackathon submissions.
