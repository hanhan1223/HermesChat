import { Injectable, Logger } from '@nestjs/common';
import { ResolvedSearchProvider } from './search-providers.service';

export interface WebSearchHit {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

@Injectable()
export class TavilyClient {
  private readonly logger = new Logger(TavilyClient.name);

  async search(
    provider: ResolvedSearchProvider,
    params: { query: string; limit?: number; searchDepth?: 'basic' | 'advanced' },
  ): Promise<WebSearchHit[]> {
    if (!provider.apiKey) {
      throw new Error('Tavily API Key 未配置（管理后台「搜索服务」或 TAVILY_API_KEY）');
    }

    const base = (provider.baseUrl || 'https://api.tavily.com').replace(/\/+$/, '');
    const res = await fetch(`${base}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: provider.apiKey,
        query: params.query,
        max_results: Math.min(params.limit || 5, 10),
        search_depth: params.searchDepth || 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Tavily API 失败: ${res.status} ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const results = json.results || [];
    this.logger.debug(`Tavily hits=${results.length}`);
    return results.map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      content: r.content || r.snippet || '',
      score: typeof r.score === 'number' ? r.score : undefined,
      publishedDate: r.published_date,
    }));
  }
}
