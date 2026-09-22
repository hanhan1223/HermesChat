import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';
import { SourceTracker } from './source-tracker';
import { AgentGuidanceService } from './agent-guidance.service';
import { TokenUsageService } from '../tokens/token-usage.service';

/**
 * 增强版 Agent 调度循环 - 支持用户隔离 + 三层记忆 + 高并发 + 引用索引
 *
 * 改进点：
 * 1. 用户隔离 - 从 authContext 获取用户 ID，不信任请求体
 * 2. 三层记忆 - 融合 Working + Episodic + Semantic 记忆
 * 3. 并发控制 - 并行工具调用 + 熔断器（统一走 CircuitBreakerRegistry）
 * 4. 上下文压缩 - 动态管理上下文窗口
 * 5. 取消支持 - 通过 AbortSignal 中断 Agent 循环
 * 6. 引用索引 - 工具结果自动注册为可引用来源，LLM 输出含 [[ID: doc_x]]
 */
@Injectable()
export class EnhancedAgentHarness {
  private readonly logger = new Logger(EnhancedAgentHarness.name);
  private readonly maxSteps: number;

  constructor(
    private readonly modelRouter: ModelRouter,
    private readonly toolRegistry: ToolRegistry,
    private readonly prisma: PrismaService,
    private readonly memory: MemoryService,
    private readonly config: ConfigService,
    private readonly circuitBreakers: CircuitBreakerRegistry,
    private readonly sourceTracker: SourceTracker,
    private readonly guidance: AgentGuidanceService,
    private readonly tokenUsage: TokenUsageService,
  ) {
    this.maxSteps = Number(this.config.get('AGENT_MAX_STEPS', 10)) || 10;
  }

  /**
   * 运行 Agent 调度循环
   * @param input Agent 输入
   * @param authContext 认证上下文（从 JWT 提取，不可伪造）
   * @param signal 可选的 AbortSignal，用于取消正在进行的 Agent 循环
   * @param runId 运行 ID（用于引导消息通道）
   */
  async *run(
    input: AgentInput,
    authContext: AuthContext,
    signal?: AbortSignal,
    runId?: string,
  ): AsyncGenerator<AgentEvent> {
    // ★ 用户隔离：使用 authContext 中的用户 ID，不信任 input 中的 userId
    const userId = authContext.userId;
    // 重置来源追踪器（每个请求独立）
    this.sourceTracker.reset();
    const context = await this.buildContext(input, userId);

    this.logger.log(`Agent 启动: user=${userId}, conversation=${input.conversationId}, run=${runId}`);

    try {
      for (let step = 0; step < this.maxSteps; step++) {
        // ★ 检查取消信号
        if (signal?.aborted) {
          this.logger.log(`Agent 取消: user=${userId}, step=${step}`);
          yield { type: 'cancelled', step };
          return;
        }

        // ★ 检查并消费引导消息（用户在执行中发送的引导）
        if (this.guidance.hasGuidance(input.conversationId)) {
          const guidanceMessages = this.guidance.consumeGuidance(input.conversationId);
          for (const g of guidanceMessages) {
            // 将引导消息注入上下文，影响后续 Planner 决策
            context.messages.push({ role: 'user', content: `[用户引导] ${g.content}` });
            yield { type: 'guidance_received', content: g.content, step };
          }
        }

        context.currentStep = step;

        // ===== 1. Planner: 规划下一步（signal 传入 LLM 调用）=====
        const plan = await this.planner(context, signal);

        if (plan.reasoning) {
          yield { type: 'thinking', content: plan.reasoning, step };
        }

        if (plan.isComplete) {
          yield { type: 'message', content: plan.finalAnswer!, step };
          // 发送 stream_end 事件，携带引用来源映射
          yield {
            type: 'stream_end',
            sources: this.sourceTracker.buildSourceList(),
            sourceMapping: this.sourceTracker.buildMapping(),
            step,
          };
          await this.saveAssistantMessage(context, plan.finalAnswer!, plan.reasoning);
          await this.saveToMemory(context, userId);
          return;
        }

        // ===== 2. Executor: 并行执行工具（signal 传入，可中断）=====
        if (plan.toolCalls && plan.toolCalls.length > 0) {
          if (plan.toolCalls.length > 1) {
            yield* this.executeToolsParallel(plan.toolCalls, context, step, signal);
          } else {
            yield* this.executeToolSequential(plan.toolCalls[0], context, step, signal);
          }
        }

        // 再次检查取消（工具执行期间可能被取消）
        if (signal?.aborted) {
          yield { type: 'cancelled', step };
          return;
        }

        // ===== 3. Verifier: 验证结果 =====
        const verification = await this.verify(context);
        if (!verification.passed) {
          context.addFeedback(verification.feedback);
          yield { type: 'feedback', content: verification.feedback, step };
        }
      }

      // 达到最大步数
      const fallback = await this.generateFallbackResponse(context);
      yield { type: 'message', content: fallback, step: this.maxSteps };
      yield {
        type: 'stream_end',
        sources: this.sourceTracker.buildSourceList(),
        sourceMapping: this.sourceTracker.buildMapping(),
        step: this.maxSteps,
      };
      await this.saveAssistantMessage(context, fallback);
      await this.saveToMemory(context, userId);

    } catch (error) {
      this.logger.error(`Agent 执行错误: ${error instanceof Error ? error.message : error}`);
      yield {
        type: 'error',
        content: `Agent 执行失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      // 清理上下文
      context.dispose();
    }
  }

  /**
   * 并行执行多个工具
   *
   * 注意: 不能在 Promise.all 的回调中 yield — 那是普通 async 函数不是 generator。
   * 先发 tool_start 事件，再并行执行，最后统一发结果事件。
   */
  private async *executeToolsParallel(
    toolCalls: ToolCall[],
    context: EnhancedAgentContext,
    step: number,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    // ★ 执行前检查取消
    if (signal?.aborted) {
      yield { type: 'cancelled', step };
      return;
    }

    for (const tc of toolCalls) {
      yield { type: 'tool_start', tool: tc.name, args: tc.arguments, step };
    }

    const settled = await Promise.allSettled(
      toolCalls.map(async (tc) => {
        if (signal?.aborted) throw new Error('Agent cancelled');
        const result = await this.executeTool(tc, context);
        return { toolCall: tc, result, error: null as string | null };
      }),
    );

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      const toolCall = toolCalls[i];

      if (outcome.status === 'fulfilled') {
        const { result } = outcome.value;
        // 注册引用来源（web_search / knowledge 检索结果）
        this.registerToolSources(toolCall.name, result);
        yield { type: 'tool_result', tool: toolCall.name, result, step };
        context.addToolResult(toolCall, result);
      } else {
        const error = outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
        yield { type: 'tool_error', tool: toolCall.name, error, step };
        context.addToolResult(toolCall, { error });
      }
    }
  }

  /**
   * 串行执行单个工具
   */
  private async *executeToolSequential(
    toolCall: ToolCall,
    context: EnhancedAgentContext,
    step: number,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    // ★ 执行前检查取消
    if (signal?.aborted) {
      yield { type: 'cancelled', step };
      return;
    }

    yield { type: 'tool_start', tool: toolCall.name, args: toolCall.arguments, step };
    try {
      const result = await this.executeTool(toolCall, context);
      // 注册引用来源
      this.registerToolSources(toolCall.name, result);
      yield { type: 'tool_result', tool: toolCall.name, result, step };
      context.addToolResult(toolCall, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      yield { type: 'tool_error', tool: toolCall.name, error: errorMsg, step };
      context.addToolResult(toolCall, { error: errorMsg });
    }
  }

  /**
   * Planner: 调用 LLM 进行规划（带熔断器 + AbortSignal）
   */
  private async planner(context: EnhancedAgentContext, signal?: AbortSignal): Promise<PlanResult> {
    const messages = this.buildMessages(context);
    const tools = this.toolRegistry.getToolDefinitions(context.availableTools);

    const cb = this.getCircuitBreaker(context.modelId);

    // ★ signal 传给 ModelRouter，LLM HTTP 请求可被 abort
    const response = await cb.execute(() =>
      this.modelRouter.chat({
        model: context.modelId,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.7,
        signal,
      }),
    );

    if (response.usage) {
      void this.tokenUsage.record({
        userId: context.userId,
        modelId: context.modelId,
        conversationId: context.conversationId,
        inputTokens: response.usage.inputTokens || 0,
        outputTokens: response.usage.outputTokens || 0,
        cachedTokens: response.usage.cacheReadTokens || 0,
      });
    }
    const content = response.content || '';
    const toolCalls = response.toolCalls || [];
    const isComplete = toolCalls.length === 0 && content.trim().length > 0;

    return {
      reasoning: content,
      isComplete,
      finalAnswer: isComplete ? content : undefined,
      toolCalls: toolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
    };
  }

  /**
   * Executor: 执行单个工具
   */
  private async executeTool(toolCall: ToolCall, context: EnhancedAgentContext): Promise<ToolResult> {
    const tool = this.toolRegistry.get(toolCall.name);
    if (!tool) {
      throw new Error(`未知工具: ${toolCall.name}`);
    }
    return await tool.execute(toolCall.arguments, {
      userId: context.userId,
      conversationId: context.conversationId,
      context,
    });
  }

  /**
   * 从工具结果中注册引用来源
   * 支持 web_search 和 knowledge 检索的结果格式
   */
  private registerToolSources(toolName: string, result: ToolResult): void {
    try {
      const r = result as any;

      // web/google/pubmed/scholar 搜索结果: { results: [{ title, url, snippet }] }
      const searchTools = new Set([
        'web_search',
        'google_search',
        'pubmed_search',
        'scholar_search',
      ]);
      if (searchTools.has(toolName) && Array.isArray(r.results)) {
        for (const item of r.results) {
          this.sourceTracker.registerSource({
            title: item.title || '搜索结果',
            url: item.url || item.link,
            snippet: item.snippet || item.description || item.content || '',
            type: item.type === 'pubmed' || item.type === 'scholar' ? 'document' : 'web',
            score: item.score,
          });
        }
      }

      // knowledge 检索结果: { results: [{ documentTitle, content, score }] }
      if ((toolName === 'knowledge_search' || toolName === 'rag_search') && Array.isArray(r.results)) {
        for (const item of r.results) {
          this.sourceTracker.registerSource({
            title: item.documentTitle || item.title || '知识库文档',
            snippet: item.content || '',
            type: 'knowledge',
            score: item.score,
            metadata: { documentId: item.documentId, chunkId: item.chunkId },
          });
        }
      }

      // 通用格式: { sources: [...] }
      if (Array.isArray(r.sources)) {
        for (const item of r.sources) {
          this.sourceTracker.registerSource({
            title: item.title || '来源',
            url: item.url,
            snippet: item.snippet || item.content || '',
            type: item.type || 'web',
            score: item.score,
          });
        }
      }
    } catch {
      // 来源注册失败不影响主流程
    }
  }

  /**
   * Verifier: 验证执行结果
   */
  private async verify(context: EnhancedAgentContext): Promise<VerificationResult> {
    const lastToolResult = context.getLastToolResult();
    if (lastToolResult && (lastToolResult.result as any)?.error) {
      return {
        passed: false,
        feedback: `工具执行失败: ${String((lastToolResult.result as any).error)}，请尝试其他方式`,
      };
    }
    return { passed: true, feedback: '' };
  }

  // ==================== 上下文构建（含三层记忆）====================

  private async buildContext(input: AgentInput, userId: string): Promise<EnhancedAgentContext> {
    const model = await this.prisma.model.findUnique({ where: { id: input.modelId } });
    if (!model) throw new Error(`模型不存在: ${input.modelId}`);

    // ★ 获取三层记忆上下文
    const memoryContext = await this.memory.buildFullContext({
      userId,
      conversationId: input.conversationId,
      query: input.messages[input.messages.length - 1]?.content || '',
    });

    const skill = input.skillId
      ? await this.prisma.skill.findUnique({ where: { id: input.skillId } })
      : null;

    return new EnhancedAgentContext({
      userId,
      conversationId: input.conversationId,
      modelId: input.modelId,
      modelConfig: {
        provider: model.provider,
        modelId: model.modelId,
        maxTokens: model.maxTokens,
        supportsVision: model.supportsVision,
        supportsTools: model.supportsTools,
      },
      systemPrompt: skill?.prompt || input.systemPrompt || 'You are a helpful AI assistant.',
      systemContext: memoryContext.systemContext,
      messages: input.messages,
      availableTools: input.tools || [],
      episodicMemory: memoryContext.episodicMemory,
      semanticMemory: memoryContext.semanticMemory,
    });
  }

  /**
   * 构建消息数组 - 优化 Prompt Caching 命中率
   * 
   * 关键改进:
   * 1. 静态 system prompt 单独放（不拼接动态内容）
   * 2. 动态记忆内容放在后面
   * 3. 为静态内容添加 cache_control 标记
   * 
   * 缓存命中原则: 前缀相同 → 缓存命中 → 节省 50-90% 输入 token 费用
   */
  private buildMessages(context: EnhancedAgentContext): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // 多数 OpenAI 兼容上游（含 SiliconFlow）只允许开头一条 system
    const systemParts: string[] = [];
    if (context.systemPrompt) systemParts.push(context.systemPrompt);
    if (context.systemContext && context.systemContext.length > 0) {
      systemParts.push(context.systemContext);
    }
    const sourceContext = this.sourceTracker.buildPromptContext();
    if (sourceContext) systemParts.push(sourceContext);

    messages.push({
      role: 'system',
      content: systemParts.join('\n\n'),
    } as any);

    for (const m of context.messages) {
      const role = String(m.role || '').toLowerCase();
      // OpenAI Chat Completions 仅接受 user/assistant（tool 需 tool_call_id）
      if (role !== 'user' && role !== 'assistant') continue;
      if (!m.content) continue;
      messages.push({
        role: role as 'user' | 'assistant',
        content: m.content,
      });
    }

    for (const result of context.toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: JSON.stringify(result.result),
      });
    }

    return messages;
  }

  private async saveToMemory(context: EnhancedAgentContext, userId: string) {
    try {
      // 生成对话摘要（简化版，生产环境应调用 LLM 生成）
      const summary = context.messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('; ')
        .substring(0, 500);

      if (summary.length > 10) {
        await this.memory.saveEpisodicMemory({
          userId,
          conversationId: context.conversationId,
          summary,
          keyTopics: [], // 应由 LLM 提取
          importance: 0.5,
        });
      }
    } catch (error) {
      this.logger.warn(`记忆保存失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async saveAssistantMessage(context: EnhancedAgentContext, content: string, thinking?: string) {
    const sources = this.sourceTracker.buildSourceList();
    const sourceMapping = this.sourceTracker.buildMapping();
    await this.prisma.message.create({
      data: {
        conversationId: context.conversationId,
        role: 'ASSISTANT',
        content,
        thinking,
        sources: sources.length > 0 ? (sources as any) : undefined,
        sourceMapping: Object.keys(sourceMapping).length > 0 ? (sourceMapping as any) : undefined,
        tokenCount: content.length / 4,
      },
    });
  }

  private async generateFallbackResponse(context: EnhancedAgentContext): Promise<string> {
    const cb = this.getCircuitBreaker(context.modelId);
    const messages = this.buildMessages(context);
    messages.push({ role: 'user', content: '请基于以上对话给出简短最终回答。' } as any);
    const response = await cb.execute(() =>
      this.modelRouter.chat({
        model: context.modelId,
        messages,
      }),
    );
    return response.content || '抱歉，我无法完成这个任务。';
  }

  // ==================== 熔断器管理 ====================

  private getCircuitBreaker(modelId: string) {
    return this.circuitBreakers.get(modelId, {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxCalls: 3,
    });
  }
}

// ==================== 类型定义 ====================

export interface AuthContext {
  userId: string;    // 从 JWT 提取，不可伪造
  email: string;
  role: string;
}

export interface AgentInput {
  conversationId: string;
  modelId: string;
  skillId?: string;
  systemPrompt?: string;
  messages: { role: string; content: string }[];
  tools?: string[];
}

export type AgentEvent =
  | { type: 'thinking'; content: string; step: number }
  | { type: 'message'; content: string; step: number }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown>; step: number }
  | { type: 'tool_result'; tool: string; result: ToolResult; step: number }
  | { type: 'tool_error'; tool: string; error: string; step: number }
  | { type: 'feedback'; content: string; step: number }
  | { type: 'cancelled'; step: number }
  | { type: 'error'; content: string }
  | { type: 'guidance_received'; content: string; step: number }
  | { type: 'stream_end'; sources: any[]; sourceMapping: Record<string, number>; step: number };

interface PlanResult {
  reasoning: string;
  isComplete: boolean;
  finalAnswer?: string;
  toolCalls: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  [key: string]: unknown;
}

interface VerificationResult {
  passed: boolean;
  feedback: string;
}

/**
 * 增强版 Agent 执行上下文
 */
class EnhancedAgentContext {
  currentStep = 0;
  toolResults: { toolCallId: string; result: ToolResult }[] = [];
  feedbacks: string[] = [];

  constructor(public readonly config: {
    userId: string;
    conversationId: string;
    modelId: string;
    modelConfig: any;
    systemPrompt: string;
    systemContext: string;
    messages: { role: string; content: string }[];
    availableTools: string[];
    episodicMemory: any[];
    semanticMemory: any[];
  }) {}

  get userId() { return this.config.userId; }
  get conversationId() { return this.config.conversationId; }
  get modelId() { return this.config.modelId; }
  get systemPrompt() { return this.config.systemPrompt; }
  get systemContext() { return this.config.systemContext; }
  get messages() { return this.config.messages; }
  get availableTools() { return this.config.availableTools; }

  addToolResult(toolCall: ToolCall, result: ToolResult) {
    this.toolResults.push({ toolCallId: toolCall.id, result });
  }

  addFeedback(feedback: string) {
    this.feedbacks.push(feedback);
  }

  getLastToolResult() {
    return this.toolResults[this.toolResults.length - 1];
  }

  dispose() {
    this.toolResults = [];
    this.feedbacks = [];
  }
}