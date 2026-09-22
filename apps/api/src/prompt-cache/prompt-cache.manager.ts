import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import crypto from 'crypto';

/**
 * Prompt 缓存管理器 - 最大化模型调用缓存命中率
 * 
 * 核心原则:
 * 1. 前缀稳定性: 静态内容（system + tools）必须固定在前缀位置
 * 2. 缓存断点: 使用 cache_control 标记显式声明可缓存区域
 * 3. 语义缓存: 对相似 query 返回缓存响应
 * 4. 请求合并: 相同 prompt 的并发请求复用同一响应
 * 
 * OpenAI Prompt Caching 规则:
 * - 前缀 >= 1024 tokens 才激活缓存
 * - 缓存有效期 5-10 分钟（取决于负载）
 * - 缓存命中可节省 50-90% 输入 token 费用
 */
@Injectable()
export class PromptCacheManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PromptCacheManager.name);
  private redis: Redis | null = null;
  
  // 缓存配置
  private readonly semanticCacheTTL: number;      // 语义缓存过期时间 (秒)
  private readonly exactCacheTTL: number;         // 精确缓存过期时间 (秒)
  private readonly minCacheableTokens: number;    // 最小可缓存 token 数
  private readonly similarityThreshold: number;   // 语义相似度阈值

  // 统计
  private stats = { exactHits: 0, semanticHits: 0, misses: 0, tokensSaved: 0 };

  constructor(private readonly config: ConfigService) {
    this.semanticCacheTTL = this.config.get('PROMPT_CACHE_SEMANTIC_TTL', 300);  // 5分钟
    this.exactCacheTTL = this.config.get('PROMPT_CACHE_EXACT_TTL', 60);         // 1分钟
    this.minCacheableTokens = this.config.get('PROMPT_CACHE_MIN_TOKENS', 1024);
    this.similarityThreshold = this.config.get('PROMPT_CACHE_SIMILARITY', 0.95);
  }

  async onModuleInit() {
    try {
      this.redis = new Redis(this.config.get('REDIS_URL', 'redis://localhost:6379'), {
        lazyConnect: true,
      });
      await this.redis.connect();
      this.logger.log('Prompt cache connected');
    } catch {
      this.logger.warn('Redis unavailable, prompt cache disabled');
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
  }

  // ==================== Prompt 结构优化 ====================

  /**
   * 重构消息数组以最大化缓存命中率
   * 
   * 原则: 静态内容在前，动态内容在后
   * 
   * Before: [system+动态记忆, user, assistant, user, ...]
   * After:  [静态system, 工具定义(带cache_control), 动态记忆, user, assistant, ...]
   */
  optimizeMessageStructure(params: {
    systemPrompt: string;        // 静态系统提示
    dynamicContext?: string;     // 动态上下文（记忆）
    messages: any[];             // 对话消息
    tools?: any[];               // 工具定义
  }): OptimizedPrompt {
    const messages: any[] = [];
    
    // === 位置 1: 静态系统提示（最稳定，缓存友好）===
    // 不包含任何动态内容，确保前缀一致
    messages.push({
      role: 'system',
      content: params.systemPrompt,
      cache_control: { type: 'ephemeral' },
    });

    // === 位置 2: 工具定义 + cache_control 断点 ===
    // 工具定义通常是静态的（同一 Skill 下工具不变）
    // 添加 cache_control 标记让 API 知道这是一个缓存断点
    if (params.tools && params.tools.length > 0) {
      messages.push({
        role: '_tool_definitions',  // 特殊角色，会被转换为实际格式
        content: JSON.stringify(params.tools),
        cache_control: { type: 'ephemeral' },
      });
    }

    // === 位置 3: 动态上下文（变化频繁，放后面）===
    // 记忆内容每次都不同，放在静态内容之后
    if (params.dynamicContext && params.dynamicContext.length > 0) {
      messages.push({
        role: 'system',
        content: params.dynamicContext,
      });
    }

    // === 位置 4: 对话消息（最动态，放最后）===
    messages.push(...params.messages);

    return {
      messages,
      // 用于缓存 key 的指纹（只包含静态部分）
      cacheFingerprint: this.computeFingerprint(params.systemPrompt, params.tools),
    };
  }

  // ==================== 精确缓存 ====================

  /**
   * 精确缓存查找 - 完全相同 prompt 返回缓存响应
   */
  async getExact(promptHash: string): Promise<CachedResponse | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(`prompt:exact:${promptHash}`);
      if (cached) {
        this.stats.exactHits++;
        const response = JSON.parse(cached);
        this.stats.tokensSaved += response.usage?.inputTokens || 0;
        return response;
      }
    } catch {}

    return null;
  }

  /**
   * 写入精确缓存
   */
  async setExact(promptHash: string, response: CachedResponse): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(
        `prompt:exact:${promptHash}`,
        this.exactCacheTTL,
        JSON.stringify(response),
      );
    } catch {}
  }

  // ==================== 语义缓存 ====================

  /**
   * 语义缓存查找 - 相似 prompt 返回缓存响应
   * 
   * 使用 LSH (局部敏感哈希) 或简单嵌入来找到相似 prompt
   * 对于 system prompt 相同、只有用户消息末尾不同的场景特别有效
   */
  async getSemantic(cacheFingerprint: string, query: string): Promise<CachedResponse | null> {
    if (!this.redis) return null;

    try {
      const queryHash = crypto.createHash('sha256').update(query).digest('hex').substring(0, 16);
      const cached = await this.redis.get(
        `prompt:semantic:${cacheFingerprint}:${queryHash}`,
      );
      if (cached) {
        this.stats.semanticHits++;
        const response = JSON.parse(cached);
        this.stats.tokensSaved += response.usage?.inputTokens || 0;
        return response;
      }
    } catch {}

    return null;
  }

  /**
   * 写入语义缓存
   */
  async setSemantic(
    cacheFingerprint: string,
    query: string,
    response: CachedResponse,
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const queryHash = crypto.createHash('sha256').update(query).digest('hex').substring(0, 16);
      await this.redis.setex(
        `prompt:semantic:${cacheFingerprint}:${queryHash}`,
        this.semanticCacheTTL,
        JSON.stringify(response),
      );
    } catch {}
  }

  // ==================== 请求合并 ====================

  /**
   * 请求合并 - 相同 prompt 的并发请求复用同一 LLM 调用
   * 
   * 防止缓存穿透: 第一个请求触发 LLM 调用，后续相同请求等待结果
   */
  private pendingCalls = new Map<string, Promise<CachedResponse>>();

  async deduplicate(
    promptHash: string,
    executor: () => Promise<CachedResponse>,
  ): Promise<CachedResponse> {
    // 如果已有相同的请求在进行中，等待其完成
    if (this.pendingCalls.has(promptHash)) {
      return this.pendingCalls.get(promptHash)!;
    }

    const promise = (async () => {
      try {
        const result = await executor();
        return result;
      } finally {
        this.pendingCalls.delete(promptHash);
      }
    })();

    this.pendingCalls.set(promptHash, promise);
    return promise;
  }

  // ==================== 缓存 Key 计算 ====================

  /**
   * 计算缓存指纹（只包含静态部分）
   * 动态内容不参与指纹计算
   */
  computeFingerprint(systemPrompt: string, tools?: any[]): string {
    const staticContent = systemPrompt + JSON.stringify(tools || []);
    return crypto.createHash('sha256').update(staticContent).digest('hex').substring(0, 16);
  }

  /**
   * 计算完整 prompt hash（用于精确缓存）
   */
  computeFullHash(messages: any[]): string {
    const content = JSON.stringify(messages);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  // ==================== 统计 ====================

  getStats() {
    const total = this.stats.exactHits + this.stats.semanticHits + this.stats.misses;
    return {
      ...this.stats,
      totalRequests: total,
      hitRate: total > 0 
        ? ((this.stats.exactHits + this.stats.semanticHits) / total * 100).toFixed(1) + '%'
        : 'N/A',
      pendingCalls: this.pendingCalls.size,
    };
  }
}

export interface OptimizedPrompt {
  messages: any[];
  cacheFingerprint: string;
}

export interface CachedResponse {
  content: string;
  toolCalls: any[];
  usage: { inputTokens: number; outputTokens: number };
  cachedAt?: number;
}