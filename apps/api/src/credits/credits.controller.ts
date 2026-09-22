import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { CreditsService } from './credits.service';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly service: CreditsService) {}

  /** 剩余额度 / 计费模式 / 试用状态 */
  @Get('overview')
  overview(@Req() req: any) {
    return this.service.getQuotaOverview(req.user.id);
  }

  /** 平台计费配置（试用天数等） */
  @Get('billing-config')
  billingConfig() {
    return this.service.getBillingConfig();
  }

  /** Token 消耗量统计 */
  @Get('usage')
  usage(@Req() req: any, @Query('days') days?: string) {
    const n = days ? parseInt(days, 10) : 30;
    return this.service.getTokenUsage(req.user.id, Number.isFinite(n) ? n : 30);
  }

  /** 本人积分流水 */
  @Get('transactions')
  transactions(@Req() req: any, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.service.getTransactions(req.user.id, Number.isFinite(n) ? n : 50);
  }

  /** 本人额度购买申请列表 */
  @Get('purchase-requests')
  listPurchaseRequests(@Req() req: any) {
    return this.service.listPurchaseRequests(req.user.id);
  }

  /** 提交额度购买申请 */
  @Post('purchase-requests')
  createPurchaseRequest(
    @Req() req: any,
    @Body() body: { amount: number; note?: string; contact?: string },
  ) {
    return this.service.createPurchaseRequest(req.user.id, body || ({} as any));
  }
}
