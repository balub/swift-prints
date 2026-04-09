import { parseStl } from './stl-parser';

// Constants matching PrusaSlicer defaults
const EXTRUSION_WIDTH_MM = 0.45;   // slightly wider than nozzle for better adhesion
const TOP_BOTTOM_LAYERS = 4;        // PrusaSlicer default for 0.2 mm layer height
const PRINT_SPEED_MM_PER_SEC = 45;
const PLA_DENSITY_G_PER_MM3 = 0.00124;
const OVERHEAD_FACTOR = 1.3;

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

  // Average cross-section area (proxy for top/bottom surface area)
  const avgCrossSection = boundingBox.z > 0 ? volumeMm3 / boundingBox.z : 0;

  // Lateral surface area: subtract estimated top + bottom from total
  // Horizontal surfaces don't contribute to perimeter paths the same way vertical walls do
  const lateralSurfaceArea = Math.max(0, surfaceAreaMm2 - 2 * avgCrossSection);

  // Perimeter volume: lateral_SA × extrusion_width × count
  // Derivation: path_length = lateral_SA / layerHeight; volume = path × width × layerHeight → layerHeight cancels
  const perimeterVolume = lateralSurfaceArea * EXTRUSION_WIDTH_MM * perimeterCount;

  // Top/bottom solid layers (both sides), using layerHeight for actual layer thickness
  const topBottomVolume = avgCrossSection * TOP_BOTTOM_LAYERS * layerHeight * 2;

  // Cap shell at model volume to avoid overcounting for very thin/small models
  const shellVolume = Math.min(perimeterVolume + topBottomVolume, volumeMm3);

  // Infill fills only interior space (not already occupied by shells)
  const interiorVolume = Math.max(0, volumeMm3 - shellVolume);
  const infillVolume = interiorVolume * (infill / 100);

  const supportVolume = needsSupports ? volumeMm3 * 0.15 : 0;

  const totalFilamentVolumeMm3 = shellVolume + infillVolume + supportVolume;

  const filamentUsedGrams = Math.round(totalFilamentVolumeMm3 * PLA_DENSITY_G_PER_MM3 * 100) / 100;

  // Print time: nozzle path length = filament volume / (extrusion_width × layer_height)
  const nozzlePathMm = totalFilamentVolumeMm3 / (EXTRUSION_WIDTH_MM * layerHeight);
  const printTimeSecs = (nozzlePathMm / PRINT_SPEED_MM_PER_SEC) * OVERHEAD_FACTOR;
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
