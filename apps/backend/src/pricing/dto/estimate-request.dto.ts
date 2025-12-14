import {
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class EstimateRequestDto {
  @IsString()
  uploadId: string;

  @IsString()
  printerId: string;

  @IsString()
  filamentId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.08)
  @Max(0.4)
  layerHeight?: number = 0.2;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  infill?: number = 20;

  @IsOptional()
  @IsIn(['none', 'auto', 'everywhere'])
  supports?: 'none' | 'auto' | 'everywhere' = 'auto';
}

