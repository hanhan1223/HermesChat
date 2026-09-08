import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ShortLinkService } from './short-link.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

/**
 * 短链 API 控制器
 */
@Controller('short-links')
@UseGuards(JwtAuthGuard)
export class ShortLinkController {
  constructor(private readonly shortLink: ShortLinkService) {}

  /**
   * 创建短链
   */
  @Post()
  create(@Body() body: { url: string; expiresInDays?: number }, @Req() req: any) {
    return this.shortLink.createShortLink(body.url, req.user.id, body.expiresInDays);
  }

  /**
   * 创建对话分享短链
   */
  @Post('share/:conversationId')
  createShare(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.shortLink.createShareLink(conversationId, req.user.id);
  }

  /**
   * 获取用户短链列表
   */
  @Get()
  list(@Req() req: any) {
    return this.shortLink.listUserLinks(req.user.id);
  }

  /**
   * 删除短链
   */
  @Delete(':code')
  delete(@Param('code') code: string, @Req() req: any) {
    return this.shortLink.deleteLink(code, req.user.id);
  }
}

/**
 * 短链跳转控制器（无需认证）
 */
@Controller('s')
export class ShortLinkRedirectController {
  constructor(private readonly shortLink: ShortLinkService) {}

  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const link = await this.shortLink.resolveShortLink(code);
    if (!link) {
      return res.status(404).json({ error: '短链不存在或已过期' });
    }
    return res.redirect(link.originalUrl);
  }
}