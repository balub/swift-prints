import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StlAnalyzerService } from './stl-analyzer.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private stlAnalyzer: StlAnalyzerService,
  ) {}

  /**
   * Analyze and store an uploaded STL file
   */
  async analyzeAndStore(
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    const uploadId = uuidv4();
    const stlKey = this.storage.getUploadStlKey(uploadId);

    this.logger.log(`Processing upload: ${file.originalname} (${uploadId})`);

    // Analyze STL geometry
    const analysis = await this.stlAnalyzer.analyze(file.buffer);

    // Upload to S3/MinIO
    await this.storage.uploadFile(stlKey, file.buffer, 'application/sla');

    // Store metadata in database
    const upload = await this.prisma.upload.create({
      data: {
        id: uploadId,
        filename: file.originalname,
        stlKey,
        volumeMm3: analysis.volumeMm3,
        boundingBoxX: analysis.boundingBox.x,
        boundingBoxY: analysis.boundingBox.y,
        boundingBoxZ: analysis.boundingBox.z,
        needsSupports: analysis.needsSupports,
        baseFilamentEstimateG: analysis.baseFilamentEstimateG,
        basePrintTimeHours: analysis.basePrintTimeHours,
      },
    });

    this.logger.log(`Upload stored: ${uploadId}`);

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
    };
  }

  /**
   * Get an upload by ID
   */
  async getById(uploadId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new NotFoundException(`Upload ${uploadId} not found`);
    }

    return upload;
  }

  /**
   * Get signed download URL for an upload's STL file
   */
  async getDownloadUrl(uploadId: string): Promise<string> {
    const upload = await this.getById(uploadId);
    return this.storage.getSignedDownloadUrl(upload.stlKey);
  }

  /**
   * Download the STL file buffer for an upload
   */
  async downloadStl(uploadId: string): Promise<Buffer> {
    const upload = await this.getById(uploadId);
    return this.storage.downloadFile(upload.stlKey);
  }
}

