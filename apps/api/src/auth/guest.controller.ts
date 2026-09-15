import { Controller, Post, Get, Body, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { GuestService } from './guest.service';
import { AgentService } from '../agent/agent.service';
import { ConfigService } from '@nestjs/config';

/**
 * 游客对话 API — 免登录免费对话
 *
 * POST /api/guest/chat   发送消息（限流 10 条）
 * GET  /api/guest/remaining  查询剩余条数
 */
@Controller('guest')
export class GuestController {
  constructor(
    private readonly guestService: GuestService,
    private readonly agentService: AgentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 查询剩余免费条数
   */
  @Get('remaining')
  async remaining(@Req() req: Request) {
    const fp = this.guestService.fingerprint(this.getClientIp(req), this.getUserAgent(req));
    const result = await this.guestService.getRemaining(fp);
    return result;
  }

  /**
   * 游客发送消息（SSE 流式）
   */
  @Post('chat')
  async chat(
    @Req() req: Request,
    @Body() body: { content: string; modelId?: string },
  ) {
    const fp = this.guestService.fingerprint(this.getClientIp(req), this.getUserAgent(req));

    // 检查限流
    const check = await this.guestService.checkAndIncrement(fp);
    if (!check.allowed) {
      throw new ForbiddenException({
        message: '免费对话次数已用完，请登录后继续',
        code: 'GUEST_LIMIT_EXCEEDED',
        limit: check.limit,
      });
    }

    // 使用默认模型（或指定模型）
    const modelId = body.modelId || this.config.get('GUEST_DEFAULT_MODEL', '');

    // 创建临时游客会话
    // 游客对话不持久化到数据库，直接流式返回
    return {
      remaining: check.remaining,
      limit: check.limit,
      message: body.content,
      // 注意：真正的流式对话需要走 SSE，此处返回限流信息
      // 前端拿到 remaining 后再调 SSE 端点
    };
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
  }
}
