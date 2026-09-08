import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.id);  // ★ 从 JWT 获取 userId
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.id, body);  // ★ 从 JWT 获取 userId
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user.id);  // ★ 用户隔离
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.id);  // ★ 用户隔离
  }

  @Post(':id/share')
  share(@Param('id') id: string, @Req() req: any) {
    return this.service.share(id, req.user.id);  // ★ 用户隔离
  }
}

/**
 * 公开分享接口（无需认证）
 */
@Controller('share')
export class SharedConversationController {
  constructor(private readonly service: ConversationsService) {}

  @Get(':sharedId')
  getShared(@Param('sharedId') sharedId: string) {
    return this.service.getShared(sharedId);
  }
}