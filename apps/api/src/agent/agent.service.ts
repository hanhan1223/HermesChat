import { Injectable, Logger } from '@nestjs/common';
import { EnhancedAgentHarness, AgentInput, AgentEvent, AuthContext } from './agent.harness.enhanced';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agent 服务 - 封装调度循环的调用（增强版）
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly harness: EnhancedAgentHarness,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行 Agent 对话
   * @param input Agent 输入（不含 userId，userId 从 authContext 获取）
   * @param authContext 认证上下文（从 JWT 提取）
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

    yield* this.harness.run(input, authContext);
  }

  /**
   * 获取对话历史（带用户隔离）
   */
  async getConversationMessages(conversationId: string, userId: string) {
    // 验证所有权
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