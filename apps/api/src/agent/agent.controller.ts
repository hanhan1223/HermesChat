import { Controller, Post, Body, Sse, MessageEvent, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentService } from './agent.service';
import { AgentGuidanceService } from './agent-guidance.service';
import { AuthContext } from './agent.harness.enhanced';

/**
 * Agent API 控制器
 */
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly guidance: AgentGuidanceService,
  ) {}

  /**
   * SSE 流式对话
   *
   * authContext 从 UserIsolationMiddleware 注入的 req.user 获取，
   * 不信任请求体中的 userId。
   */
  @Sse('chat')
  chat(@Body() input: any, @Req() req: Request): Observable<MessageEvent> {
    const user = (req as any).user || (req as any).authUser;
    if (!user) {
      throw new UnauthorizedException('User context not available');
    }

    const authContext: AuthContext = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // 不信任请求体中的 userId — 强制使用 JWT 中的
    const safeInput = { ...input, userId: undefined };

    return new Observable<AgentEvent>(subscriber => {
      (async () => {
        try {
          for await (const event of this.agentService.chat(safeInput, authContext)) {
            subscriber.next(event);
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    }).pipe(
      map(event => ({ data: event } as MessageEvent)),
    );
  }

  /**
   * 发送引导消息到正在运行的 Agent
   * POST /agent/guidance
   * Body: { conversationId: string, content: string }
   */
  @Post('guidance')
  sendGuidance(@Body() body: { conversationId: string; content: string }, @Req() req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();

    if (!body.conversationId || !body.content) {
      return { success: false, message: '缺少 conversationId 或 content' };
    }

    const injected = this.guidance.sendGuidance(body.conversationId, body.content);
    return {
      success: injected,
      message: injected ? '引导消息已注入' : 'Agent 未在运行或会话不存在',
    };
  }

  /**
   * 检查会话是否有正在运行的 Agent
   * GET /agent/status/:conversationId
   */
  @Post('status')
  getAgentStatus(@Body() body: { conversationId: string }) {
    return {
      active: this.guidance.isAgentActive(body.conversationId),
      hasGuidance: this.guidance.hasGuidance(body.conversationId),
    };
  }
}

interface AgentEvent {
  type: string;
  [key: string]: any;
}