import { Injectable, Logger } from '@nestjs/common';
import { ResolvedSearchProvider } from './search-providers.service';
import { WebSearchHit } from './tavily.client';

/**
 * Google 网页搜索（SerpAPI）
 * 无 Key 时调用方应回退到 Tavily
 */
@Injectable()
export class GoogleSearchClient {
  private readonly logger = new Logger(GoogleSearchClient.name);

  async search(
    provider: ResolvedSearchProvider,
    params: { query: string; limit?: number },
  ): Promise<WebSearchHit[]> {
    if (!provider.apiKey) {
      throw new Error('SerpAPI Key 未配置（管理后台「搜索服务」或 SERPAPI_API_KEY）');
    }
    const base = (provider.baseUrl || 'https://serpapi.com').replace(/\/+$/, '');
    const limit = Math.min(params.limit || 5, 20);
    const url =
      `${base}/search.json?engine=google&q=${encodeURIComponent(params.query)}` +
      `&num=${limit}&api_key=${encodeURIComponent(provider.apiKey)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SerpAPI Google 失败: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const organic = json.organic_results || [];
    const hits: WebSearchHit[] = organic.map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      content: r.snippet || '',
      score: r.position,
    }));
    this.logger.debug(`Google hits=${hits.length}`);
    return hits;
  }
}
