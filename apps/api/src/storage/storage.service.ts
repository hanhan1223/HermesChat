import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuid } from 'uuid';

/**
 * 文件存储服务 — MinIO (S3 兼容)
 *
 * 目录结构（会话级隔离）:
 *   users/{userId}/conversations/{conversationId}/uploads/{filename}     — 用户上传
 *   users/{userId}/conversations/{conversationId}/generated/{filename}   — 系统生成
 *   users/{userId}/shared/{filename}                                     — 跨会话共享
 *
 * 特性:
 *   - 会话级隔离：每个对话的文件独立存储，互不可见
 *   - 预签名 URL：生成临时下载/预览链接（默认 1 小时有效）
 *   - 系统生成文件：代码执行结果、导出文件等存入对象存储
 *   - 文件生命周期管理：支持过期清理
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly presignExpiry: number;

  constructor(private readonly config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get('MINIO_PORT', '9000'), 10),
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY', 'hermes'),
      secretKey: this.config.get('MINIO_SECRET_KEY', 'hermes_minio_2026'),
    });
    this.bucket = this.config.get('MINIO_BUCKET', 'hermes-chat');
    this.presignExpiry = parseInt(this.config.get('MINIO_PRESIGN_EXPIRY', '3600'), 10);
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`存储桶已创建: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.warn(`存储桶检查失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ==================== 用户上传文件（会话隔离）====================

  /**
   * 上传用户文件（会话级隔离）
   *
   * @param params 上传参数
   * @returns 文件元信息（含预签名下载 URL）
   */
  async uploadUserFile(params: {
    userId: string;
    conversationId: string;
    file: Buffer;
    filename: string;
    contentType: string;
  }): Promise<StoredFile> {
    const { userId, conversationId, file, filename, contentType } = params;

    // 生成隔离路径：users/{userId}/conversations/{conversationId}/uploads/{uuid}-{filename}
    const sanitizedName = this.sanitizeFilename(filename);
    const uniqueName = `${uuid().substring(0, 8)}-${sanitizedName}`;
    const objectPath = `users/${userId}/conversations/${conversationId}/uploads/${uniqueName}`;

    await this.client.putObject(this.bucket, objectPath, file, file.length, {
      'Content-Type': contentType,
      'X-User-Id': userId,
      'X-Conversation-Id': conversationId,
      'X-Original-Name': encodeURIComponent(filename),
    });

    const downloadUrl = await this.getPresignedUrl(objectPath);

    this.logger.log(`文件已上传: ${objectPath} (${file.length} bytes)`);

    return {
      objectPath,
      filename,
      size: file.length,
      contentType,
      downloadUrl,
      uploadedAt: new Date(),
    };
  }

  /**
   * 上传系统生成的文件（会话级隔离）
   *
   * 用于：代码执行结果、导出文件、Agent 生成的文件等
   */
  async uploadGeneratedFile(params: {
    userId: string;
    conversationId: string;
    file: Buffer;
    filename: string;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<StoredFile> {
    const { userId, conversationId, file, filename, contentType, metadata } = params;

    const sanitizedName = this.sanitizeFilename(filename);
    const uniqueName = `${uuid().substring(0, 8)}-${sanitizedName}`;
    const objectPath = `users/${userId}/conversations/${conversationId}/generated/${uniqueName}`;

    await this.client.putObject(this.bucket, objectPath, file, file.length, {
      'Content-Type': contentType,
      'X-User-Id': userId,
      'X-Conversation-Id': conversationId,
      'X-Original-Name': encodeURIComponent(filename),
      'X-Generated': 'true',
      ...Object.entries(metadata || {}).reduce((acc, [k, v]) => ({ ...acc, [`X-Meta-${k}`]: v }), {}),
    });

    const downloadUrl = await this.getPresignedUrl(objectPath);

    this.logger.log(`系统文件已生成: ${objectPath} (${file.length} bytes)`);

    return {
      objectPath,
      filename,
      size: file.length,
      contentType,
      downloadUrl,
      uploadedAt: new Date(),
    };
  }

  // ==================== 预签名 URL ====================

  /**
   * 生成预签名下载 URL（默认 1 小时有效）
   */
  async getPresignedUrl(objectPath: string, expirySeconds?: number): Promise<string> {
    try {
      return await this.client.presignedUrl(
        'GET',
        this.bucket,
        objectPath,
        expirySeconds || this.presignExpiry,
      );
    } catch (error) {
      this.logger.error(`生成预签名 URL 失败: ${objectPath} — ${error instanceof Error ? error.message : error}`);
      throw new Error('生成下载链接失败');
    }
  }

  /**
   * 生成预签名上传 URL（客户端直传）
   */
  async getPresignedUploadUrl(params: {
    userId: string;
    conversationId: string;
    filename: string;
    contentType: string;
    expirySeconds?: number;
  }): Promise<{ uploadUrl: string; objectPath: string }> {
    const sanitizedName = this.sanitizeFilename(params.filename);
    const uniqueName = `${uuid().substring(0, 8)}-${sanitizedName}`;
    const objectPath = `users/${params.userId}/conversations/${params.conversationId}/uploads/${uniqueName}`;

    const uploadUrl = await this.client.presignedPutObject(
      this.bucket,
      objectPath,
      params.expirySeconds || this.presignExpiry,
    );

    return { uploadUrl, objectPath };
  }

  // ==================== 文件管理 ====================

  /**
   * 列出会话中的所有文件
   */
  async listConversationFiles(userId: string, conversationId: string): Promise<StoredFile[]> {
    const prefix = `users/${userId}/conversations/${conversationId}/`;
    const objects: StoredFile[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);
      stream.on('data', async (obj) => {
        if (obj.name) {
          try {
            const stat = await this.client.statObject(this.bucket, obj.name);
            const isGenerated = stat.metaData['x-generated'] === 'true';
            const originalName = decodeURIComponent(
              stat.metaData['x-original-name'] || obj.name.split('/').pop() || '',
            );

            objects.push({
              objectPath: obj.name,
              filename: originalName,
              size: obj.size || 0,
              contentType: stat.metaData['content-type'] || 'application/octet-stream',
              downloadUrl: await this.getPresignedUrl(obj.name),
              uploadedAt: obj.lastModified || new Date(),
              isGenerated,
            });
          } catch {
            // 跳过无法读取的对象
          }
        }
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(objectPath: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectPath);
    this.logger.log(`文件已删除: ${objectPath}`);
  }

  /**
   * 删除会话的所有文件
   */
  async deleteConversationFiles(userId: string, conversationId: string): Promise<number> {
    const prefix = `users/${userId}/conversations/${conversationId}/`;
    let count = 0;

    return new Promise((resolve, reject) => {
      const stream = this.client.listObjectsV2(this.bucket, prefix, true);
      const toDelete: string[] = [];

      stream.on('data', (obj) => {
        if (obj.name) toDelete.push(obj.name);
      });
      stream.on('end', async () => {
        for (const path of toDelete) {
          try {
            await this.client.removeObject(this.bucket, path);
            count++;
          } catch (error) {
            this.logger.warn(`删除文件失败: ${path}`);
          }
        }
        this.logger.log(`会话文件已清理: ${conversationId} (${count} 个文件)`);
        resolve(count);
      });
      stream.on('error', reject);
    });
  }

  /**
   * 获取文件内容（读取到内存）
   */
  async getFileContent(objectPath: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectPath);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // ==================== 私有方法 ====================

  /**
   * 清理文件名，防止路径注入
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\.\.+/g, '.')
      .substring(0, 200);
  }
}

// ==================== 类型定义 ====================

export interface StoredFile {
  objectPath: string;
  filename: string;
  size: number;
  contentType: string;
  downloadUrl: string;
  uploadedAt: Date;
  isGenerated?: boolean;
}
