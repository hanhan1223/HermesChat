import { Injectable, Logger } from '@nestjs/common';
import { ResolvedSearchProvider } from './search-providers.service';
import { WebSearchHit } from './tavily.client';

/**
 * 学术检索：
 * - scholar: SerpAPI Google Scholar（付费）
 * - semantic_scholar: Semantic Scholar Graph API（免费，可选 key）
 */
@Injectable()
export class ScholarClient {
  private readonly logger = new Logger(ScholarClient.name);

  async searchGoogleScholar(
    provider: ResolvedSearchProvider,
    params: { query: string; limit?: number },
  ): Promise<WebSearchHit[]> {
    if (!provider.apiKey) {
      throw new Error('SerpAPI Key 未配置（管理后台「搜索服务」或 SERPAPI_API_KEY）');
    }
    const base = (provider.baseUrl || 'https://serpapi.com').replace(/\/+$/, '');
    const limit = Math.min(params.limit || 5, 20);
    const url =
      `${base}/search.json?engine=google_scholar&q=${encodeURIComponent(params.query)}` +
      `&num=${limit}&api_key=${encodeURIComponent(provider.apiKey)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SerpAPI Scholar 失败: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const organic = json.organic_results || [];
    const hits: WebSearchHit[] = organic.map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      content: [
        r.publication_info?.summary || '',
        r.snippet || '',
        r.inline_links?.cited_by?.total
          ? `被引: ${r.inline_links.cited_by.total}`
          : '',
      ]
        .filter(Boolean)
        .join(' | '),
      score: r.position,
    }));
    this.logger.debug(`Scholar hits=${hits.length}`);
    return hits;
  }

  async searchSemanticScholar(
    provider: ResolvedSearchProvider,
    params: { query: string; limit?: number },
  ): Promise<WebSearchHit[]> {
    const base = (provider.baseUrl || 'https://api.semanticscholar.org').replace(/\/+$/, '');
    const limit = Math.min(params.limit || 5, 20);
    const url =
      `${base}/graph/v1/paper/search?query=${encodeURIComponent(params.query)}` +
      `&limit=${limit}&fields=title,abstract,url,year,authors,citationCount,externalIds`;

    const headers: Record<string, string> = {};
    if (provider.apiKey) headers['x-api-key'] = provider.apiKey;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Semantic Scholar 失败: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const data = json.data || [];
    const hits: WebSearchHit[] = data.map((p: any) => {
      const authors = (p.authors || []).slice(0, 3).map((a: any) => a.name).join(', ');
      const doi = p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null;
      return {
        title: p.title || '',
        url: p.url || doi || '',
        content: [
          authors ? `作者: ${authors}` : '',
          p.year ? `年份: ${p.year}` : '',
          p.citationCount != null ? `被引: ${p.citationCount}` : '',
          (p.abstract || '').slice(0, 240),
        ]
          .filter(Boolean)
          .join(' | '),
        score: p.citationCount,
      };
    });
    this.logger.debug(`SemanticScholar hits=${hits.length}`);
    return hits;
  }
}
