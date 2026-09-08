import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { CircuitBreaker } from './circuit-breaker';

/**
 * 增强版 Agent 调度循环 - 支持用户隔离 + 三层记忆 + 高并发
 * 
 * 改进点：
 * 1. 用户隔离 - 从 authContext 获取用户 ID，不信任请求体
 * 2. 三层记忆 - 融合 Working + Episodic + Semantic 记忆
 * 3. 并发控制 - 并行工具调用 + 熔断器
 * 4. 上下文压缩 - 动态管理上下文窗口
 */
@Injectable()
export class EnhancedAgentHarness {
  private readonly logger = new Logger(EnhancedAgentHarness.name);
  private readonly maxSteps: number;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly modelRouter: ModelRouter,
    private readonly toolRegistry: ToolRegistry,
    private readonly prisma: PrismaService,
    private readonly memory: MemoryService,
    private readonly config: ConfigService,
  ) {
    this.maxSteps = this.config.get('AGENT_MAX_STEPS', 10);
  }

  /**
   * 运行 Agent 调度循环
   * @param input Agent 输入
   * @param authContext 认证上下文（从 JWT 提取，不可伪造）
   */
  async *run(
    input: AgentInput,
    authContext: AuthContext,
  ): AsyncGenerator<AgentEvent> {
    // ★ 用户隔离：使用 authContext 中的用户 ID，不信任 input 中的 userId
    const userId = authContext.userId;
    const context = await this.buildContext(input, userId);
    
    this.logger.log(Agent 启动: user=, conversation=);

    try {
      for (let step = 0; step < this.maxSteps; step++) {
        context.currentStep = step;

        // ===== 1. Planner: 规划下一步 =====
        const plan = await this.planner(context);
        
        if (plan.reasoning) {
          yield { type: 'thinking', content: plan.reasoning, step };
        }

        if (plan.isComplete) {
          yield { type: 'message', content: plan.finalAnswer!, step };
          await this.saveAssistantMessage(context, plan.finalAnswer!, plan.reasoning);
          
          // 保存到记忆系统
          await this.saveToMemory(context, userId);
          return;
        }

        // ===== 2. Executor: 并行执行工具 =====
        if (plan.toolCalls && plan.toolCalls.length > 0) {
          if (plan.toolCalls.length > 1) {
            // ★ 并行执行多个工具调用
            yield* this.executeToolsParallel(plan.toolCalls, context, step);
          } else {
            // 单个工具串行执行
            yield* this.executeToolSequential(plan.toolCalls[0], context, step);
          }
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
      await this.saveAssistantMessage(context, fallback);
      await this.saveToMemory(context, userId);

    } catch (error) {
      this.logger.error(Agent 执行错误: );
      yield { type: 'error', content: 'Agent 执行过程中发生错误，请重试' };
    } finally {
      // 清理上下文
      context.dispose();
    }
  }

  /**
   * 并行执行多个工具
   */
  private async *executeToolsParallel(
    toolCalls: ToolCall[],
    context: EnhancedAgentContext,
    step: number,
  ): AsyncGenerator<AgentEvent> {
    const results = await Promise.all(
      toolCalls.map(async (tc) => {
        yield { type: 'tool_start', tool: tc.name, args: tc.arguments, step } as AgentEvent;
        try {
          const result = await this.executeTool(tc, context);
          return { toolCall: tc, result, error: null };
        } catch (error) {
          return { toolCall: tc, result: null, error: error instanceof Error ? error.message : String(error) };
        }
      }),
    );

    for (const { toolCall, result, error } of results) {
      if (error) {
        yield { type: 'tool_error', tool: toolCall.name, error, step };
        context.addToolResult(toolCall, { error });
      } else {
        yield { type: 'tool_result', tool: toolCall.name, result, step };
        context.addToolResult(toolCall, result);
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
  ): AsyncGenerator<AgentEvent> {
    yield { type: 'tool_start', tool: toolCall.name, args: toolCall.arguments, step };
    try {
      const result = await this.executeTool(toolCall, context);
      yield { type: 'tool_result', tool: toolCall.name, result, step };
      context.addToolResult(toolCall, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      yield { type: 'tool_error', tool: toolCall.name, error: errorMsg, step };
      context.addToolResult(toolCall, { error: errorMsg });
    }
  }

  /**
   * Planner: 调用 LLM 进行规划（带熔断器）
   */
  private async planner(context: EnhancedAgentContext): Promise<PlanResult> {
    const messages = this.buildMessages(context);
    const tools = this.toolRegistry.getToolDefinitions(context.availableTools);

    // 使用熔断器保护 LLM 调用
    const cb = this.getCircuitBreaker(context.modelId);
    
    const response = await cb.execute(() =>
      this.modelRouter.chat({
        model: context.modelId,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.7,
      }),
    );

    const content = response.content || '';
    const toolCalls = response.toolCalls || [];
    const isComplete = toolCalls.length === 0 && content.length > 10;

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
      throw new Error(未知工具: );
    }
    return await tool.execute(toolCall.arguments, {
      userId: context.userId,
      conversationId: context.conversationId,
      context,
    });
  }

  /**
   * Verifier: 验证执行结果
   */
  private async verify(context: EnhancedAgentContext): Promise<VerificationResult> {
    const lastToolResult = context.getLastToolResult();
    if (lastToolResult && lastToolResult.error) {
      return {
        passed: false,
        feedback: 工具执行失败: ，请尝试其他方式,
      };
    }
    return { passed: true, feedback: '' };
  }

  // ==================== 上下文构建（含三层记忆）====================

  private async buildContext(input: AgentInput, userId: string): Promise<EnhancedAgentContext> {
    const model = await this.prisma.model.findUnique({ where: { id: input.modelId } });
    if (!model) throw new Error(模型不存在: );

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

    // === 位置 1: 静态系统提示（最稳定，用于缓存命中）===
    // ★ 不包含动态内容！确保前缀一致
    messages.push({
      role: 'system',
      content: context.systemPrompt,
      // cache_control 标记告诉 API 这是可缓存的静态内容
      cache_control: { type: 'ephemeral' },
    });

    // === 位置 2: 动态上下文（记忆内容，每次不同）===
    // 放在静态内容之后，不影响缓存前缀
    if (context.systemContext && context.systemContext.length > 0) {
      messages.push({
        role: 'system',
        content: context.systemContext,
      });
    }

    // === 位置 3: 对话消息（最动态）===
    for (const m of context.messages) {
      messages.push({
        role: m.role as 'user' | 'assistant' | 'tool',
        content: m.content,
      });
    }

    // === 位置 4: 工具结果 ===
    for (const result of context.toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: JSON.stringify(result.result),
      });
    }

    return messages;
  }

  // ==================== 记忆保存 ====================

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
      this.logger.warn(记忆保存失败: );
    }
  }

  private async saveAssistantMessage(context: EnhancedAgentContext, content: string, thinking?: string) {
    await this.prisma.message.create({
      data: {
        conversationId: context.conversationId,
        role: 'ASSISTANT',
        content,
        thinking,
        tokenCount: content.length / 4,
      },
    });
  }

  private async generateFallbackResponse(context: EnhancedAgentContext): Promise<string> {
    const cb = this.getCircuitBreaker(context.modelId);
    const response = await cb.execute(() =>
      this.modelRouter.chat({
        model: context.modelId,
        messages: [
          { role: 'system', content: context.systemPrompt },
          { role: 'user', content: '请基于以上信息给出最终回答' },
        ],
      }),
    );
    return response.content || '抱歉，我无法完成这个任务。';
  }

  // ==================== 熔断器管理 ====================

  private getCircuitBreaker(modelId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(modelId)) {
      this.circuitBreakers.set(modelId, new CircuitBreaker(modelId, {
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        halfOpenMaxCalls: 3,
      }));
    }
    return this.circuitBreakers.get(modelId)!;
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
  | { type: 'error'; content: string };

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