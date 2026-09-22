import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResolvedSearchProvider } from './search-providers.service';

export interface SearchChargeInput {
  userId: string;
  provider: ResolvedSearchProvider;
  toolName: string;
  query: string;
  resultCount: number;
  success: boolean;
  latencyMs?: number;
  errorMessage?: string;
}

/**
 * 搜索计费：按提供者 costPerCall 扣积分，并写入用量流水
 * 免费源（PubMed / Semantic Scholar）costPerCall=0 时只记流水不扣积分
 */
@Injectable()
export class SearchBillingService {
  private readonly logger = new Logger(SearchBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assertQuota(userId: string, provider: ResolvedSearchProvider): Promise<void> {
    if (provider.dailyQuota == null || provider.dailyQuota <= 0) return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const used = await this.prisma.searchUsageLog.count({
      where: {
        userId,
        providerId: provider.id,
        success: true,
        createdAt: { gte: start },
      },
    });

    if (used >= provider.dailyQuota) {
      throw new BadRequestException(
        `搜索服务「${provider.name}」今日配额已用完（${provider.dailyQuota} 次）`,
      );
    }
  }

  async chargeAndLog(input: SearchChargeInput): Promise<void> {
    const cost = input.success ? Math.max(0, providerCost(input.provider)) : 0;
    let balanceAfter: number | null = null;

    if (cost > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { credits: true },
      });
      if (!user) {
        throw new BadRequestException('用户不存在');
      }
      if (user.credits < cost) {
        throw new BadRequestException(
          `积分不足：本次搜索需要 ${cost}，当前余额 ${user.credits}`,
        );
      }

      const updated = await this.prisma.user.update({
        where: { id: input.userId },
        data: { credits: { decrement: cost } },
        select: { credits: true },
      });
      balanceAfter = updated.credits;

      await this.prisma.creditTransaction.create({
        data: {
          id: cryptoRandomId(),
          userId: input.userId,
          type: 'CONSUME',
          amount: -cost,
          balanceAfter,
          reason: `search:${input.provider.providerType}:${input.toolName}`,
        },
      });
    }

    await this.prisma.searchUsageLog.create({
      data: {
        userId: input.userId,
        providerId: input.provider.id.startsWith('env_')
          ? await this.ensureEnvProviderRow(input.provider)
          : input.provider.id,
        providerType: input.provider.providerType,
        toolName: input.toolName,
        query: input.query.slice(0, 1000),
        resultCount: input.resultCount,
        creditsCost: cost,
        success: input.success,
        latencyMs: input.latencyMs ?? null,
        errorMessage: input.errorMessage?.slice(0, 2000) ?? null,
      },
    });

    if (cost > 0) {
      this.logger.log(
        `搜索计费 ${input.toolName} user=${input.userId} cost=${cost} balance=${balanceAfter}`,
      );
    }
  }

  /** 环境变量来源的提供者也要落库流水，保证 FK 可用 */
  private async ensureEnvProviderRow(provider: ResolvedSearchProvider): Promise<string> {
    const existing = await this.prisma.searchProvider.findFirst({
      where: { providerType: provider.providerType },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.searchProvider.create({
      data: {
        providerType: provider.providerType,
        name: provider.name,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        enabled: true,
        costPerCall: provider.costPerCall,
        dailyQuota: provider.dailyQuota,
        rateLimitPerMinute: provider.rateLimitPerMinute,
        priority: provider.priority,
      },
    });
    return created.id;
  }
}

function providerCost(provider: ResolvedSearchProvider): number {
  return provider.costPerCall ?? 0;
}

function cryptoRandomId(): string {
  return (
    Date.now().toString(16) + Math.random().toString(16).slice(2, 14)
  ).slice(0, 32);
}
