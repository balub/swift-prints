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

  @ApiPropertyOptional({ description: 'Whether the printer is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

