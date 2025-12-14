import { ApiProperty } from '@nestjs/swagger';

class BoundingBoxDto {
  @ApiProperty({ description: 'Width in mm' })
  x: number;

  @ApiProperty({ description: 'Depth in mm' })
  y: number;

  @ApiProperty({ description: 'Height in mm' })
  z: number;
}

class BaseEstimateDto {
  @ApiProperty({ description: 'Estimated filament usage in grams' })
  filamentGrams: number;

  @ApiProperty({ description: 'Estimated print time in hours' })
  printTimeHours: number;
}

export class UploadResponseDto {
  @ApiProperty({ description: 'Unique upload identifier', format: 'uuid' })
  uploadId: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Volume in cubic millimeters' })
  volumeMm3: number;

  @ApiProperty({ description: 'Bounding box dimensions', type: BoundingBoxDto })
  boundingBox: BoundingBoxDto;

  @ApiProperty({ description: 'Whether the model likely needs supports' })
  needsSupports: boolean;

  @ApiProperty({ description: 'Base print estimate', type: BaseEstimateDto })
  baseEstimate: BaseEstimateDto;

  @ApiProperty({ description: 'Upload timestamp', required: false })
  createdAt?: Date;
}

