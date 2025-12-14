export class EstimateResponseDto {
  filamentUsedGrams: number;
  printTimeHours: number;
  costBreakdown: {
    material: number;
    machineTime: number;
    total: number;
  };
  printerName: string;
  filamentName: string;
}

