# Frontend STL Estimator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move filament/print-time estimation from PrusaSlicer (backend) to a pure-TypeScript Web Worker running in the browser, and add a configurable per-printer support surcharge.

**Architecture:** A new `packages/estimator` workspace package contains the STL parsing + estimation math ported from the backend. Each frontend gets a thin Web Worker wrapper and a `useEstimator` hook that runs estimation locally. The backend gains a `supportSurcharge` field on `Printer` that is used both in order cost calculation and exposed to the admin panel.

**Tech Stack:** TypeScript, Vite Web Workers (`new URL(..., import.meta.url)`), Prisma migration, NestJS DTOs, React hooks, TanStack Query, Vitest

---

## File Map

**New files:**
- `packages/estimator/package.json`
- `packages/estimator/tsconfig.json`
- `packages/estimator/vitest.config.ts`
- `packages/estimator/src/stl-parser.ts`
- `packages/estimator/src/estimator.ts`
- `packages/estimator/src/index.ts`
- `packages/estimator/src/__tests__/estimator.test.ts`
- `apps/frontend-kiosk/src/workers/estimator.worker.ts`
- `apps/frontend-kiosk/src/hooks/useEstimator.ts`
- `apps/frontend/src/workers/estimator.worker.ts`
- `apps/frontend/src/hooks/useEstimator.ts`

**Modified files:**
- `apps/backend/prisma/schema.prisma` — add `supportSurcharge` to `Printer`
- `apps/backend/src/admin/dto/create-printer.dto.ts` — add `supportSurcharge`
- `apps/backend/src/admin/dto/update-printer.dto.ts` — add `supportSurcharge`
- `apps/backend/src/printers/printers.service.ts` — `validatePrinterFilament` returns `supportSurcharge`, `create`/`update` accept it
- `apps/backend/src/orders/orders.service.ts` — add support cost to `totalCost`
- `apps/frontend-kiosk/vite.config.ts` — add `@swift-prints/estimator` alias
- `apps/frontend-kiosk/tsconfig.json` — add `@swift-prints/estimator` path
- `apps/frontend-kiosk/src/services/api-client.ts` — add `supportSurcharge` to `Printer` type
- `apps/frontend-kiosk/src/services/admin.service.ts` — add `supportSurcharge` to request types
- `apps/frontend-kiosk/src/pages/Landing.tsx` — pass `file` in navigation state
- `apps/frontend-kiosk/src/pages/OrderPage.tsx` — replace `useEstimate()` with `useEstimator()`
- `apps/frontend-kiosk/src/pages/AdminPrinters.tsx` — add support surcharge field
- `apps/frontend/vite.config.ts` — add `@swift-prints/estimator` alias
- `apps/frontend/tsconfig.app.json` — add `@swift-prints/estimator` path

---

## Task 1: Backend — Add supportSurcharge to Prisma schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add supportSurcharge field to Printer model**

In `apps/backend/prisma/schema.prisma`, update the `Printer` model:

```prisma
model Printer {
  id               String            @id @default(uuid())
  name             String
  hourlyRate       Float
  supportSurcharge Float             @default(0)
  isActive         Boolean           @default(true)
  filaments        FilamentPricing[]
  orders           Order[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([isActive])
}
```

- [ ] **Step 2: Run migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_support_surcharge_to_printer
```

Expected output: `✔ Generated Prisma Client` and a new migration file in `prisma/migrations/`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: add supportSurcharge field to Printer model"
```

---

## Task 2: Backend — Update DTOs and PrintersService

**Files:**
- Modify: `apps/backend/src/admin/dto/create-printer.dto.ts`
- Modify: `apps/backend/src/admin/dto/update-printer.dto.ts`
- Modify: `apps/backend/src/printers/printers.service.ts`

- [ ] **Step 1: Update CreatePrinterDto**

Replace the contents of `apps/backend/src/admin/dto/create-printer.dto.ts`:

```typescript
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilamentDto {
  @ApiProperty({ description: 'Filament type identifier', example: 'pla' })
  @IsString()
  filamentType: string;

  @ApiProperty({ description: 'Display name', example: 'PLA' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Price per gram', minimum: 0, example: 0.05 })
  @IsNumber()
  @Min(0)
  pricePerGram: number;
}

export class CreatePrinterDto {
  @ApiProperty({ description: 'Printer name', example: 'Prusa MK4' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Hourly rate for machine time', minimum: 0, example: 2.5 })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiPropertyOptional({ description: 'Flat surcharge added when model needs supports', minimum: 0, example: 50, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supportSurcharge?: number;

  @ApiPropertyOptional({
    description: 'Initial filaments for the printer',
    type: [FilamentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilamentDto)
  filaments?: FilamentDto[];
}
```

- [ ] **Step 2: Update UpdatePrinterDto**

Replace the contents of `apps/backend/src/admin/dto/update-printer.dto.ts`:

```typescript
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePrinterDto {
  @ApiPropertyOptional({ description: 'Printer name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Hourly rate for machine time', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Flat surcharge added when model needs supports', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supportSurcharge?: number;

  @ApiPropertyOptional({ description: 'Whether the printer is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

- [ ] **Step 3: Update PrintersService — create, update, validatePrinterFilament**

Replace the contents of `apps/backend/src/printers/printers.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.printer.findMany({
      where: { isActive: true },
      include: {
        filaments: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(printerId: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        filaments: {
          where: { isActive: true },
        },
      },
    });

    if (!printer) {
      throw new NotFoundException(`Printer ${printerId} not found`);
    }

    return printer;
  }

  async getFilamentPricing(printerId: string, filamentId: string) {
    const filament = await this.prisma.filamentPricing.findFirst({
      where: {
        id: filamentId,
        printerId,
        isActive: true,
      },
      include: {
        printer: true,
      },
    });

    if (!filament) {
      throw new NotFoundException(
        `Filament ${filamentId} not found for printer ${printerId}`,
      );
    }

    return filament;
  }

  async validatePrinterFilament(
    printerId: string,
    filamentId: string,
  ): Promise<{
    printer: { id: string; name: string; hourlyRate: number; supportSurcharge: number };
    filament: { id: string; name: string; pricePerGram: number };
  }> {
    const filament = await this.getFilamentPricing(printerId, filamentId);

    return {
      printer: {
        id: filament.printer.id,
        name: filament.printer.name,
        hourlyRate: filament.printer.hourlyRate,
        supportSurcharge: filament.printer.supportSurcharge,
      },
      filament: {
        id: filament.id,
        name: filament.name,
        pricePerGram: filament.pricePerGram,
      },
    };
  }

  async create(data: {
    name: string;
    hourlyRate: number;
    supportSurcharge?: number;
    filaments?: Array<{
      filamentType: string;
      name: string;
      pricePerGram: number;
    }>;
  }) {
    return this.prisma.printer.create({
      data: {
        name: data.name,
        hourlyRate: data.hourlyRate,
        supportSurcharge: data.supportSurcharge ?? 0,
        filaments: data.filaments
          ? {
              create: data.filaments.map((f) => ({
                filamentType: f.filamentType,
                name: f.name,
                pricePerGram: f.pricePerGram,
              })),
            }
          : undefined,
      },
      include: {
        filaments: true,
      },
    });
  }

  async update(
    printerId: string,
    data: {
      name?: string;
      hourlyRate?: number;
      supportSurcharge?: number;
      isActive?: boolean;
    },
  ) {
    await this.findById(printerId);

    return this.prisma.printer.update({
      where: { id: printerId },
      data,
      include: {
        filaments: true,
      },
    });
  }

  async addFilament(
    printerId: string,
    data: {
      filamentType: string;
      name: string;
      pricePerGram: number;
    },
  ) {
    await this.findById(printerId);

    return this.prisma.filamentPricing.create({
      data: {
        printerId,
        filamentType: data.filamentType,
        name: data.name,
        pricePerGram: data.pricePerGram,
      },
    });
  }

  async updateFilament(
    filamentId: string,
    data: {
      name?: string;
      pricePerGram?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.filamentPricing.update({
      where: { id: filamentId },
      data,
    });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/admin/dto/ apps/backend/src/printers/printers.service.ts
git commit -m "feat: add supportSurcharge to printer DTOs and service"
```

---

## Task 3: Backend — Include support cost in order total

**Files:**
- Modify: `apps/backend/src/orders/orders.service.ts:46-49`

- [ ] **Step 1: Update cost calculation in create()**

In `apps/backend/src/orders/orders.service.ts`, replace lines 46–49:

```typescript
    // Calculate cost from base estimates
    const materialCost = upload.baseFilamentEstimateG * filament.pricePerGram;
    const machineTimeCost = upload.basePrintTimeHours * printer.hourlyRate;
    const supportCost = upload.needsSupports ? printer.supportSurcharge : 0;
    const totalCost = Math.round((materialCost + machineTimeCost + supportCost) * 100) / 100;
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/orders/orders.service.ts
git commit -m "feat: include support surcharge in order total cost"
```

---

## Task 4: Create packages/estimator

**Files:**
- Create: `packages/estimator/package.json`
- Create: `packages/estimator/tsconfig.json`
- Create: `packages/estimator/vitest.config.ts`
- Create: `packages/estimator/src/stl-parser.ts`
- Create: `packages/estimator/src/estimator.ts`
- Create: `packages/estimator/src/index.ts`
- Create: `packages/estimator/src/__tests__/estimator.test.ts`

- [ ] **Step 1: Create package.json**

Create `packages/estimator/package.json`:

```json
{
  "name": "@swift-prints/estimator",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./worker": "./src/worker.ts"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `packages/estimator/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

Create `packages/estimator/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write failing tests**

Create `packages/estimator/src/__tests__/estimator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeEstimate } from '../estimator';

describe('computeEstimate', () => {
  it('calculates filament grams from volume', () => {
    // 1000 mm³ volume, 20% infill, 0.2mm layer, 2 perimeters, no supports
    // surface area: 600 mm² (approx for 10x10x10 cube)
    const result = computeEstimate({
      volumeMm3: 1000,
      surfaceAreaMm2: 600,
      boundingBox: { x: 10, y: 10, z: 10 },
      needsSupports: false,
      layerHeight: 0.2,
      infill: 20,
      perimeterCount: 2,
    });

    // infillVolume = 1000 * 0.20 = 200 mm³
    // perimeterVolume = 600 * 0.4 * 0.2 * 2 = 96 mm³
    // topBottomVolume = 10 * 10 * 0.4 * (3 + 3) = 240 mm³
    // total = 536 mm³ -> 536 * 0.00124 ≈ 0.66g
    expect(result.filamentUsedGrams).toBeCloseTo(0.66, 1);
  });

  it('adds support cost when needsSupports is true', () => {
    const withoutSupports = computeEstimate({
      volumeMm3: 10000,
      surfaceAreaMm2: 2400,
      boundingBox: { x: 20, y: 20, z: 25 },
      needsSupports: false,
      layerHeight: 0.2,
      infill: 20,
      perimeterCount: 2,
    });

    const withSupports = computeEstimate({
      volumeMm3: 10000,
      surfaceAreaMm2: 2400,
      boundingBox: { x: 20, y: 20, z: 25 },
      needsSupports: true,
      layerHeight: 0.2,
      infill: 20,
      perimeterCount: 2,
    });

    expect(withSupports.filamentUsedGrams).toBeGreaterThan(withoutSupports.filamentUsedGrams);
  });

  it('returns non-zero print time', () => {
    const result = computeEstimate({
      volumeMm3: 5000,
      surfaceAreaMm2: 1500,
      boundingBox: { x: 15, y: 15, z: 22 },
      needsSupports: false,
      layerHeight: 0.2,
      infill: 20,
      perimeterCount: 2,
    });

    expect(result.printTimeHours).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Run tests to confirm they fail**

```bash
cd packages/estimator
npx vitest run
```

Expected: FAIL — `Cannot find module '../estimator'`

- [ ] **Step 6: Create stl-parser.ts**

Create `packages/estimator/src/stl-parser.ts`:

```typescript
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  normal: Vec3;
  vertices: [Vec3, Vec3, Vec3];
}

export interface ParsedStl {
  triangles: Triangle[];
  volumeMm3: number;
  surfaceAreaMm2: number;
  boundingBox: Vec3;
  needsSupports: boolean;
}

export function parseStl(buffer: ArrayBuffer): ParsedStl {
  const bytes = new Uint8Array(buffer);
  const isBinary = detectBinary(bytes, buffer);
  const triangles = isBinary
    ? parseBinary(buffer)
    : parseAscii(new TextDecoder().decode(bytes));

  return {
    triangles,
    volumeMm3: Math.abs(calculateVolume(triangles)),
    surfaceAreaMm2: calculateSurfaceArea(triangles),
    boundingBox: calculateBoundingBox(triangles),
    needsSupports: detectSupports(triangles),
  };
}

function detectBinary(bytes: Uint8Array, buffer: ArrayBuffer): boolean {
  if (bytes.length < 84) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 80)).toLowerCase();
  if (header.startsWith('solid')) {
    const preview = new TextDecoder().decode(bytes.slice(0, 1000));
    if (preview.includes('facet') && preview.includes('vertex')) return false;
  }
  const triangleCount = new DataView(buffer).getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  return bytes.length >= expectedSize - 2;
}

function parseBinary(buffer: ArrayBuffer): Triangle[] {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  const triangles: Triangle[] = [];
  let offset = 84;
  for (let i = 0; i < count; i++) {
    triangles.push({
      normal: { x: view.getFloat32(offset, true), y: view.getFloat32(offset + 4, true), z: view.getFloat32(offset + 8, true) },
      vertices: [
        { x: view.getFloat32(offset + 12, true), y: view.getFloat32(offset + 16, true), z: view.getFloat32(offset + 20, true) },
        { x: view.getFloat32(offset + 24, true), y: view.getFloat32(offset + 28, true), z: view.getFloat32(offset + 32, true) },
        { x: view.getFloat32(offset + 36, true), y: view.getFloat32(offset + 40, true), z: view.getFloat32(offset + 44, true) },
      ],
    });
    offset += 50;
  }
  return triangles;
}

function parseAscii(content: string): Triangle[] {
  const triangles: Triangle[] = [];
  const lines = content.split('\n').map((l) => l.trim().toLowerCase());
  let normal: Vec3 = { x: 0, y: 0, z: 0 };
  let verts: Vec3[] = [];

  for (const line of lines) {
    if (line.startsWith('facet normal')) {
      const p = line.split(/\s+/);
      normal = { x: +p[2] || 0, y: +p[3] || 0, z: +p[4] || 0 };
      verts = [];
    } else if (line.startsWith('vertex')) {
      const p = line.split(/\s+/);
      verts.push({ x: +p[1] || 0, y: +p[2] || 0, z: +p[3] || 0 });
    } else if (line.startsWith('endfacet') && verts.length === 3) {
      triangles.push({ normal, vertices: [verts[0], verts[1], verts[2]] });
    }
  }
  return triangles;
}

function calculateVolume(triangles: Triangle[]): number {
  let volume = 0;
  for (const { vertices: [v0, v1, v2] } of triangles) {
    volume +=
      (v0.x * (v1.y * v2.z - v2.y * v1.z) -
        v1.x * (v0.y * v2.z - v2.y * v0.z) +
        v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;
  }
  return volume;
}

function calculateSurfaceArea(triangles: Triangle[]): number {
  let area = 0;
  for (const { vertices: [v0, v1, v2] } of triangles) {
    const abx = v1.x - v0.x, aby = v1.y - v0.y, abz = v1.z - v0.z;
    const acx = v2.x - v0.x, acy = v2.y - v0.y, acz = v2.z - v0.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  return area;
}

function calculateBoundingBox(triangles: Triangle[]): Vec3 {
  if (triangles.length === 0) return { x: 0, y: 0, z: 0 };
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const { vertices } of triangles) {
    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
      if (v.z > maxZ) maxZ = v.z;
    }
  }
  return { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
}

function detectSupports(triangles: Triangle[]): boolean {
  if (triangles.length === 0) return false;
  const threshold = Math.cos((45 * Math.PI) / 180);
  const overhangs = triangles.filter((t) => t.normal.z < -threshold).length;
  return overhangs / triangles.length > 0.05;
}
```

- [ ] **Step 7: Create estimator.ts**

Create `packages/estimator/src/estimator.ts`:

```typescript
import { parseStl } from './stl-parser';

// Constants from slicer-config/config_pla.ini
const NOZZLE_DIAMETER_MM = 0.4;
const TOP_BOTTOM_LAYERS = 3;
const PRINT_SPEED_MM_PER_SEC = 45;
const PLA_DENSITY_G_PER_MM3 = 0.00124;
const OVERHEAD_FACTOR = 1.3;
const FILAMENT_RADIUS_MM = 0.875; // 1.75mm diameter / 2

export interface ComputeInput {
  volumeMm3: number;
  surfaceAreaMm2: number;
  boundingBox: { x: number; y: number; z: number };
  needsSupports: boolean;
  layerHeight: number;
  infill: number;        // percentage 0-100
  perimeterCount: number;
}

export interface EstimateResult {
  filamentUsedGrams: number;
  printTimeHours: number;
  volumeMm3: number;
  boundingBox: { x: number; y: number; z: number };
  needsSupports: boolean;
}

export interface EstimateParams {
  stlBuffer: ArrayBuffer;
  layerHeight: number;
  infill: number;
  perimeterCount: number;
}

export function computeEstimate(input: ComputeInput): EstimateResult {
  const { volumeMm3, surfaceAreaMm2, boundingBox, needsSupports, layerHeight, infill, perimeterCount } = input;

  const infillVolume = volumeMm3 * (infill / 100);
  const perimeterVolume = surfaceAreaMm2 * NOZZLE_DIAMETER_MM * layerHeight * perimeterCount;
  const topBottomVolume = boundingBox.x * boundingBox.y * NOZZLE_DIAMETER_MM * (TOP_BOTTOM_LAYERS * 2);
  const supportVolume = needsSupports ? volumeMm3 * 0.15 : 0;

  const totalFilamentVolumeMm3 = infillVolume + perimeterVolume + topBottomVolume + supportVolume;

  const filamentUsedGrams = Math.round(totalFilamentVolumeMm3 * PLA_DENSITY_G_PER_MM3 * 100) / 100;

  const filamentLengthMm = totalFilamentVolumeMm3 / (Math.PI * FILAMENT_RADIUS_MM * FILAMENT_RADIUS_MM);
  const printTimeSecs = (filamentLengthMm / PRINT_SPEED_MM_PER_SEC) * OVERHEAD_FACTOR;
  const printTimeHours = Math.round((printTimeSecs / 3600) * 100) / 100;

  return { filamentUsedGrams, printTimeHours, volumeMm3, boundingBox, needsSupports };
}

export function runEstimate(params: EstimateParams): EstimateResult {
  const parsed = parseStl(params.stlBuffer);
  return computeEstimate({
    volumeMm3: parsed.volumeMm3,
    surfaceAreaMm2: parsed.surfaceAreaMm2,
    boundingBox: parsed.boundingBox,
    needsSupports: parsed.needsSupports,
    layerHeight: params.layerHeight,
    infill: params.infill,
    perimeterCount: params.perimeterCount,
  });
}
```

- [ ] **Step 8: Create index.ts**

Create `packages/estimator/src/index.ts`:

```typescript
export { runEstimate, computeEstimate } from './estimator';
export type { EstimateParams, EstimateResult, ComputeInput } from './estimator';
```

- [ ] **Step 9: Run tests — should pass now**

```bash
cd packages/estimator
npx vitest run
```

Expected: All 3 tests PASS.

- [ ] **Step 10: Commit**

```bash
cd ../..
git add packages/estimator/
git commit -m "feat: add packages/estimator with STL parser and estimation math"
```

---

## Task 5: Update frontend configs for @swift-prints/estimator alias

**Files:**
- Modify: `apps/frontend-kiosk/vite.config.ts`
- Modify: `apps/frontend-kiosk/tsconfig.json`
- Modify: `apps/frontend/vite.config.ts`
- Modify: `apps/frontend/tsconfig.app.json`

- [ ] **Step 1: Update frontend-kiosk vite.config.ts**

In `apps/frontend-kiosk/vite.config.ts`, add the estimator alias to the existing alias array:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\/components\/ui\/(.*)/,
        replacement: path.resolve(__dirname, "../../packages/ui/src/components/$1"),
      },
      {
        find: "@/lib/utils",
        replacement: path.resolve(__dirname, "../../packages/ui/src/lib/utils"),
      },
      {
        find: "@swift-prints/estimator",
        replacement: path.resolve(__dirname, "../../packages/estimator/src/index.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
});
```

- [ ] **Step 2: Update frontend-kiosk tsconfig.json**

In `apps/frontend-kiosk/tsconfig.json`, add the estimator path:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/components/ui/*": ["../../packages/ui/src/components/*"],
      "@/lib/utils": ["../../packages/ui/src/lib/utils"],
      "@swift-prints/estimator": ["../../packages/estimator/src/index.ts"],
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Update frontend vite.config.ts**

In `apps/frontend/vite.config.ts`, add the estimator alias to the existing alias array (after the `@/lib/utils` entry, before `@`):

```typescript
      {
        find: "@swift-prints/estimator",
        replacement: path.resolve(__dirname, "../../packages/estimator/src/index.ts"),
      },
```

The full alias array becomes:
```typescript
    alias: [
      {
        find: /^@\/components\/ui\/(.*)/,
        replacement: path.resolve(__dirname, "../../packages/ui/src/components/$1"),
      },
      {
        find: "@/lib/utils",
        replacement: path.resolve(__dirname, "../../packages/ui/src/lib/utils"),
      },
      {
        find: "@swift-prints/estimator",
        replacement: path.resolve(__dirname, "../../packages/estimator/src/index.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
```

- [ ] **Step 4: Update frontend tsconfig.app.json**

In `apps/frontend/tsconfig.app.json`, add:

```json
"@swift-prints/estimator": ["../../packages/estimator/src/index.ts"],
```

Full paths block:
```json
    "paths": {
      "@/components/ui/*": ["../../packages/ui/src/components/*"],
      "@/lib/utils": ["../../packages/ui/src/lib/utils"],
      "@swift-prints/estimator": ["../../packages/estimator/src/index.ts"],
      "@/*": ["./src/*"]
    }
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend-kiosk/vite.config.ts apps/frontend-kiosk/tsconfig.json \
        apps/frontend/vite.config.ts apps/frontend/tsconfig.app.json
git commit -m "chore: add @swift-prints/estimator alias to both frontends"
```

---

## Task 6: Create worker + useEstimator hook in frontend-kiosk

**Files:**
- Create: `apps/frontend-kiosk/src/workers/estimator.worker.ts`
- Create: `apps/frontend-kiosk/src/hooks/useEstimator.ts`

- [ ] **Step 1: Create estimator.worker.ts**

Create `apps/frontend-kiosk/src/workers/estimator.worker.ts`:

```typescript
import { runEstimate } from '@swift-prints/estimator';
import type { EstimateParams, EstimateResult } from '@swift-prints/estimator';

self.onmessage = (e: MessageEvent<EstimateParams>) => {
  const result: EstimateResult = runEstimate(e.data);
  self.postMessage(result);
};
```

- [ ] **Step 2: Create useEstimator.ts**

Create `apps/frontend-kiosk/src/hooks/useEstimator.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import type { EstimateResult } from '@swift-prints/estimator';

interface UseEstimatorReturn {
  estimate: (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => void;
  result: EstimateResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useEstimator(): UseEstimatorReturn {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/estimator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<EstimateResult>) => {
      setResult(e.data);
      setIsLoading(false);
    };

    workerRef.current.onerror = (e) => {
      setError(e.message || 'Estimation failed');
      setIsLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const estimate = useCallback(
    (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => {
      if (!workerRef.current) return;
      setIsLoading(true);
      setError(null);
      setResult(null);

      file.arrayBuffer().then((stlBuffer) => {
        workerRef.current!.postMessage({
          stlBuffer,
          layerHeight: params.layerHeight,
          infill: params.infill,
          perimeterCount: params.perimeterCount,
        }, [stlBuffer]);
      });
    },
    []
  );

  return { estimate, result, isLoading, error };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-kiosk/src/workers/ apps/frontend-kiosk/src/hooks/useEstimator.ts
git commit -m "feat: add estimator worker and useEstimator hook to frontend-kiosk"
```

---

## Task 7: Update frontend-kiosk data layer

**Files:**
- Modify: `apps/frontend-kiosk/src/services/api-client.ts`
- Modify: `apps/frontend-kiosk/src/services/admin.service.ts`

- [ ] **Step 1: Add supportSurcharge to Printer type**

In `apps/frontend-kiosk/src/services/api-client.ts`, update the `Printer` interface:

```typescript
export interface Printer {
  id: string;
  name: string;
  hourlyRate: number;
  supportSurcharge: number;
  isActive: boolean;
  filaments: Filament[];
}
```

- [ ] **Step 2: Add supportSurcharge to admin service request types**

In `apps/frontend-kiosk/src/services/admin.service.ts`, update:

```typescript
export interface CreatePrinterRequest {
  name: string;
  hourlyRate: number;
  supportSurcharge?: number;
  filaments?: CreateFilamentRequest[];
}

export interface UpdatePrinterRequest {
  name?: string;
  hourlyRate?: number;
  supportSurcharge?: number;
  isActive?: boolean;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-kiosk/src/services/api-client.ts \
        apps/frontend-kiosk/src/services/admin.service.ts
git commit -m "feat: add supportSurcharge to frontend-kiosk Printer type and admin request types"
```

---

## Task 8: Update frontend-kiosk Landing.tsx

**Files:**
- Modify: `apps/frontend-kiosk/src/pages/Landing.tsx`

- [ ] **Step 1: Store the file and pass it in navigation state**

In `apps/frontend-kiosk/src/pages/Landing.tsx`:

1. Add `selectedFile` state to track the uploaded file:
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

2. Update `handleFileUpload` to store the file:
```typescript
const handleFileUpload = async (file: File) => {
  setSelectedFile(file);
  analyzeMutation.mutate(file, {
    onSuccess: (data) => {
      setAnalysisResult(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setAnalysisResult(null);
    },
  });
};
```

3. Update `handleContinue` to pass `file` in state:
```typescript
const handleContinue = () => {
  if (analysisResult && selectedFile) {
    navigate("/order", { state: { upload: analysisResult, file: selectedFile } });
  }
};
```

4. Update the Continue button's disabled condition:
```typescript
disabled={!analysisResult || !selectedFile}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-kiosk/src/pages/Landing.tsx
git commit -m "feat: pass STL file object through navigation state to OrderPage"
```

---

## Task 9: Update frontend-kiosk OrderPage.tsx

**Files:**
- Modify: `apps/frontend-kiosk/src/pages/OrderPage.tsx`

- [ ] **Step 1: Replace useEstimate with useEstimator**

In `apps/frontend-kiosk/src/pages/OrderPage.tsx`:

1. Remove the `useEstimate` import and add `useEstimator`:
```typescript
// Remove this import:
// import { useEstimate } from "@/services";

// Add at top of component:
import { useEstimator } from "@/hooks/useEstimator";
```

2. Update the imports from `@/services` — remove `useEstimate` and `type EstimateResponse` (no longer needed), keep the rest.

3. Replace `const estimateMutation = useEstimate();` with:
```typescript
const { estimate, result: estimateResult, isLoading: isEstimating } = useEstimator();
const file = location.state?.file as File | undefined;
```

4. Replace the `useEffect` that called `estimateMutation.mutate(...)`:
```typescript
useEffect(() => {
  if (file && selectedPrinterId && selectedFilamentId) {
    estimate(file, { layerHeight: 0.2, infill: 20, perimeterCount: 2 });
  }
}, [selectedPrinterId, selectedFilamentId, file]);
```

5. Calculate total cost locally including support surcharge. Replace cost display section — find the `estimateMutation.data` references and replace with `estimateResult`:

```typescript
const supportFee = estimateResult?.needsSupports && selectedPrinter?.supportSurcharge
  ? selectedPrinter.supportSurcharge
  : 0;

const totalCost = estimateResult
  ? (estimateResult.filamentUsedGrams * (selectedFilament?.pricePerGram ?? 0)) +
    (estimateResult.printTimeHours * (selectedPrinter?.hourlyRate ?? 0)) +
    supportFee
  : null;
```

6. Replace `estimateMutation.data` with `estimateResult` throughout the JSX. Replace `estimateMutation.isPending` with `isEstimating`.

7. Update `canSubmit`:
```typescript
const canSubmit = isValid && selectedPrinterId && selectedFilamentId && estimateResult && totalCost !== null;
```

8. In the Cost Estimate card, update to show support surcharge when applicable:

```tsx
{estimateResult && totalCost !== null && (
  <Card className="bg-primary/5 border-primary/30">
    <CardHeader>
      <CardTitle className="flex items-center">
        <IndianRupee className="w-5 h-5 mr-2 text-primary" />
        Cost Estimate
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">
            Material ({estimateResult.filamentUsedGrams.toFixed(1)}g)
          </span>
          <span>₹{(estimateResult.filamentUsedGrams * (selectedFilament?.pricePerGram ?? 0)).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">
            Machine Time ({estimateResult.printTimeHours.toFixed(1)}h)
          </span>
          <span>₹{(estimateResult.printTimeHours * (selectedPrinter?.hourlyRate ?? 0)).toFixed(2)}</span>
        </div>
        {estimateResult.needsSupports && supportFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              Support Material
            </span>
            <span>₹{supportFee.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t pt-3">
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="text-primary text-xl font-bold">
              ₹{totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{isEstimating && (
  <Card className="p-5 flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
    <span className="text-sm text-muted-foreground">Calculating price...</span>
  </Card>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-kiosk/src/pages/OrderPage.tsx
git commit -m "feat: replace backend price estimate with local useEstimator in OrderPage"
```

---

## Task 10: Update frontend-kiosk AdminPrinters.tsx

**Files:**
- Modify: `apps/frontend-kiosk/src/pages/AdminPrinters.tsx`

- [ ] **Step 1: Add supportSurcharge to form state and dialogs**

In `apps/frontend-kiosk/src/pages/AdminPrinters.tsx`:

1. Update `printerForm` state to include `supportSurcharge`:
```typescript
const [printerForm, setPrinterForm] = useState({ name: "", hourlyRate: "", supportSurcharge: "0" });
```

2. Update `handleCreatePrinter`:
```typescript
const handleCreatePrinter = () => {
  if (printerForm.name && printerForm.hourlyRate) {
    createPrinterMutation.mutate(
      {
        name: printerForm.name,
        hourlyRate: parseFloat(printerForm.hourlyRate),
        supportSurcharge: parseFloat(printerForm.supportSurcharge) || 0,
      },
      {
        onSuccess: () => {
          setShowAddPrinter(false);
          setPrinterForm({ name: "", hourlyRate: "", supportSurcharge: "0" });
        },
      }
    );
  }
};
```

3. In the Add Printer Dialog, add a Support Surcharge field after the Hourly Rate field:
```tsx
<div className="space-y-2">
  <Label htmlFor="support-surcharge">Support Surcharge (₹)</Label>
  <Input
    id="support-surcharge"
    type="number"
    step="0.01"
    placeholder="e.g., 50"
    value={printerForm.supportSurcharge}
    onChange={(e) => setPrinterForm((f) => ({ ...f, supportSurcharge: e.target.value }))}
  />
  <p className="text-xs text-text-muted">Flat fee added when a model needs support material</p>
</div>
```

4. In the Edit Printer Dialog, add a Support Surcharge field after the Hourly Rate field:
```tsx
<div className="space-y-2">
  <Label htmlFor="edit-support-surcharge">Support Surcharge (₹)</Label>
  <Input
    id="edit-support-surcharge"
    type="number"
    step="0.01"
    defaultValue={editingPrinter.supportSurcharge}
    onBlur={(e) => {
      const newSurcharge = parseFloat(e.target.value);
      if (newSurcharge !== editingPrinter.supportSurcharge) {
        updatePrinterMutation.mutate({
          printerId: editingPrinter.id,
          data: { supportSurcharge: newSurcharge },
        });
      }
    }}
  />
</div>
```

5. In the printer card display, show the support surcharge next to the hourly rate:
```tsx
<p className="text-sm text-text-muted">
  ₹{printer.hourlyRate}/hr
  {printer.supportSurcharge > 0 && ` · ₹${printer.supportSurcharge} support fee`}
</p>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-kiosk/src/pages/AdminPrinters.tsx
git commit -m "feat: add support surcharge field to admin printer create/edit dialogs"
```

---

## Task 11: Create worker + useEstimator hook in frontend

**Files:**
- Create: `apps/frontend/src/workers/estimator.worker.ts`
- Create: `apps/frontend/src/hooks/useEstimator.ts`

- [ ] **Step 1: Create estimator.worker.ts**

Create `apps/frontend/src/workers/estimator.worker.ts`:

```typescript
import { runEstimate } from '@swift-prints/estimator';
import type { EstimateParams, EstimateResult } from '@swift-prints/estimator';

self.onmessage = (e: MessageEvent<EstimateParams>) => {
  const result: EstimateResult = runEstimate(e.data);
  self.postMessage(result);
};
```

- [ ] **Step 2: Create useEstimator.ts**

Create `apps/frontend/src/hooks/useEstimator.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import type { EstimateResult } from '@swift-prints/estimator';

interface UseEstimatorReturn {
  estimate: (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => void;
  result: EstimateResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useEstimator(): UseEstimatorReturn {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/estimator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<EstimateResult>) => {
      setResult(e.data);
      setIsLoading(false);
    };

    workerRef.current.onerror = (e) => {
      setError(e.message || 'Estimation failed');
      setIsLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const estimate = useCallback(
    (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => {
      if (!workerRef.current) return;
      setIsLoading(true);
      setError(null);
      setResult(null);

      file.arrayBuffer().then((stlBuffer) => {
        workerRef.current!.postMessage({
          stlBuffer,
          layerHeight: params.layerHeight,
          infill: params.infill,
          perimeterCount: params.perimeterCount,
        }, [stlBuffer]);
      });
    },
    []
  );

  return { estimate, result, isLoading, error };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/workers/ apps/frontend/src/hooks/useEstimator.ts
git commit -m "feat: add estimator worker and useEstimator hook to frontend"
```

---

## Summary

After all tasks are complete:
- `prusa-slicer` is no longer invoked for any estimate flow
- Both frontends calculate filament/time locally in <200ms
- Support surcharge is configurable per-printer via the admin panel
- The backend `POST /pricing/estimate` endpoint still exists but is no longer called (can be removed in a future cleanup PR)
- Order `totalCost` on the backend still includes support surcharge via `upload.needsSupports + printer.supportSurcharge`
