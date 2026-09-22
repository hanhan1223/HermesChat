import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type BillingMode = 'FREE' | 'TRIAL_THEN_PAID';

export interface BillingConfig {
  mode: BillingMode;
  trialDays: number;
  trialCredits: number;
}

export interface QuotaOverview {
  credits: number;
  totalTokenUsed: number;
  billingMode: BillingMode;
  freeAccess: boolean;
  inTrial: boolean;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  trialDays: number;
  trialCredits: number;
  canUse: boolean;
  requirePurchase: boolean;
}

export interface TokenUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  creditsConsumed: number;
  messageCount: number;
  daily: Array<{
    usageDate: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  }>;
}

const DEFAULT_BILLING: BillingConfig = {
  mode: 'TRIAL_THEN_PAID',
  trialDays: 7,
  trialCredits: 100,
};

function normalizeMode(raw: unknown): BillingMode {
  const s = String(raw || '').toUpperCase();
  return s === 'FREE' ? 'FREE' : 'TRIAL_THEN_PAID';
}

/**
 * 用户端额度 / Token 用量 / 购买申请
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBillingConfig(): Promise<BillingConfig> {
    const row = await this.prisma.billingConfig.findUnique({ where: { id: 'default' } });
    if (!row) return { ...DEFAULT_BILLING };
    return {
      mode: normalizeMode(row.mode),
      trialDays: row.trialDays ?? DEFAULT_BILLING.trialDays,
      trialCredits: row.trialCredits ?? DEFAULT_BILLING.trialCredits,
    };
  }

  async getQuotaOverview(userId: string): Promise<QuotaOverview> {
    const [user, config] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          totalTokenUsed: true,
          freeAccess: true,
          billingMode: true,
          trialStartAt: true,
          trialEndAt: true,
        },
      }),
      this.getBillingConfig(),
    ]);

    if (!user) throw new NotFoundException('用户不存在');

    const effectiveMode = user.billingMode ? normalizeMode(user.billingMode) : config.mode;
    const freeAccess = !!user.freeAccess;
    const now = Date.now();
    const startAt = user.trialStartAt ? new Date(user.trialStartAt).getTime() : NaN;
    const endAt = user.trialEndAt ? new Date(user.trialEndAt).getTime() : NaN;
    const inTrial = !!(
      effectiveMode === 'TRIAL_THEN_PAID' &&
      Number.isFinite(startAt) &&
      Number.isFinite(endAt) &&
      now >= startAt &&
      now <= endAt
    );

    const canUse = effectiveMode === 'FREE' || freeAccess || inTrial || user.credits > 0;
    const requirePurchase = effectiveMode === 'TRIAL_THEN_PAID' && !freeAccess && !inTrial;

    return {
      credits: user.credits,
      totalTokenUsed: Number(user.totalTokenUsed || 0),
      billingMode: effectiveMode,
      freeAccess,
      inTrial,
      trialStartAt: user.trialStartAt,
      trialEndAt: user.trialEndAt,
      trialDays: config.trialDays,
      trialCredits: config.trialCredits,
      canUse,
      requirePurchase,
    };
  }

  async getTokenUsage(userId: string, days = 30): Promise<TokenUsageSummary> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (Math.max(1, days) - 1));

    const rows = await this.prisma.tokenUsageStat.findMany({
      where: { userId, usageDate: { gte: start } },
      orderBy: { usageDate: 'asc' },
    });

    const dailyMap = new Map<
      string,
      { usageDate: string; inputTokens: number; outputTokens: number; totalTokens: number; cost: number }
    >();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let creditsConsumed = 0;
    let messageCount = 0;

    for (const row of rows) {
      const key = row.usageDate.toISOString().slice(0, 10);
      const input = Number(row.inputTokens || 0);
      const output = Number(row.outputTokens || 0);
      const total = Number(row.totalTokens || 0);
      const cost = Number(row.cost || 0);
      totalInputTokens += input;
      totalOutputTokens += output;
      totalTokens += total;
      totalCost += cost;
      creditsConsumed += row.creditsConsumed || 0;
      messageCount += row.messageCount || 0;

      const bucket = dailyMap.get(key) || {
        usageDate: key,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
      };
      bucket.inputTokens += input;
      bucket.outputTokens += output;
      bucket.totalTokens += total;
      bucket.cost += cost;
      dailyMap.set(key, bucket);
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      creditsConsumed,
      messageCount,
      daily: Array.from(dailyMap.values()),
    };
  }

  async getTransactions(userId: string, limit = 50) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }

  async listPurchaseRequests(userId: string) {
    return this.prisma.creditPurchaseRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseRequest(
    userId: string,
    data: { amount: number; note?: string; contact?: string },
  ) {
    const amount = Math.floor(Number(data?.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('申请额度必须大于 0');
    }
    if (amount > 1_000_000) {
      throw new BadRequestException('单次申请不能超过 100 万');
    }

    const pending = await this.prisma.creditPurchaseRequest.count({
      where: { userId, status: 'PENDING' },
    });
    if (pending >= 3) {
      throw new BadRequestException('待处理申请过多，请等待管理员处理后再提交');
    }

    return this.prisma.creditPurchaseRequest.create({
      data: {
        userId,
        amount,
        note: data.note ? String(data.note).slice(0, 2000) : null,
        contact: data.contact ? String(data.contact).slice(0, 128) : null,
        status: 'PENDING',
      },
    });
  }
}
