import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

/**
 * 文件存储服务 - MinIO (S3 兼容)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get('MINIO_PORT', '9000')),
      useSSL: false,
      accessKey: this.config.get('MINIO_ACCESS_KEY', 'hermes'),
      secretKey: this.config.get('MINIO_SECRET_KEY', 'hermes_minio_2026'),
    });
    this.bucket = this.config.get('MINIO_BUCKET', 'hermes-chat');
    this.ensureBucket();
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`创建存储桶: ${this.bucket}`);
    }
  }

  async upload(file: Buffer, filename: string, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, filename, file, file.length, {
      'Content-Type': contentType,
    });
    return `${this.config.get('MINIO_ENDPOINT', 'localhost')}:${this.config.get('MINIO_PORT', '9000')}/${this.bucket}/${filename}`;
  }

  async getUrl(filename: string): Promise<string> {
    return this.client.presignedUrl('GET', this.bucket, filename);
  }
}