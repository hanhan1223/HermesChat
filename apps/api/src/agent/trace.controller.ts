import { Controller, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TraceService } from './trace.service';

/**
 * Trace / 成本分析 API — Langfuse 式
 */
@Controller('traces')
export class TraceController {
  constructor(private readonly traceService: TraceService) {}

  private getUser(req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /**
   * 查询 Trace 列表
   */
  @Get()
  listTraces(
    @Query('conversationId') conversationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const user = this.getUser(req!);
    return this.traceService.listTraces({
      userId: user.role === 'ADMIN' ? undefined : user.id,
      conversationId,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * 成本统计
   */
  @Get('cost')
  getCostStats(
    @Query('days') days?: string,
    @Query('userId') userId?: string,
    @Req() req?: Request,
  ) {
    const user = this.getUser(req!);
    return this.traceService.getCostStats({
      userId: user.role === 'ADMIN' ? userId : user.id,
      days: days ? parseInt(days, 10) : 30,
    });
  }
}
