import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdatePrinterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

