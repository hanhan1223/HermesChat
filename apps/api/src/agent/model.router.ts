import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { PromptCacheManager, CachedResponse } from '../prompt-cache/prompt-cache.manager';
import { CircuitBreaker } from './circuit-breaker';

/**
 * 模型路由器 - 统一 LLM 调用接口（支持 Prompt Caching）
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptCache: PromptCacheManager,
    private readonly circuitBreaker: CircuitBreaker,
  ) {}

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
   * 实际 LLM 调用（带熔断器）
   */
  private async callLLM(params: ChatParams, model: any): Promise<ChatResponse> {
    const cb = this.circuitBreaker;
    
    switch (model.provider) {
      case 'openai':
        return cb.execute(() => this.chatOpenAI(params, model));
      case 'anthropic':
        return cb.execute(() => this.chatAnthropic(params, model));
      case 'google':
        return cb.execute(() => this.chatGoogle(params, model));
      default:
        return cb.execute(() => this.chatOpenAI(params, model));
    }
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
}

export interface ChatResponse {
  content: string;
  toolCalls: { id: string; name: string; arguments: Record<string, unknown> }[];
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number };
  cached?: boolean;
  cachedAt?: number;
}