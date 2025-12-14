export class UploadResponseDto {
  uploadId: string;
  filename: string;
  volumeMm3: number;
  boundingBox: {
    x: number;
    y: number;
    z: number;
  };
  needsSupports: boolean;
  baseEstimate: {
    filamentGrams: number;
    printTimeHours: number;
  };
}

