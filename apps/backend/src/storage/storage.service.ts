import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly s3ClientPublic: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    // Public endpoint for browser-accessible URLs (defaults to localhost:9000 for dev)
    this.publicEndpoint = this.configService.get<string>(
      'S3_PUBLIC_ENDPOINT',
      'http://localhost:9000',
    );

    this.bucket = this.configService.get<string>('S3_BUCKET', 'swiftprints');

    // Internal S3 client for uploads/downloads within Docker network
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey || 'minio',
        secretAccessKey: secretKey || 'minio123',
      },
      forcePathStyle: true, // Required for MinIO
    });

    // Public S3 client for generating browser-accessible signed URLs
    this.s3ClientPublic = new S3Client({
      endpoint: this.publicEndpoint,
      region,
      credentials: {
        accessKeyId: accessKey || 'minio',
        secretAccessKey: secretKey || 'minio123',
      },
      forcePathStyle: true,
    });

    this.logger.log(`Storage initialized with endpoint: ${endpoint}`);
    this.logger.log(`Public endpoint for downloads: ${this.publicEndpoint}`);
  }

  /**
   * Upload a file to S3/MinIO
   */
  async uploadFile(
    key: string,
    body: Buffer | Readable,
    contentType?: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    this.logger.log(`Uploaded file: ${key}`);

    return key;
  }

  /**
   * Get a signed URL for downloading a file (browser-accessible)
   */
  async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Use public S3 client to generate browser-accessible URLs
    const url = await getSignedUrl(this.s3ClientPublic, command, { expiresIn });
    return url;
  }

  /**
   * Get a signed URL for uploading a file
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Download a file from S3/MinIO
   */
  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;

    return this.streamToBuffer(stream);
  }

  /**
   * Delete a file from S3/MinIO
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`Deleted file: ${key}`);
  }

  /**
   * Generate the storage key for an upload STL file
   */
  getUploadStlKey(uploadId: string): string {
    return `uploads/${uploadId}/model.stl`;
  }

  /**
   * Generate the storage key for an order's G-code file
   */
  getOrderGcodeKey(orderId: string): string {
    return `orders/${orderId}/output.gcode`;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}

