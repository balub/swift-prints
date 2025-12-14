import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilamentDto {
  @IsString()
  filamentType: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  pricePerGram: number;
}

export class CreatePrinterDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilamentDto)
  filaments?: FilamentDto[];
}

