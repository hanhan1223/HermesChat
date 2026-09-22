import { Injectable, Logger } from '@nestjs/common';
import { SearchProvidersService } from '../../search/search-providers.service';
import { SearchBillingService } from '../../search/search-billing.service';
import { ScholarClient } from '../../search/scholar.client';
import { ToolContext } from '../tool.interface';

/**
 * 学术文献检索
 * source=google_scholar → SerpAPI（付费）
 * source=semantic_scholar（默认）→ Semantic Scholar（免费）
 */
@Injectable()
export class ScholarSearchTool {
  private readonly logger = new Logger(ScholarSearchTool.name);

  constructor(
    private readonly providers: SearchProvidersService,
    private readonly billing: SearchBillingService,
    private readonly scholar: ScholarClient,
  ) {}

  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = String(args.query || '').trim();
    const limit = Number(args.limit) || 5;
    const source = String(args.source || 'semantic_scholar');
    if (!query) return { results: [], error: 'query 不能为空' };

    const started = Date.now();
    const all = await this.providers.listAll();
    const useGoogle = source === 'google_scholar' || source === 'scholar';
    const type = useGoogle ? 'scholar' : 'semantic_scholar';
    const provider = all.find((p) => p.providerType === type && p.enabled);

    if (!provider) {
      return {
        results: [],
        error: useGoogle
          ? 'Google Scholar 未配置：请在管理后台配置 SerpAPI，或改用 source=semantic_scholar'
          : 'Semantic Scholar 未启用',
      };
    }

    try {
      await this.billing.assertQuota(ctx.userId, provider);
      const hits = useGoogle
        ? await this.scholar.searchGoogleScholar(provider, { query, limit })
        : await this.scholar.searchSemanticScholar(provider, { query, limit });

      await this.billing.chargeAndLog({
        userId: ctx.userId,
        provider,
        toolName: 'scholar_search',
        query,
        resultCount: hits.length,
        success: true,
        latencyMs: Date.now() - started,
      });

      return {
        results: hits.map((h) => ({
          title: h.title,
          url: h.url,
          snippet: h.content,
          score: h.score,
          type: 'scholar',
          source: useGoogle ? 'google_scholar' : 'semantic_scholar',
        })),
        total: hits.length,
        query,
        provider: provider.name,
        creditsCost: provider.costPerCall,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`scholar_search 失败: ${message}`);
      await this.billing
        .chargeAndLog({
          userId: ctx.userId,
          provider,
          toolName: 'scholar_search',
          query,
          resultCount: 0,
          success: false,
          latencyMs: Date.now() - started,
          errorMessage: message,
        })
        .catch(() => undefined);
      return { results: [], error: message, query };
    }
  }
}
