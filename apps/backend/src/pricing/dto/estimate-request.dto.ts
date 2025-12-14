import {
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EstimateRequestDto {
  @ApiProperty({ description: 'Upload ID from /uploads/analyze', format: 'uuid' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Printer ID', format: 'uuid' })
  @IsString()
  printerId: string;

  @ApiProperty({ description: 'Filament ID', format: 'uuid' })
  @IsString()
  filamentId: string;

  @ApiPropertyOptional({
    description: 'Layer height in mm',
    minimum: 0.08,
    maximum: 0.4,
    default: 0.2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.08)
  @Max(0.4)
  layerHeight?: number = 0.2;

  @ApiPropertyOptional({
    description: 'Infill percentage',
    minimum: 0,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  infill?: number = 20;

  @ApiPropertyOptional({
    description: 'Support generation mode',
    enum: ['none', 'auto', 'everywhere'],
    default: 'auto',
  })
  @IsOptional()
  @IsIn(['none', 'auto', 'everywhere'])
  supports?: 'none' | 'auto' | 'everywhere' = 'auto';
}

