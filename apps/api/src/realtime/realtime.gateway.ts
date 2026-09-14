import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AgentService } from '../agent/agent.service';
import { AuthContext } from '../agent/agent.harness.enhanced';

/**
 * WebSocket 网关 - 实时对话推送
 *
 * 安全要求:
 * 1. 连接时必须携带有效 JWT（handshake.auth.token 或 query.token）
 * 2. userId 从 JWT 提取，不信任客户端 payload
 * 3. 每个连接绑定一个用户，跨用户操作一律拒绝
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connectedUsers = new Map<string, { userId: string; socketId: string }>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly agentService: AgentService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 连接时验证 JWT
   */
  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        (client.handshake.headers.authorization?.replace('Bearer ', ''));

      if (!token) {
        this.logger.warn(`连接拒绝: 缺少 token, socket=${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // 将用户信息绑定到 socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      this.connectedUsers.set(client.id, { userId: payload.sub, socketId: client.id });
      this.logger.log(`客户端连接: user=${payload.sub}, socket=${client.id}`);
    } catch (error) {
      this.logger.warn(`连接拒绝: token 无效, socket=${client.id}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.logger.log(`客户端断开: socket=${client.id}`);
  }

  /**
   * 处理对话消息
   */
  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    // ★ 用户 ID 从 JWT 绑定的 socket.data 获取，不信任 payload.userId
    const userId = client.data?.userId;
    if (!userId) {
      client.emit('agent_event', { type: 'error', content: '未认证的连接' });
      return;
    }

    const { conversationId, modelId, content, skillId } = payload;

    if (!conversationId || !modelId || !content) {
      client.emit('agent_event', { type: 'error', content: '缺少必要参数' });
      return;
    }

    const authContext: AuthContext = {
      userId,
      email: client.data.email,
      role: client.data.role,
    };

    try {
      for await (const event of this.agentService.chat(
        {
          conversationId,
          modelId,
          skillId,
          messages: [{ role: 'user', content }],
        },
        authContext,
      )) {
        client.emit('agent_event', event);
      }
    } catch (error) {
      this.logger.error(`对话处理失败: ${error instanceof Error ? error.message : error}`);
      client.emit('agent_event', {
        type: 'error',
        content: '对话处理失败',
      });
    }
  }

  /**
   * 心跳检测
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
}