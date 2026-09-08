import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 多级缓存管理器 - 实现最大缓存命中率原则
 * 
 * 缓存层次:
 *   L1: 进程内 LRU 缓存 (微秒级，容量小)
 *   L2: Redis 分布式缓存 (毫秒级，容量大)
 *   L3: PostgreSQL 数据库 (十毫秒级，持久化)
 * 
 * 缓存策略:
 *   - Cache-Aside: 先查缓存，未命中则查 DB 并回填
 *   - Write-Through: 写操作同时更新缓存
 *   - TTL 分层: 热数据长 TTL，冷数据短 TTL
 *   - 主动失效: 数据变更时主动清除相关缓存
 *   - 请求合并: 相同 key 的并发请求合并为一次 DB 查询
 */
@Injectable()
export class CacheManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheManager.name);
  private redis: Redis | null = null;
  
  // L1: 进程内 LRU 缓存
  private l1Cache = new Map<string, CacheEntry>();
  private readonly l1MaxSize: number;
  private readonly l1DefaultTTL: number;
  
  // 请求合并 - 防止缓存击穿
  private pendingRequests = new Map<string, Promise<any>>();
  
  // 缓存统计
  private stats = { l1Hits: 0, l1Misses: 0, l2Hits: 0, l2Misses: 0, dbQueries: 0 };

  constructor(private readonly config: ConfigService) {
    this.l1MaxSize = this.config.get('CACHE_L1_MAX_SIZE', 1000);
    this.l1DefaultTTL = this.config.get('CACHE_L1_TTL_MS', 30000); // 30s
  }

  async onModuleInit() {
    // 连接 Redis
    try {
      this.redis = new Redis(this.config.get('REDIS_URL', 'redis://localhost:6379'), {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });
      await this.redis.connect();
      this.logger.log('Redis cache connected');
    } catch (error) {
      this.logger.warn('Redis unavailable, L1 cache only');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.l1Cache.clear();
    this.pendingRequests.clear();
  }

  // ==================== 核心缓存操作 ====================

  /**
   * 多级缓存读取 (L1 → L2 → L3)
   * 
   * 最大缓存命中率原则:
   * 1. 优先命中 L1 (进程内，零网络开销)
   * 2. 其次命中 L2 (Redis，毫秒级)
   * 3. 最后查 L3 (DB)，并回填 L1 + L2
   */
  async get<T>(key: string): Promise<T | null> {
    // L1 查询
    const l1Result = this.l1Get<T>(key);
    if (l1Result !== null) {
      this.stats.l1Hits++;
      return l1Result;
    }
    this.stats.l1Misses++;

    // L2 查询
    if (this.redis) {
      try {
        const l2Result = await this.redis.get(key);
        if (l2Result) {
          this.stats.l2Hits++;
          const value = JSON.parse(l2Result) as T;
          // 回填 L1
          this.l1Set(key, value);
          return value;
        }
      } catch (error) {
        this.logger.warn(Redis GET error: );
      }
    }
    this.stats.l2Misses++;

    return null;
  }

  /**
   * 多级缓存写入 (L1 + L2 同时写入)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    // 写入 L1
    this.l1Set(key, value, ttlSeconds ? ttlSeconds * 1000 : undefined);

    // 写入 L2
    if (this.redis) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (error) {
        this.logger.warn(Redis SET error: );
      }
    }
  }

  /**
   * 缓存删除 (L1 + L2 同时删除)
   */
  async del(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        this.logger.warn(Redis DEL error: );
      }
    }
  }

  /**
   * 按模式批量删除缓存
   */
  async delPattern(pattern: string): Promise<void> {
    // 清除 L1 匹配项
    for (const key of this.l1Cache.keys()) {
      if (this.matchPattern(key, pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // 清除 L2 匹配项
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        this.logger.warn(Redis DEL pattern error: );
      }
    }
  }

  /**
   * 缓存或加载 (Cache-Aside Pattern + 请求合并)
   * 
   * 防止缓存击穿: 相同 key 的并发请求只查一次 DB
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // 先查缓存
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // ★ 请求合并: 如果已有相同 key 的加载请求，等待其完成
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 创建加载请求
    const loadPromise = (async () => {
      try {
        this.stats.dbQueries++;
        const value = await loader();
        
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttlSeconds);
        }
        
        return value;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * 批量读取 (Pipeline 优化)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = new Array(keys.length).fill(null);
    const missingIndices: number[] = [];
    const missingKeys: string[] = [];

    // L1 批量查询
    for (let i = 0; i < keys.length; i++) {
      const l1Result = this.l1Get<T>(keys[i]);
      if (l1Result !== null) {
        results[i] = l1Result;
        this.stats.l1Hits++;
      } else {
        missingIndices.push(i);
        missingKeys.push(keys[i]);
        this.stats.l1Misses++;
      }
    }

    // L2 批量查询 (Pipeline)
    if (missingKeys.length > 0 && this.redis) {
      try {
        const l2Results = await this.redis.mget(...missingKeys);
        for (let i = 0; i < l2Results.length; i++) {
          if (l2Results[i]) {
            const value = JSON.parse(l2Results[i]) as T;
            results[missingIndices[i]] = value;
            this.l1Set(missingKeys[i], value); // 回填 L1
            this.stats.l2Hits++;
          } else {
            this.stats.l2Misses++;
          }
        }
      } catch (error) {
        this.logger.warn(Redis MGET error: );
      }
    }

    return results;
  }

  /**
   * 批量写入 (Pipeline 优化)
   */
  async mset(entries: { key: string; value: any; ttl?: number }[]): Promise<void> {
    // L1 批量写入
    for (const entry of entries) {
      this.l1Set(entry.key, entry.value, entry.ttl ? entry.ttl * 1000 : undefined);
    }

    // L2 批量写入 (Pipeline)
    if (this.redis && entries.length > 0) {
      try {
        const pipeline = this.redis.pipeline();
        for (const entry of entries) {
          const serialized = JSON.stringify(entry.value);
          if (entry.ttl) {
            pipeline.setex(entry.key, entry.ttl, serialized);
          } else {
            pipeline.set(entry.key, serialized);
          }
        }
        await pipeline.exec();
      } catch (error) {
        this.logger.warn(Redis MSET error: );
      }
    }
  }

  // ==================== L1 进程内缓存 ====================

  private l1Get<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;

    // 检查过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.l1Cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private l1Set(key: string, value: any, ttlMs?: number): void {
    // LRU 淘汰
    if (this.l1Cache.size >= this.l1MaxSize && !this.l1Cache.has(key)) {
      this.evictL1();
    }

    this.l1Cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : Date.now() + this.l1DefaultTTL,
    });
  }

  /**
   * LRU 淘汰: 删除最久未使用的条目
   */
  private evictL1(): void {
    // Map 保持插入顺序，第一个是最旧的
    const firstKey = this.l1Cache.keys().next().value;
    if (firstKey) {
      this.l1Cache.delete(firstKey);
    }
  }

  // ==================== 缓存统计 ====================

  getStats() {
    const total = this.stats.l1Hits + this.stats.l1Misses;
    return {
      ...this.stats,
      l1HitRate: total > 0 ? (this.stats.l1Hits / total * 100).toFixed(1) + '%' : 'N/A',
      l2HitRate: this.stats.l2Hits + this.stats.l2Misses > 0
        ? (this.stats.l2Hits / (this.stats.l2Hits + this.stats.l2Misses) * 100).toFixed(1) + '%'
        : 'N/A',
      overallHitRate: total > 0
        ? ((this.stats.l1Hits + this.stats.l2Hits) / total * 100).toFixed(1) + '%'
        : 'N/A',
      l1Size: this.l1Cache.size,
      pendingRequests: this.pendingRequests.size,
    };
  }

  // ==================== 工具方法 ====================

  private matchPattern(key: string, pattern: string): boolean {
    // 简单的通配符匹配 (* 匹配任意字符)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}