import { Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConversationSearchService } from './conversation-search.service';

/**
 * 会话全文搜索 API
 */
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: ConversationSearchService) {}

  private getUser(req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /**
   * 全文搜索消息内容
   * GET /search/messages?q=关键词&conversationId=xxx&limit=20&offset=0
   */
  @Get('messages')
  searchMessages(
    @Query('q') query: string,
    @Query('conversationId') conversationId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: Request,
  ) {
    return this.searchService.searchMessages({
      userId: this.getUser(req).id,
      query,
      conversationId: conversationId || undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * 搜索会话标题
   * GET /search/conversations?q=关键词&limit=10
   */
  @Get('conversations')
  searchConversations(
    @Query('q') query: string,
    @Query('limit') limit: string,
    @Req() req: Request,
  ) {
    return this.searchService.searchConversations({
      userId: this.getUser(req).id,
      query,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  /**
   * 初始化搜索索引（管理员用）
   */
  @Post('initialize')
  initializeIndex() {
    return this.searchService.initializeSearchIndex();
  }
}
