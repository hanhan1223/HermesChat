import { Injectable, Logger } from '@nestjs/common';

/**
 * Agent 引导消息服务
 *
 * 在 Agent 执行过程中，用户可以随时发送引导消息。
 * 引导消息会被注入到正在运行的 Agent 上下文中，影响其后续行为。
 *
 * 流程:
 *   1. Agent 启动时注册到引导服务
 *   2. 用户通过 API 发送引导消息
 *   3. Agent 在每个 step 之间检查并消费引导消息
 *   4. 引导消息作为额外的 user 消息注入上下文
 */
@Injectable()
export class AgentGuidanceService {
  private readonly logger = new Logger(AgentGuidanceService.name);

  /** 每个会话的引导消息队列: conversationId → messages[] */
  private guidanceQueues = new Map<string, GuidanceMessage[]>();

  /** 正在运行的 Agent: conversationId → runId */
  private activeAgents = new Map<string, string>();

  /**
   * 注册 Agent 运行
   */
  registerAgent(conversationId: string, runId: string): void {
    this.activeAgents.set(conversationId, runId);
    this.guidanceQueues.set(conversationId, []);
    this.logger.log(`Agent 已注册引导通道: conversation=${conversationId}, run=${runId}`);
  }

  /**
   * 注销 Agent 运行（完成/失败/取消时）
   */
  unregisterAgent(conversationId: string): void {
    this.activeAgents.delete(conversationId);
    this.guidanceQueues.delete(conversationId);
    this.logger.log(`Agent 引导通道已关闭: ${conversationId}`);
  }

  /**
   * 发送引导消息
   * @returns 是否成功注入
   */
  sendGuidance(conversationId: string, content: string): boolean {
    if (!this.activeAgents.has(conversationId)) {
      return false;
    }

    const queue = this.guidanceQueues.get(conversationId);
    if (!queue) return false;

    queue.push({
      content,
      timestamp: new Date(),
    });

    this.logger.log(`引导消息已注入会话 ${conversationId}: ${content.substring(0, 50)}...`);
    return true;
  }

  /**
   * Agent 消费引导消息（每个 step 之间调用）
   */
  consumeGuidance(conversationId: string): GuidanceMessage[] {
    const queue = this.guidanceQueues.get(conversationId);
    if (!queue || queue.length === 0) return [];

    const consumed = [...queue];
    queue.length = 0;

    if (consumed.length > 0) {
      this.logger.log(`会话 ${conversationId} 消费了 ${consumed.length} 条引导消息`);
    }
    return consumed;
  }

  /**
   * 检查是否有待消费的引导消息
   */
  hasGuidance(conversationId: string): boolean {
    const queue = this.guidanceQueues.get(conversationId);
    return queue !== undefined && queue.length > 0;
  }

  /**
   * 检查会话是否有正在运行的 Agent
   */
  isAgentActive(conversationId: string): boolean {
    return this.activeAgents.has(conversationId);
  }
}

export interface GuidanceMessage {
  content: string;
  timestamp: Date;
}
