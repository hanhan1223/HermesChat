import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';

/**
 * API Key 管理服务 — Dify 式 API Key
 *
 * 安全策略:
 * 1. Key 只在创建时返回一次明文
 * 2. 数据库只存 SHA-256 哈希
 * 3. 前缀用于 UI 展示（sk-xxxxxxxx...）
 * 4. 支持过期时间 + 启用/禁用
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建 API Key
   * @returns 明文 Key（仅此一次）
   */
  async create(params: {
    userId: string;
    name: string;
    expiresInDays?: number;
  }): Promise<{ id: string; key: string; prefix: string; expiresAt: Date | null }> {
    // 生成随机 Key
    const rawKey = `sk-${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12) + '...';

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 86400000)
      : null;

    const record = await this.prisma.apiKey.create({
      data: {
        id: uuid().replace(/-/g, ''),
        userId: params.userId,
        name: params.name,
        keyHash,
        keyPrefix,
        expiresAt,
      },
    });

    this.logger.log(`API Key created: ${params.name} for user ${params.userId}`);

    return {
      id: record.id,
      key: rawKey, // 明文只返回这一次
      prefix: keyPrefix,
      expiresAt,
    };
  }

  /**
   * 列出用户的 API Key（不含明文）
   */
  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });
    return keys;
  }

  /**
   * 验证 API Key
   */
  async validate(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
    const keyHash = this.hashKey(rawKey);
    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!record || !record.isActive) return null;

    // 检查过期
    if (record.expiresAt && record.expiresAt < new Date()) return null;

    // 更新最后使用时间（异步，不阻塞）
    this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return { userId: record.userId, keyId: record.id };
  }

  /**
   * 吊销 API Key
   */
  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.apiKey.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  /**
   * 启用/禁用
   */
  async toggle(id: string, userId: string, isActive: boolean): Promise<boolean> {
    const result = await this.prisma.apiKey.updateMany({
      where: { id, userId },
      data: { isActive },
    });
    return result.count > 0;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
