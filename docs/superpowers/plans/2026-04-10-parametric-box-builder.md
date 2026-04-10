# Parametric Box Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/design` page to `frontend-kiosk` where users configure a snap-fit two-part box (body + lid), preview it live in 3D, and send either part into the existing print order flow.

**Architecture:** JSCAD geometry runs in a Web Worker (`box-generator.worker.ts`) to keep the UI responsive. A `useBoxGenerator` hook wraps the worker (same pattern as `useEstimator`). The `BoxBuilder` page uses the existing `STLViewer` for preview and `analyzeUpload` + `navigate('/order')` for the print flow.

**Tech Stack:** `@jscad/modeling`, `@jscad/stl-serializer`, React + TypeScript, Vite Web Workers, Tailwind + shadcn/ui, React Router v6.

**Working directory:** `apps/frontend-kiosk` inside the worktree at `.worktrees/feat/parametric-box-builder`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/workers/box-generator.worker.ts` | Create | JSCAD geometry generation, STL serialization |
| `src/hooks/useBoxGenerator.ts` | Create | Worker lifecycle, message passing, state |
| `src/pages/BoxBuilder.tsx` | Create | Page UI, parameter form, preview, print action |
| `src/App.tsx` | Modify | Add `/design` route |
| `src/components/Navbar.tsx` | Modify | Add "Build a Box" nav link |
| `package.json` | Modify | Add `@jscad/modeling` + `@jscad/stl-serializer` |

---

## Task 1: Install JSCAD dependencies

**Files:**
- Modify: `apps/frontend-kiosk/package.json`

- [ ] **Step 1: Install packages**

Run from repo root:
```bash
cd apps/frontend-kiosk && pnpm add @jscad/modeling @jscad/stl-serializer
```

Expected output: Both packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@jscad/modeling'); require('@jscad/stl-serializer'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-kiosk/package.json pnpm-lock.yaml
git commit -m "chore: add @jscad/modeling and @jscad/stl-serializer"
```

---

## Task 2: Box generator worker

**Files:**
- Create: `apps/frontend-kiosk/src/workers/box-generator.worker.ts`

- [ ] **Step 1: Create the worker**

```typescript
// apps/frontend-kiosk/src/workers/box-generator.worker.ts
import { primitives, booleans, transforms } from '@jscad/modeling'
import { serialize } from '@jscad/stl-serializer'

const { roundedCuboid, cuboid } = primitives
const { subtract, union } = booleans
const { translate } = transforms

export interface BoxParams {
  length: number       // interior length mm
  width: number        // interior width mm
  height: number       // interior height mm
  lipHeight: number    // lid lip height mm
  cornerRadius: number // corner fillet radius mm
  clearance: number    // snap-fit clearance mm
  wallThickness: number // fixed 2mm
}

function generateBody(p: BoxParams) {
  const { length: L, width: W, height: H, cornerRadius: r, wallThickness: wt } = p
  // Outer shell — rounded cuboid
  const outer = roundedCuboid({ size: [L + 2 * wt, W + 2 * wt, H], roundRadius: r, segments: 16 })
  // Inner void — open top, floor = wallThickness
  const inner = cuboid({ size: [L, W, H - wt] })
  // JSCAD centers at origin. Inner center Z = wt/2 (floor sits at -H/2 + wt)
  const innerPositioned = translate([0, 0, wt / 2], inner)
  return subtract(outer, innerPositioned)
}

function generateLid(p: BoxParams) {
  const { length: L, width: W, lipHeight, clearance, cornerRadius: r, wallThickness: wt } = p
  // Flat plate — same outer footprint as box
  const plate = roundedCuboid({ size: [L + 2 * wt, W + 2 * wt, wt], roundRadius: r, segments: 16 })
  // Lip hangs down from underside of plate; clearance on each side
  const lip = cuboid({ size: [L - clearance, W - clearance, lipHeight] })
  // Plate center at Z=0, underside at -wt/2. Lip center = -wt/2 - lipHeight/2
  const lipPositioned = translate([0, 0, -wt / 2 - lipHeight / 2], lip)
  return union(plate, lipPositioned)
}

self.onmessage = (e: MessageEvent<BoxParams>) => {
  try {
    const body = generateBody(e.data)
    const lid = generateLid(e.data)
    // serialize returns Uint8Array for binary STL
    const bodyData = serialize({ binary: true }, body) as unknown as Uint8Array
    const lidData = serialize({ binary: true }, lid) as unknown as Uint8Array
    const bodyBuffer = bodyData.buffer.slice(bodyData.byteOffset, bodyData.byteOffset + bodyData.byteLength)
    const lidBuffer = lidData.buffer.slice(lidData.byteOffset, lidData.byteOffset + lidData.byteLength)
    self.postMessage({ bodyBuffer, lidBuffer }, [bodyBuffer, lidBuffer])
  } catch (err) {
    self.postMessage({ error: (err as Error).message })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-kiosk/src/workers/box-generator.worker.ts
git commit -m "feat: add JSCAD box generator web worker"
```

---

## Task 3: useBoxGenerator hook

**Files:**
- Create: `apps/frontend-kiosk/src/hooks/useBoxGenerator.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/frontend-kiosk/src/hooks/useBoxGenerator.ts
import { useRef, useState, useCallback, useEffect } from 'react'
import type { BoxParams } from '../workers/box-generator.worker'

export type { BoxParams }

export interface BoxResult {
  bodyBuffer: ArrayBuffer
  lidBuffer: ArrayBuffer
}

export function useBoxGenerator() {
  const workerRef = useRef<Worker | null>(null)
  const [result, setResult] = useState<BoxResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/box-generator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e: MessageEvent<BoxResult & { error?: string }>) => {
      if (e.data.error) {
        setError(e.data.error)
      } else {
        setResult({ bodyBuffer: e.data.bodyBuffer, lidBuffer: e.data.lidBuffer })
      }
      setIsLoading(false)
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const generate = useCallback((params: BoxParams) => {
    setIsLoading(true)
    setError(null)
    workerRef.current?.postMessage(params)
  }, [])

  return { generate, result, isLoading, error }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-kiosk/src/hooks/useBoxGenerator.ts
git commit -m "feat: add useBoxGenerator hook"
```

---

## Task 4: BoxBuilder page

**Files:**
- Create: `apps/frontend-kiosk/src/pages/BoxBuilder.tsx`

- [ ] **Step 1: Create the page**

```tsx
// apps/frontend-kiosk/src/pages/BoxBuilder.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import STLViewer from '@/components/STLViewer'
import { useBoxGenerator, BoxParams } from '@/hooks/useBoxGenerator'
import { analyzeUpload } from '@/services/uploads.service'

const DEFAULTS: BoxParams = {
  length: 80,
  width: 60,
  height: 40,
  lipHeight: 8,
  cornerRadius: 3,
  clearance: 0.4,
  wallThickness: 2,
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function BoxBuilder() {
  const navigate = useNavigate()
  const { generate, result, isLoading, error } = useBoxGenerator()
  const [params, setParams] = useState<BoxParams>(DEFAULTS)
  const [activePart, setActivePart] = useState<'body' | 'lid'>('body')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  const debouncedParams = useDebounce(params, 400)

  // Regenerate on param change
  useEffect(() => {
    generate(debouncedParams)
  }, [debouncedParams, generate])

  // Update preview when result or active part changes
  useEffect(() => {
    if (!result) return
    const buffer = activePart === 'body' ? result.bodyBuffer : result.lidBuffer
    const file = new File([buffer], `box-${activePart}.stl`, { type: 'application/octet-stream' })
    setPreviewFile(file)
  }, [result, activePart])

  const set = (key: keyof BoxParams) => (value: number) =>
    setParams(prev => ({ ...prev, [key]: value }))

  const handlePrint = async (part: 'body' | 'lid') => {
    if (!result) return
    setIsPrinting(true)
    try {
      const buffer = part === 'body' ? result.bodyBuffer : result.lidBuffer
      const file = new File([buffer], `box-${part}.stl`, { type: 'application/octet-stream' })
      const upload = await analyzeUpload(file)
      navigate('/order', { state: { upload, file } })
    } catch {
      setIsPrinting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-jura mb-2">Box Builder</h1>
        <p className="text-muted-foreground mb-6">Configure a snap-fit box and send it to print.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Parameters */}
          <div className="space-y-6">
            <ParamSlider label="Length (interior)" unit="mm" value={params.length} min={20} max={300} step={1} onChange={set('length')} />
            <ParamSlider label="Width (interior)" unit="mm" value={params.width} min={20} max={300} step={1} onChange={set('width')} />
            <ParamSlider label="Height" unit="mm" value={params.height} min={10} max={200} step={1} onChange={set('height')} />
            <ParamSlider label="Lid lip height" unit="mm" value={params.lipHeight} min={3} max={20} step={0.5} onChange={set('lipHeight')} />
            <ParamSlider label="Corner radius" unit="mm" value={params.cornerRadius} min={0} max={15} step={0.5} onChange={set('cornerRadius')} />

            <div className="space-y-2">
              <Label>Fit clearance (mm)</Label>
              <Input
                type="number"
                min={0.1}
                max={1.0}
                step={0.05}
                value={params.clearance}
                onChange={e => set('clearance')(parseFloat(e.target.value) || 0.4)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Gap between lid lip and box interior. 0.4mm = snug friction fit.</p>
            </div>

            {/* Print buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handlePrint('body')}
                disabled={!result || isPrinting}
                className="flex-1"
              >
                {isPrinting ? 'Uploading…' : 'Print Body'}
              </Button>
              <Button
                onClick={() => handlePrint('lid')}
                disabled={!result || isPrinting}
                variant="outline"
                className="flex-1"
              >
                {isPrinting ? 'Uploading…' : 'Print Lid'}
              </Button>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activePart === 'body' ? 'default' : 'outline'}
                onClick={() => setActivePart('body')}
              >
                Body
              </Button>
              <Button
                size="sm"
                variant={activePart === 'lid' ? 'default' : 'outline'}
                onClick={() => setActivePart('lid')}
              >
                Lid
              </Button>
            </div>
            <div className="h-[500px] rounded-xl overflow-hidden border">
              {isLoading && !previewFile ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Generating…
                </div>
              ) : (
                <STLViewer file={previewFile} className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ParamSliderProps {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function ParamSlider({ label, unit, value, min, max, step, onChange }: ParamSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-mono">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          className="w-20"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check that `analyzeUpload` is exported from uploads service**

Read `apps/frontend-kiosk/src/services/uploads.service.ts` — confirm `analyzeUpload(file: File)` is exported. If the function is named differently, update the import in `BoxBuilder.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-kiosk/src/pages/BoxBuilder.tsx
git commit -m "feat: add BoxBuilder page with parameter form and live preview"
```

---

## Task 5: Wire up route and nav link

**Files:**
- Modify: `apps/frontend-kiosk/src/App.tsx`
- Modify: `apps/frontend-kiosk/src/components/Navbar.tsx`

- [ ] **Step 1: Add the route to App.tsx**

In `App.tsx`, import `BoxBuilder` and add the route alongside the other public routes:

```tsx
import BoxBuilder from './pages/BoxBuilder'

// Inside the Routes block, with the other public routes:
<Route path="/design" element={<BoxBuilder />} />
```

- [ ] **Step 2: Add nav link to Navbar.tsx**

In `Navbar.tsx`, add a link to `/design` next to the existing nav items:

```tsx
import { Link, useLocation } from 'react-router-dom'

// Inside the nav links:
<Link
  to="/design"
  className={`text-sm font-medium transition-colors hover:text-primary ${
    location.pathname === '/design' ? 'text-primary' : 'text-muted-foreground'
  }`}
>
  Build a Box
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-kiosk/src/App.tsx apps/frontend-kiosk/src/components/Navbar.tsx
git commit -m "feat: add /design route and Build a Box nav link"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd apps/frontend-kiosk && pnpm dev
```

- [ ] **Step 2: Verify the page loads**

Open `http://localhost:8081/design`. The page should render with parameter sliders and a loading state while the first STL generates.

- [ ] **Step 3: Verify live preview**

Adjust the Length slider. Within ~400ms the 3D preview should update with the new geometry.

- [ ] **Step 4: Verify part toggle**

Click "Lid" — the preview should switch to show the lid geometry (flat plate with a protruding lip underneath).

- [ ] **Step 5: Verify print flow**

Click "Print Body" — should show "Uploading…", then navigate to `/order` with the box STL pre-loaded. Confirm the estimator runs and a cost appears.

- [ ] **Step 6: Push branch**

```bash
git push origin feat/parametric-box-builder
```
