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
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY', 'test');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY', 'test');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');

    this.bucket = this.configService.get<string>('S3_BUCKET', 'swiftprints');

    this.s3Client = new S3Client({
      endpoint: endpoint || undefined, // LocalStack needs endpoint, AWS S3 uses default
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: !!endpoint, // Use path-style for LocalStack, virtual-hosted for AWS S3
    });

    const storageType = endpoint ? 'LocalStack' : 'AWS S3';
    this.logger.log(
      `Storage initialized: ${storageType} (${endpoint || region})`,
    );
  }

  /**
   * Upload a file to S3
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

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    // For LocalStack, replace internal endpoint with public endpoint if configured
    const publicEndpoint = this.configService.get<string>('S3_PUBLIC_ENDPOINT');
    const internalEndpoint = this.configService.get<string>('S3_ENDPOINT');

    if (publicEndpoint && internalEndpoint) {
      try {
        const urlObj = new URL(url);
        const internalUrlObj = new URL(internalEndpoint);
        const publicUrlObj = new URL(publicEndpoint);

        // Replace host if it matches the internal endpoint
        if (
          urlObj.hostname === internalUrlObj.hostname ||
          urlObj.host === internalUrlObj.host
        ) {
          urlObj.host = publicUrlObj.host;
          urlObj.protocol = publicUrlObj.protocol;
          return urlObj.toString();
        }
      } catch (error) {
        this.logger.warn(`Failed to replace endpoint in URL: ${error.message}`);
      }
    }

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

    // For LocalStack, replace internal endpoint with public endpoint if configured
    const publicEndpoint = this.configService.get<string>('S3_PUBLIC_ENDPOINT');
    const internalEndpoint = this.configService.get<string>('S3_ENDPOINT');

    if (publicEndpoint && internalEndpoint) {
      try {
        const urlObj = new URL(url);
        const internalUrlObj = new URL(internalEndpoint);
        const publicUrlObj = new URL(publicEndpoint);

        // Replace host if it matches the internal endpoint
        if (
          urlObj.hostname === internalUrlObj.hostname ||
          urlObj.host === internalUrlObj.host
        ) {
          urlObj.host = publicUrlObj.host;
          urlObj.protocol = publicUrlObj.protocol;
          return urlObj.toString();
        }
      } catch (error) {
        this.logger.warn(`Failed to replace endpoint in URL: ${error.message}`);
      }
    }

    return url;
  }

  /**
   * Download a file from S3
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
   * Delete a file from S3
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
