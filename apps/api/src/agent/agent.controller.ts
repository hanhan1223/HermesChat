import { Controller, Post, Body, Sse, MessageEvent, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentService } from './agent.service';
import { AuthContext } from './agent.harness.enhanced';

/**
 * Agent API 控制器
 */
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

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
}

interface AgentEvent {
  type: string;
  [key: string]: any;
}