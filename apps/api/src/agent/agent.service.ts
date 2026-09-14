import { Injectable, Logger } from '@nestjs/common';
import { EnhancedAgentHarness, AgentInput, AgentEvent, AuthContext } from './agent.harness.enhanced';
import { AgentStateManager } from './agent-state.manager';
import { TraceService } from './trace.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

/**
 * Agent 服务 - 封装调度循环的调用（增强版）
 *
 * 完整链路:
 *   AgentService.chat()
 *     → AgentStateManager.createRun()  创建运行记录 + AbortController
 *     → harness.run(input, auth, signal)  传入 AbortSignal
 *       → planner() 每步检查 signal.aborted
 *       → modelRouter.chat({ signal })  LLM 调用可被 abort
 *       → executeTool() 工具执行前检查 signal
 *     → AgentStateManager.complete()/fail()  更新最终状态
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly harness: EnhancedAgentHarness,
    private readonly stateManager: AgentStateManager,
    private readonly traceService: TraceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行 Agent 对话（完整链路：状态机 + 取消 + 追踪）
   */
  async *chat(input: AgentInput, authContext: AuthContext): AsyncGenerator<AgentEvent> {
    // ★ 验证对话所有权
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId, userId: authContext.userId },
    });

    if (!conversation) {
      yield { type: 'error', content: '对话不存在或无权访问' };
      return;
    }

    // ★ 创建运行记录（状态机 + AbortController）
    const runId = uuid();
    const run = this.stateManager.createRun({
      runId,
      conversationId: input.conversationId,
      userId: authContext.userId,
      maxSteps: parseInt(process.env.AGENT_MAX_STEPS || '10', 10),
    });

    // ★ 获取 AbortSignal 传给 Harness
    const signal = this.stateManager.getSignal(runId);

    // ★ 开始 Trace
    const traceId = this.traceService.startTrace({
      userId: authContext.userId,
      conversationId: input.conversationId,
      modelId: input.modelId,
      input: input.messages[input.messages.length - 1]?.content || '',
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedTokens = 0;
    let finalOutput = '';

    try {
      // ★ 传入 signal — Harness 每步检查、LLM 调用可 abort
      for await (const event of this.harness.run(input, authContext, signal)) {
        // 更新步骤进度
        if ('step' in event) {
          this.stateManager.updateStep(runId, event.step);
        }

        // 收集最终输出
        if (event.type === 'message') {
          finalOutput = event.content;
        }

        // 追踪 Token 用量
        if (event.type === 'tool_result' && (event.result as any)?.usage) {
          const usage = (event.result as any).usage;
          totalInputTokens += usage.inputTokens || 0;
          totalOutputTokens += usage.outputTokens || 0;
          totalCachedTokens += usage.cacheReadTokens || 0;
        }

        yield event;
      }

      // 标记完成
      this.stateManager.complete(runId);
      this.traceService.endTrace(traceId, {
        output: finalOutput,
        status: 'COMPLETED',
        totalTokens: { input: totalInputTokens, output: totalOutputTokens, cached: totalCachedTokens },
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.stateManager.fail(runId, errorMsg);
      this.traceService.endTrace(traceId, {
        status: 'FAILED',
        error: errorMsg,
        totalTokens: { input: totalInputTokens, output: totalOutputTokens, cached: totalCachedTokens },
      });
      throw error;
    }
  }

  /**
   * 获取对话历史（带用户隔离）
   */
  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error('对话不存在或无权访问');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}