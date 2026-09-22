import { Injectable, Logger } from '@nestjs/common';
import { ResolvedSearchProvider } from './search-providers.service';
import { WebSearchHit } from './tavily.client';

/**
 * PubMed / NCBI E-utilities
 * 免费；有 NCBI_API_KEY 时 RPS 更高（10/s vs 3/s）
 */
@Injectable()
export class PubMedClient {
  private readonly logger = new Logger(PubMedClient.name);

  async search(
    provider: ResolvedSearchProvider,
    params: { query: string; limit?: number },
  ): Promise<WebSearchHit[]> {
    const base = (provider.baseUrl || 'https://eutils.ncbi.nlm.nih.gov').replace(/\/+$/, '');
    const limit = Math.min(params.limit || 5, 20);
    const keyQuery = provider.apiKey ? `&api_key=${encodeURIComponent(provider.apiKey)}` : '';

    const esearchUrl =
      `${base}/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}` +
      `&term=${encodeURIComponent(params.query)}${keyQuery}`;

    const esearchRes = await fetch(esearchUrl, { signal: AbortSignal.timeout(15_000) });
    if (!esearchRes.ok) {
      throw new Error(`PubMed esearch 失败: ${esearchRes.status}`);
    }
    const esearch = await esearchRes.json();
    const ids: string[] = esearch?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const efetchUrl =
      `${base}/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json` +
      `&id=${ids.join(',')}${keyQuery}`;
    const efetchRes = await fetch(efetchUrl, { signal: AbortSignal.timeout(15_000) });
    if (!efetchRes.ok) {
      throw new Error(`PubMed esummary 失败: ${efetchRes.status}`);
    }
    const summary = await efetchRes.json();
    const result = summary?.result || {};

    const hits: WebSearchHit[] = [];
    for (const id of ids) {
      const item = result[id];
      if (!item) continue;
      const authors = (item.authors || [])
        .slice(0, 3)
        .map((a: any) => a.name)
        .join(', ');
      hits.push({
        title: item.title || `PMID:${id}`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        content: [
          authors ? `作者: ${authors}` : '',
          item.fulljournalname || item.source || '',
          item.pubdate ? `发表: ${item.pubdate}` : '',
          `PMID: ${id}`,
        ]
          .filter(Boolean)
          .join(' | '),
      });
    }

    this.logger.debug(`PubMed hits=${hits.length}`);
    return hits;
  }
}
