import { Injectable, Logger } from '@nestjs/common';
import { SearchProvidersService } from '../../search/search-providers.service';
import { SearchBillingService } from '../../search/search-billing.service';
import { TavilyClient } from '../../search/tavily.client';
import { ToolContext } from '../tool.interface';

/**
 * 联网搜索（Tavily）
 * 计费：search_providers.cost_per_call（默认 1 积分/次）
 */
@Injectable()
export class WebSearchTool {
  private readonly logger = new Logger(WebSearchTool.name);

  constructor(
    private readonly providers: SearchProvidersService,
    private readonly billing: SearchBillingService,
    private readonly tavily: TavilyClient,
  ) {}

  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = String(args.query || '').trim();
    const limit = Number(args.limit) || 5;
    if (!query) return { results: [], error: 'query 不能为空' };

    const started = Date.now();
    const provider = await this.providers.getByType('tavily');
    if (!provider) {
      return {
        results: [],
        error: 'Tavily 未启用：请在管理后台「搜索服务」配置 API Key，或设置环境变量 TAVILY_API_KEY',
      };
    }

    try {
      await this.billing.assertQuota(ctx.userId, provider);
      const hits = await this.tavily.search(provider, { query, limit });
      await this.billing.chargeAndLog({
        userId: ctx.userId,
        provider,
        toolName: 'web_search',
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
          publishedDate: h.publishedDate,
          type: 'web',
        })),
        total: hits.length,
        query,
        provider: provider.name,
        creditsCost: provider.costPerCall,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`web_search 失败: ${message}`);
      await this.billing
        .chargeAndLog({
          userId: ctx.userId,
          provider,
          toolName: 'web_search',
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
