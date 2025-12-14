import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  /**
   * POST /uploads/analyze
   * Upload and analyze an STL file
   */
  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, callback) => {
        if (
          !file.originalname.toLowerCase().endsWith('.stl') &&
          file.mimetype !== 'application/sla' &&
          file.mimetype !== 'model/stl'
        ) {
          callback(
            new BadRequestException('Only STL files are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async analyzeUpload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadsService.analyzeAndStore(file);
  }

  /**
   * GET /uploads/:uploadId
   * Get upload details
   */
  @Get(':uploadId')
  async getUpload(@Param('uploadId') uploadId: string) {
    const upload = await this.uploadsService.getById(uploadId);
    return {
      uploadId: upload.id,
      filename: upload.filename,
      volumeMm3: upload.volumeMm3,
      boundingBox: {
        x: upload.boundingBoxX,
        y: upload.boundingBoxY,
        z: upload.boundingBoxZ,
      },
      needsSupports: upload.needsSupports,
      baseEstimate: {
        filamentGrams: upload.baseFilamentEstimateG,
        printTimeHours: upload.basePrintTimeHours,
      },
      createdAt: upload.createdAt,
    };
  }

  /**
   * GET /uploads/:uploadId/download
   * Get signed download URL for the STL file
   */
  @Get(':uploadId/download')
  async getDownloadUrl(@Param('uploadId') uploadId: string) {
    const url = await this.uploadsService.getDownloadUrl(uploadId);
    return { downloadUrl: url };
  }
}
