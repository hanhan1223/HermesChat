import { Injectable, Logger } from '@nestjs/common';
import { AgentHarness, AgentInput, AgentEvent } from './agent.harness';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agent 服务 - 封装调度循环的调用
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly harness: AgentHarness,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 执行 Agent 对话
   */
  async *chat(input: AgentInput): AsyncGenerator<AgentEvent> {
    yield* this.harness.run(input);
  }

  /**
   * 获取对话历史
   */
  async getConversationMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}