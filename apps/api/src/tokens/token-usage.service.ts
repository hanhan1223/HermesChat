import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenUsageInput {
  userId: string;
  modelId: string;
  conversationId?: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

/**
 * Token 用量统计：按日 upsert 到 token_usage_stats，供管理后台汇总
 */
@Injectable()
export class TokenUsageService {
  private readonly logger = new Logger(TokenUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: TokenUsageInput): Promise<void> {
    const inputTokens = Math.max(0, Math.floor(input.inputTokens || 0));
    const outputTokens = Math.max(0, Math.floor(input.outputTokens || 0));
    const totalTokens = inputTokens + outputTokens;
    if (totalTokens === 0) return;

    const usageDate = startOfDayUtc();

    const model = await this.prisma.model
      .findUnique({ where: { id: input.modelId }, select: {
        costPerInputToken: true,
        costPerOutputToken: true,
      } })
      .catch(() => null);

    const cost =
      inputTokens * (model?.costPerInputToken || 0) +
      outputTokens * (model?.costPerOutputToken || 0);

    try {
      const existing = await this.prisma.tokenUsageStat.findFirst({
        where: {
          userId: input.userId,
          modelId: input.modelId,
          usageDate,
        },
      });

      if (existing) {
        await this.prisma.tokenUsageStat.update({
          where: { id: existing.id },
          data: {
            inputTokens: { increment: inputTokens },
            outputTokens: { increment: outputTokens },
            totalTokens: { increment: totalTokens },
            messageCount: { increment: 1 },
            conversationCount: input.conversationId ? { increment: 0 } : undefined,
            cost: { increment: cost },
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.tokenUsageStat.create({
          data: {
            id: cryptoId(),
            userId: input.userId,
            modelId: input.modelId,
            usageDate,
            inputTokens,
            outputTokens,
            totalTokens,
            conversationCount: input.conversationId ? 1 : 0,
            messageCount: 1,
            cost,
            creditsConsumed: 0,
          },
        });
      }

      await this.prisma.user.update({
        where: { id: input.userId },
        data: { totalTokenUsed: { increment: totalTokens } },
      });

      this.logger.debug(
        `token usage user=${input.userId} model=${input.modelId} in=${inputTokens} out=${outputTokens} cost=${cost}`,
      );
    } catch (err) {
      this.logger.warn(
        `record token usage failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

function startOfDayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function cryptoId(): string {
  return (
    Date.now().toString(16) + Math.random().toString(16).slice(2, 12)
  ).slice(0, 32);
}
