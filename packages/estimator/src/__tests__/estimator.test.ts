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
