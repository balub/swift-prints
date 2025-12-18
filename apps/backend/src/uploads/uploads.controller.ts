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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Upload and analyze STL file',
    description:
      'Upload an STL file for analysis. Returns volume, bounding box, and base print estimates.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'STL file to upload (max 50MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded and analyzed successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or no file uploaded',
  })
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

  @Get(':uploadId')
  @ApiOperation({
    summary: 'Get upload details',
    description: 'Retrieve details of a previously uploaded STL file',
  })
  @ApiParam({ name: 'uploadId', description: 'Upload ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Upload details',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Upload not found' })
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

  @Get(':uploadId/download')
  @ApiOperation({
    summary: 'Get download URL',
    description: 'Get a signed URL to download the STL file',
  })
  @ApiParam({ name: 'uploadId', description: 'Upload ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Download URL' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  async getDownloadUrl(@Param('uploadId') uploadId: string) {
    const url = await this.uploadsService.getDownloadUrl(uploadId);
    return { downloadUrl: url };
  }
}
