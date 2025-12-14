import { ApiProperty } from '@nestjs/swagger';

class CostBreakdownDto {
  @ApiProperty({ description: 'Material cost' })
  material: number;

  @ApiProperty({ description: 'Machine time cost' })
  machineTime: number;

  @ApiProperty({ description: 'Total cost' })
  total: number;
}

export class EstimateResponseDto {
  @ApiProperty({ description: 'Filament usage in grams' })
  filamentUsedGrams: number;

  @ApiProperty({ description: 'Print time in hours' })
  printTimeHours: number;

  @ApiProperty({ description: 'Cost breakdown', type: CostBreakdownDto })
  costBreakdown: CostBreakdownDto;

  @ApiProperty({ description: 'Printer name' })
  printerName: string;

  @ApiProperty({ description: 'Filament name' })
  filamentName: string;
}

