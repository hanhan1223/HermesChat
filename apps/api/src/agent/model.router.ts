import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { PromptCacheManager, CachedResponse } from '../prompt-cache/prompt-cache.manager';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';

/**
 * 模型路由器 - 统一 LLM 调用接口
 *
 * 可靠性保障:
 * 1. 按模型独立熔断（一个模型故障不影响其他模型）
 * 2. 调用超时（默认 60s，可配置）
 * 3. 指数退避重试（默认 2 次）
 *
 * Prompt Caching 优化:
 * 1. 使用 cache_control 标记静态内容
 * 2. 精确缓存 + 语义缓存
 * 3. 请求合并（防止缓存穿透）
 * 4. 缓存命中率统计
 */
@Injectable()
export class ModelRouter {
  private readonly logger = new Logger(ModelRouter.name);
  private openaiClient: OpenAI | null = null;
  private anthropicClient: any = null;
  private readonly llmTimeoutMs: number;
  private readonly llmMaxRetries: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptCache: PromptCacheManager,
    private readonly circuitBreakers: CircuitBreakerRegistry,
    private readonly config: ConfigService,
  ) {
    this.llmTimeoutMs = this.config.get('LLM_TIMEOUT_MS', 60000);
    this.llmMaxRetries = this.config.get('LLM_MAX_RETRIES', 2);
  }

  /**
   * 统一聊天接口（带缓存优化）
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    const model = await this.prisma.model.findUnique({ where: { id: params.model } });
    if (!model || !model.enabled) {
      throw new Error('Model unavailable: ' + params.model);
    }

    // 计算缓存 key
    const promptHash = this.promptCache.computeFullHash(params.messages);

    // 1. 尝试精确缓存
    const exactCached = await this.promptCache.getExact(promptHash);
    if (exactCached) {
      return this.cachedToResponse(exactCached);
    }

    // 2. 尝试语义缓存
    const cacheFingerprint = params.cacheFingerprint || this.promptCache.computeFingerprint(
      params.messages.find(m => m.role === 'system')?.content || '',
      params.tools,
    );
    const semanticCached = await this.promptCache.getSemantic(cacheFingerprint, params.messages[params.messages.length - 1]?.content || '');
    if (semanticCached) {
      return this.cachedToResponse(semanticCached);
    }

    // 3. 请求合并 + 实际调用
    this.promptCache['stats'].misses++;
    const response = await this.promptCache.deduplicate(promptHash, () => this.callLLM(params, model));

    // 4. 写入缓存
    await this.promptCache.setExact(promptHash, this.responseToCached(response));
    await this.promptCache.setSemantic(
      cacheFingerprint,
      params.messages[params.messages.length - 1]?.content || '',
      this.responseToCached(response),
    );

    return response;
  }

  /**
   * 实际 LLM 调用（按模型独立熔断 + 超时 + 重试 + AbortSignal）
   */
  private async callLLM(params: ChatParams, model: any): Promise<ChatResponse> {
    // ★ 已取消则直接抛出，不发起请求
    if (params.signal?.aborted) {
      throw new Error('Agent cancelled before LLM call');
    }

    const cb = this.circuitBreakers.get(model.id);

    const doCall = () => {
      switch (model.provider) {
        case 'openai':
          return this.chatOpenAI(params, model);
        case 'anthropic':
          return this.chatAnthropic(params, model);
        case 'google':
          return this.chatGoogle(params, model);
        default:
          return this.chatOpenAI(params, model);
      }
    };

    return cb.execute(() =>
      this.callWithTimeout(doCall, this.llmTimeoutMs, this.llmMaxRetries, params.signal),
    );
  }

  /**
   * 带超时 + AbortSignal + 指数退避重试的调用包装
   *
   * 取消时立即中止，不进入重试循环 — 避免浪费 Token
   */
  private async callWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    maxRetries: number,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // ★ 每次重试前检查取消
      if (signal?.aborted) {
        throw new Error('Agent cancelled');
      }

      try {
        const racers: Promise<T>[] = [
          fn(),
          new Promise<never>((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error(`LLM call timeout after ${timeoutMs}ms (attempt ${attempt + 1})`)),
              timeoutMs,
            );
            if (timer.unref) timer.unref();
          }),
        ];

        // ★ 加入 AbortSignal 竞争 — 取消时立即 reject
        if (signal) {
          racers.push(new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('Agent cancelled'));
            }, { once: true });
          }));
        }

        return await Promise.race(racers);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // ★ 取消导致的错误不重试
        if (lastError.message === 'Agent cancelled') {
          throw lastError;
        }

        if (attempt === maxRetries) break;

        const backoff = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoff}ms: ${lastError.message}`,
        );
        await new Promise(r => setTimeout(r, backoff));
      }
    }

    throw lastError || new Error('LLM call failed after retries');
  }

  /**
   * OpenAI 调用（带 Prompt Caching 支持）
   * 
   * cache_control 标记说明:
   * - 在消息对象中添加 cache_control: { type: "ephemeral" }
   * - API 会自动缓存该消息之前的所有内容
   * - 下次请求前缀匹配时享受缓存折扣
   */
  private async chatOpenAI(params: ChatParams, model: any): Promise<ChatResponse> {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: model.apiKey,
        baseURL: model.endpoint || undefined,
      });
    }

    // ★ 关键: 为静态内容添加 cache_control 标记
    const messagesWithCache = this.addCacheControlMarkers(params.messages);

    const response = await this.openaiClient.chat.completions.create({
      model: model.modelId,
      messages: messagesWithCache as any,
      tools: (params.tools as any) || undefined,
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || model.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      })) || [],
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        cacheReadTokens: (response.usage as any)?.prompt_tokens_details?.cached_tokens || 0,
      },
    };
  }

  /**
   * Anthropic 调用（带 Prompt Caching 支持）
   * 
   * Anthropic 使用 cache_control 标记系统提示和工具定义
   */
  private async chatAnthropic(params: ChatParams, model: any): Promise<ChatResponse> {
    if (!this.anthropicClient) {
      const Anthropic = await import('@anthropic-ai/sdk');
      this.anthropicClient = new Anthropic.default({ apiKey: model.apiKey });
    }

    // 提取系统提示
    const systemMessage = params.messages.find(m => m.role === 'system');
    const userMessages = params.messages.filter(m => m.role !== 'system');

    // ★ 为系统提示添加 cache_control
    const systemBlocks = systemMessage ? [{
      type: 'text',
      text: systemMessage.content,
      cache_control: { type: 'ephemeral' },  // 缓存系统提示
    }] : [];

    // ★ 为工具定义添加 cache_control
    const toolsWithCache = params.tools?.map((tool, index) => {
      if (index === params.tools!.length - 1) {
        return { ...tool, cache_control: { type: 'ephemeral' } };
      }
      return tool;
    });

    const response = await this.anthropicClient.messages.create({
      model: model.modelId,
      max_tokens: params.maxTokens || model.maxTokens,
      system: systemBlocks,
      messages: userMessages as any,
      tools: toolsWithCache as any,
    });

    const content = response.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');

    const toolUse = response.content.find((c: any) => c.type === 'tool_use');

    return {
      content,
      toolCalls: toolUse ? [{
        id: toolUse.id,
        name: toolUse.name,
        arguments: toolUse.input as Record<string, unknown>,
      }] : [],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens || 0,
      },
    };
  }

  private async chatGoogle(params: ChatParams, model: any): Promise<ChatResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(model.apiKey);
    const genModel = genAI.getGenerativeModel({ model: model.modelId });

    const prompt = params.messages.map(m => m.role + ': ' + m.content).join('\n');
    const result = await genModel.generateContent(prompt);

    return {
      content: result.response.text(),
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
    };
  }

  // ==================== 缓存辅助 ====================

  /**
   * 为消息添加 cache_control 标记
   * 
   * 策略:
   * - 第一条 system 消息: 添加 cache_control（缓存系统提示）
   * - 工具定义消息: 添加 cache_control（缓存工具定义）
   * - 动态内容: 不添加（每次变化）
   */
  private addCacheControlMarkers(messages: any[]): any[] {
    return messages.map((msg, index) => {
      // 静态系统提示 -> 缓存
      if (msg.role === 'system' && index === 0) {
        return { ...msg, cache_control: { type: 'ephemeral' } };
      }
      // 工具定义 -> 缓存
      if (msg.role === '_tool_definitions') {
        return { ...msg, cache_control: { type: 'ephemeral' } };
      }
      return msg;
    });
  }

  private cachedToResponse(cached: CachedResponse): ChatResponse {
    return {
      ...cached,
      cached: true,
      cachedAt: cached.cachedAt,
    } as any;
  }

  private responseToCached(response: ChatResponse): CachedResponse {
    return {
      content: response.content,
      toolCalls: response.toolCalls,
      usage: response.usage,
      cachedAt: Date.now(),
    };
  }
}

export interface ChatParams {
  model: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
  cacheFingerprint?: string;
  /** AbortSignal — 取消时中止 LLM HTTP 请求，不浪费 Token */
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number };
  cached?: boolean;
  cachedAt?: number;
}