import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 游客服务 — 免登录免费对话限流
 *
 * 策略：
 * - 以 IP + User-Agent 哈希作为游客标识
 * - 默认允许 10 条免费消息（可配置 GUEST_FREE_MESSAGES）
 * - 计数存 Redis，TTL 24h（跨天重置）
 * - Redis 不可用时降级到进程内 Map
 */
@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);
  private redis: Redis | null = null;
  private readonly freeLimit: number;
  private readonly ttlSeconds = 86400; // 24h

  // 降级：进程内计数
  private localCounts = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {
    this.freeLimit = parseInt(this.config.get('GUEST_FREE_MESSAGES', '10'), 10);
  }

  async onModuleInit() {
    try {
      this.redis = new Redis(this.config.get('REDIS_URL', 'redis://localhost:6379'), {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      await this.redis.connect();
      this.logger.log('Guest rate limiter connected to Redis');
    } catch {
      this.logger.warn('Redis unavailable, using in-process guest counter');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
    this.localCounts.clear();
  }

  /**
   * 生成游客指纹
   */
  fingerprint(ip: string, userAgent: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 32);
  }

  /**
   * 检查游客是否还能发送消息
   * @returns 剩余条数
   */
  async checkAndIncrement(fp: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const key = `guest:${fp}`;
    let count = 0;

    if (this.redis) {
      try {
        count = await this.redis.incr(key);
        if (count === 1) {
          await this.redis.expire(key, this.ttlSeconds);
        }
      } catch (error) {
        this.logger.warn(`Redis INCR failed: ${error}`);
        count = this.localIncr(fp);
      }
    } else {
      count = this.localIncr(fp);
    }

    if (count > this.freeLimit) {
      return { allowed: false, remaining: 0, limit: this.freeLimit };
    }

    return { allowed: true, remaining: this.freeLimit - count, limit: this.freeLimit };
  }

  /**
   * 查询剩余条数（不增加计数）
   */
  async getRemaining(fp: string): Promise<{ remaining: number; limit: number }> {
    const key = `guest:${fp}`;
    let count = 0;

    if (this.redis) {
      try {
        const val = await this.redis.get(key);
        count = val ? parseInt(val, 10) : 0;
      } catch {
        count = this.localGet(fp);
      }
    } else {
      count = this.localGet(fp);
    }

    return { remaining: Math.max(0, this.freeLimit - count), limit: this.freeLimit };
  }

  private localIncr(fp: string): number {
    this.cleanupLocal();
    const entry = this.localCounts.get(fp);
    if (!entry || Date.now() > entry.expiresAt) {
      this.localCounts.set(fp, { count: 1, expiresAt: Date.now() + this.ttlSeconds * 1000 });
      return 1;
    }
    entry.count++;
    return entry.count;
  }

  private localGet(fp: string): number {
    this.cleanupLocal();
    const entry = this.localCounts.get(fp);
    if (!entry || Date.now() > entry.expiresAt) return 0;
    return entry.count;
  }

  private cleanupLocal() {
    const now = Date.now();
    for (const [k, v] of this.localCounts) {
      if (now > v.expiresAt) this.localCounts.delete(k);
    }
  }
}
