import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AgentService } from './agent.service';
import { AgentGuidanceService } from './agent-guidance.service';
import { AuthContext, AgentInput } from './agent.harness.enhanced';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Agent API 控制器
 *
 * 前端契约（chatStore）：
 *   POST /api/agent/chat
 *   body: { conversationId, modelId?: 'default', content, messages? }
 *   响应: text/event-stream，每行 `data: ${JSON.stringify(event)}`
 */
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly guidance: AgentGuidanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = (req as any).user || (req as any).authUser;
    if (!user) {
      throw new UnauthorizedException('User context not available');
    }

    const authContext: AuthContext = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const input = await this.normalizeInput(body, authContext.userId);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const event of this.agentService.chat(input, authContext)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`agent chat failed: ${message}`);
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  /**
   * 兼容前端 { content } 与标准 { messages[] }；解析 modelId=default
   */
  private async normalizeInput(body: any, userId: string): Promise<AgentInput> {
    const conversationId: string = body?.conversationId;
    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    // 先校验会话归属，禁止跨租户读/写
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new ForbiddenException('对话不存在或无权访问');
    }

    let messages: { role: string; content: string }[] = Array.isArray(body?.messages)
      ? body.messages.map((m: any) => ({
          role: String(m?.role || 'user'),
          content: String(m?.content ?? ''),
        }))
      : [];

    if (messages.length === 0 && body?.content) {
      const history = await this.prisma.message.findMany({
        where: { conversationId, conversation: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      });
      messages = history
        .slice()
        .reverse()
        .map((m) => ({
          role: m.role === 'ASSISTANT' ? 'assistant' : m.role === 'SYSTEM' ? 'system' : m.role === 'TOOL' ? 'tool' : 'user',
          content: m.content,
        }));
      messages.push({ role: 'user', content: String(body.content) });

      await this.prisma.message.create({
        data: {
          conversationId,
          role: 'USER',
          content: String(body.content),
        },
      });
    }

    if (messages.length === 0) {
      throw new BadRequestException('content 或 messages 不能为空');
    }

    let modelId: string = body?.modelId;
    if (!modelId || modelId === 'default') {
      modelId = conversation.modelId;
    }
    if (!modelId || modelId === 'default') {
      const model = await this.prisma.model.findFirst({
        where: { enabled: true },
        orderBy: { priority: 'desc' },
      });
      modelId = model?.id || '';
    } else {
      const model = await this.prisma.model.findFirst({
        where: { id: modelId, enabled: true },
      });
      if (!model) {
        const fallback = await this.prisma.model.findFirst({
          where: { enabled: true },
          orderBy: { priority: 'desc' },
        });
        modelId = fallback?.id || '';
      }
    }

    return {
      conversationId,
      modelId,
      messages,
      skillId: body?.skillId,
      systemPrompt: body?.systemPrompt,
    };
  }

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

  @Post('status')
  getAgentStatus(@Body() body: { conversationId: string }) {
    return {
      active: this.guidance.isAgentActive(body.conversationId),
      hasGuidance: this.guidance.hasGuidance(body.conversationId),
    };
  }
}
