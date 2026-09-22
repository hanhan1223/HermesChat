import { Injectable, Logger } from '@nestjs/common';
import { SearchProvidersService, ResolvedSearchProvider } from '../../search/search-providers.service';
import { SearchBillingService } from '../../search/search-billing.service';
import { GoogleSearchClient } from '../../search/google-search.client';
import { TavilyClient } from '../../search/tavily.client';
import { ToolContext } from '../tool.interface';

/**
 * Google 网页搜索
 * 优先 SerpAPI；未配置时自动回退 Tavily
 */
@Injectable()
export class GoogleSearchTool {
  private readonly logger = new Logger(GoogleSearchTool.name);

  constructor(
    private readonly providers: SearchProvidersService,
    private readonly billing: SearchBillingService,
    private readonly google: GoogleSearchClient,
    private readonly tavily: TavilyClient,
  ) {}

  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = String(args.query || '').trim();
    const limit = Number(args.limit) || 5;
    if (!query) return { results: [], error: 'query 不能为空' };

    const started = Date.now();
    const all = await this.providers.listAll();
    let provider: ResolvedSearchProvider | null =
      all.find((p) => p.providerType === 'google' && p.enabled) || null;
    let usedFallback = false;

    if (!provider?.apiKey) {
      provider = all.find((p) => p.providerType === 'tavily' && p.enabled) || null;
      usedFallback = true;
    }

    if (!provider) {
      return {
        results: [],
        error: 'Google 搜索不可用：请配置 SerpAPI（google）或 Tavily',
      };
    }

    try {
      await this.billing.assertQuota(ctx.userId, provider);
      const hits = usedFallback
        ? await this.tavily.search(provider, { query, limit })
        : await this.google.search(provider, { query, limit });

      await this.billing.chargeAndLog({
        userId: ctx.userId,
        provider,
        toolName: 'google_search',
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
          type: 'web',
        })),
        total: hits.length,
        query,
        provider: provider.name,
        via: usedFallback ? 'tavily_fallback' : 'serpapi',
        creditsCost: provider.costPerCall,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`google_search 失败: ${message}`);
      await this.billing
        .chargeAndLog({
          userId: ctx.userId,
          provider,
          toolName: 'google_search',
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
