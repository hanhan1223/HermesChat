import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from '../agent/agent.service';

/**
 * WebSocket 网关 - 实时对话推送
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly agentService: AgentService) {}

  handleConnection(client: Socket) {
    this.logger.log(客户端连接: );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(客户端断开: );
  }

  /**
   * 处理对话消息
   */
  @SubscribeMessage('chat')
  async handleChat(client: Socket, payload: any) {
    const { userId, conversationId, modelId, content, skillId } = payload;

    try {
      for await (const event of this.agentService.chat({
        userId,
        conversationId,
        modelId,
        skillId,
        messages: [{ role: 'user', content }],
      })) {
        client.emit('agent_event', event);
      }
    } catch (error) {
      client.emit('agent_event', {
        type: 'error',
        content: '对话处理失败',
      });
    }
  }
}