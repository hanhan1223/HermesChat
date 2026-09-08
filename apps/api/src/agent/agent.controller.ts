import { Controller, Post, Body, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentService } from './agent.service';

/**
 * Agent API 控制器
 */
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * SSE 流式对话
   */
  @Sse('chat')
  chat(@Body() input: any): Observable<MessageEvent> {
    return new Observable<AgentEvent>(subscriber => {
      (async () => {
        try {
          for await (const event of this.agentService.chat(input)) {
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