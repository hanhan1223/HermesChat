import { Injectable, Logger } from '@nestjs/common';
import { SearchProvidersService } from '../../search/search-providers.service';
import { SearchBillingService } from '../../search/search-billing.service';
import { PubMedClient } from '../../search/pubmed.client';
import { ToolContext } from '../tool.interface';

/**
 * PubMed 文献检索（NCBI E-utilities，免费；可选 NCBI_API_KEY 提速）
 */
@Injectable()
export class PubMedSearchTool {
  private readonly logger = new Logger(PubMedSearchTool.name);

  constructor(
    private readonly providers: SearchProvidersService,
    private readonly billing: SearchBillingService,
    private readonly pubmed: PubMedClient,
  ) {}

  async execute(args: Record<string, unknown>, ctx: ToolContext) {
    const query = String(args.query || '').trim();
    const limit = Number(args.limit) || 5;
    if (!query) return { results: [], error: 'query 不能为空' };

    const started = Date.now();
    // pubmed 在 env 回退里始终存在；库中若禁用则报错
    const all = await this.providers.listAll();
    const provider = all.find((p) => p.providerType === 'pubmed' && p.enabled);
    if (!provider) {
      return {
        results: [],
        error: 'PubMed 检索未启用：请在管理后台「搜索服务」启用 PubMed',
      };
    }

    try {
      await this.billing.assertQuota(ctx.userId, provider);
      const hits = await this.pubmed.search(provider, { query, limit });
      await this.billing.chargeAndLog({
        userId: ctx.userId,
        provider,
        toolName: 'pubmed_search',
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
          type: 'pubmed',
        })),
        total: hits.length,
        query,
        provider: provider.name,
        creditsCost: provider.costPerCall,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`pubmed_search 失败: ${message}`);
      await this.billing
        .chargeAndLog({
          userId: ctx.userId,
          provider,
          toolName: 'pubmed_search',
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
