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

