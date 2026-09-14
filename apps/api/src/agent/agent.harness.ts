import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agent 调度循环 — Harness 核心
 * 
 * 自研轻量级 Agent 调度，摒弃 LangGraph 等重型框架
 * 采用 Planner → Executor → Verifier 循环模式
 * 
 * 核心流程：
 * 1. Planner: 调用 LLM 分析当前状态，决定下一步（回复/调用工具/结束）
 * 2. Executor: 执行工具调用，收集结果
 * 3. Verifier: 验证结果质量，决定是否需要重试
 * 4. 循环直到任务完成或达到最大步数
 */
@Injectable()
export class AgentHarness {
  private readonly logger = new Logger(AgentHarness.name);
  private readonly maxSteps: number;

  constructor(
    private readonly modelRouter: ModelRouter,
    private readonly toolRegistry: ToolRegistry,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.maxSteps = this.config.get('AGENT_MAX_STEPS', 10);
  }

  /**
   * 运行 Agent 调度循环
   * @param input Agent 输入
   * @returns 异步生成器，产出各类事件
   */
  async *run(input: AgentInput): AsyncGenerator<AgentEvent> {
    const context = await this.buildContext(input);
    this.logger.log(`Agent 启动: conversation=${input.conversationId}, model=${input.modelId}`);

    try {
      for (let step = 0; step < this.maxSteps; step++) {
        context.currentStep = step;
        this.logger.debug(`Agent 步骤 ${step + 1}/${this.maxSteps}`);

        // ===== 1. Planner: 规划下一步 =====
        const plan = await this.planner(context);
        
        // 产出思考过程
        if (plan.reasoning) {
          yield { type: 'thinking', content: plan.reasoning, step };
        }

        // 如果规划认为任务完成
        if (plan.isComplete) {
          yield { type: 'message', content: plan.finalAnswer!, step };
          await this.saveAssistantMessage(context, plan.finalAnswer!, plan.reasoning);
          return;
        }

        // ===== 2. Executor: 执行工具 =====
        if (plan.toolCalls && plan.toolCalls.length > 0) {
          for (const toolCall of plan.toolCalls) {
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
        }

        // ===== 3. Verifier: 验证结果 =====
        const verification = await this.verify(context);
        if (!verification.passed) {
          context.addFeedback(verification.feedback);
          yield { type: 'feedback', content: verification.feedback, step };
        }
      }

      // 达到最大步数，强制结束
      const fallback = await this.generateFallbackResponse(context);
      yield { type: 'message', content: fallback, step: this.maxSteps };
      await this.saveAssistantMessage(context, fallback);

    } catch (error) {
      this.logger.error(`Agent 执行错误: ${error instanceof Error ? error.message : error}`, error instanceof Error ? error.stack : undefined);
      yield { type: 'error', content: 'Agent 执行过程中发生错误，请重试' };
    }
  }

  /**
   * Planner: 调用 LLM 进行规划
   */
  private async planner(context: AgentContext): Promise<PlanResult> {
    const messages = this.buildMessages(context);
    const tools = this.toolRegistry.getToolDefinitions(context.availableTools);

    const response = await this.modelRouter.chat({
      model: context.modelId,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      temperature: 0.7,
    });

    const content = response.content || '';
    const toolCalls = response.toolCalls || [];

    // 判断是否完成（无工具调用且有完整回答）
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
  private async executeTool(toolCall: ToolCall, context: AgentContext): Promise<ToolResult> {
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
   * Verifier: 验证执行结果
   */
  private async verify(context: AgentContext): Promise<VerificationResult> {
    // 基础验证：检查最后一步是否有有效输出
    const lastToolResult = context.getLastToolResult();
    if (lastToolResult && (lastToolResult.result as any)?.error) {
      return {
        passed: false,
        feedback: `工具执行失败: ${String((lastToolResult.result as any).error)}，请尝试其他方式`,
      };
    }
    return { passed: true, feedback: '' };
  }

  // ==================== 上下文构建 ====================

  private async buildContext(input: AgentInput): Promise<AgentContext> {
    const model = await this.prisma.model.findUnique({ where: { id: input.modelId } });
    if (!model) throw new Error(`模型不存在: ${input.modelId}`);

    const skill = input.skillId 
      ? await this.prisma.skill.findUnique({ where: { id: input.skillId } })
      : null;

    const mcpServers = await this.prisma.mcpServer.findMany({
      where: { userId: input.userId, status: 'connected' },
    });

    return new AgentContext({
      userId: input.userId,
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
      messages: input.messages,
      availableTools: input.tools || [],
      skill,
      mcpServers,
    });
  }

  private buildMessages(context: AgentContext): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: context.systemPrompt },
      ...context.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 添加工具结果
    for (const result of context.toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: JSON.stringify(result.result),
      });
    }

    return messages;
  }

  private async saveAssistantMessage(context: AgentContext, content: string, thinking?: string) {
    await this.prisma.message.create({
      data: {
        conversationId: context.conversationId,
        role: 'ASSISTANT',
        content,
        thinking,
        tokenCount: content.length / 4, // 粗估
      },
    });
  }

  private async generateFallbackResponse(context: AgentContext): Promise<string> {
    const response = await this.modelRouter.chat({
      model: context.modelId,
      messages: [
        { role: 'system', content: context.systemPrompt },
        { role: 'user', content: '请基于以上信息给出最终回答' },
      ],
    });
    return response.content || '抱歉，我无法完成这个任务。';
  }
}

// ==================== 类型定义 ====================

export interface AgentInput {
  userId: string;
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
 * Agent 执行上下文
 */
class AgentContext {
  currentStep = 0;
  toolResults: { toolCallId: string; result: ToolResult }[] = [];
  feedbacks: string[] = [];

  constructor(public readonly config: {
    userId: string;
    conversationId: string;
    modelId: string;
    modelConfig: {
      provider: string;
      modelId: string;
      maxTokens: number;
      supportsVision: boolean;
      supportsTools: boolean;
    };
    systemPrompt: string;
    messages: { role: string; content: string }[];
    availableTools: string[];
    skill: any;
    mcpServers: any[];
  }) {}

  get userId() { return this.config.userId; }
  get conversationId() { return this.config.conversationId; }
  get modelId() { return this.config.modelId; }
  get systemPrompt() { return this.config.systemPrompt; }
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
}