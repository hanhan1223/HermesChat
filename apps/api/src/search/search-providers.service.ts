import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export type SearchProviderType =
  | 'tavily'
  | 'pubmed'
  | 'google'
  | 'scholar'
  | 'semantic_scholar';

export interface ResolvedSearchProvider {
  id: string;
  providerType: SearchProviderType;
  name: string;
  apiKey: string | null;
  baseUrl: string | null;
  enabled: boolean;
  costPerCall: number;
  dailyQuota: number | null;
  rateLimitPerMinute: number;
  priority: number;
  config: Record<string, unknown> | null;
  source: 'db' | 'env';
}

/**
 * 搜索提供者配置：优先读库（管理后台可改），缺省回退环境变量
 */
@Injectable()
export class SearchProvidersService {
  private readonly logger = new Logger(SearchProvidersService.name);
  private cache: { data: ResolvedSearchProvider[]; at: number } | null = null;
  private readonly cacheTtlMs = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listAll(force = false): Promise<ResolvedSearchProvider[]> {
    if (!force && this.cache && Date.now() - this.cache.at < this.cacheTtlMs) {
      return this.cache.data;
    }

    let rows: ResolvedSearchProvider[] = [];
    try {
      const found = await this.prisma.searchProvider.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      rows = found.map((r) => ({
        id: r.id,
        providerType: r.providerType as SearchProviderType,
        name: r.name,
        apiKey: r.apiKey,
        baseUrl: r.baseUrl,
        enabled: r.enabled,
        costPerCall: r.costPerCall,
        dailyQuota: r.dailyQuota,
        rateLimitPerMinute: r.rateLimitPerMinute,
        priority: r.priority,
        config: (r.config as Record<string, unknown>) || null,
        source: 'db' as const,
      }));
    } catch (err) {
      this.logger.warn(
        `读取 search_providers 失败，回退环境变量: ${err instanceof Error ? err.message : err}`,
      );
    }

    const byType = new Map(rows.map((r) => [r.providerType, r]));
    for (const envProvider of this.fromEnv()) {
      const existing = byType.get(envProvider.providerType);
      if (!existing) {
        rows.push(envProvider);
        byType.set(envProvider.providerType, envProvider);
      } else if (!existing.apiKey && envProvider.apiKey) {
        // 库里未填 Key 时，用环境变量补齐（管理后台可覆盖）
        existing.apiKey = envProvider.apiKey;
      }
    }

    this.cache = { data: rows, at: Date.now() };
    return rows;
  }

  async getByType(type: SearchProviderType, force = false): Promise<ResolvedSearchProvider | null> {
    const all = await this.listAll(force);
    return all.find((p) => p.providerType === type && p.enabled) || null;
  }

  invalidate() {
    this.cache = null;
  }

  private fromEnv(): ResolvedSearchProvider[] {
    const list: ResolvedSearchProvider[] = [];
    const tavily = this.config.get<string>('TAVILY_API_KEY');
    if (tavily) {
      list.push(
        this.envProvider(
          'tavily',
          'Tavily Web Search',
          tavily,
          this.config.get<string>('TAVILY_API_BASE') || null,
          1,
        ),
      );
    }
    const ncbi = this.config.get<string>('NCBI_API_KEY');
    list.push(this.envProvider('pubmed', 'PubMed (NCBI)', ncbi || null, 'https://eutils.ncbi.nlm.nih.gov', 0));
    const serp = this.config.get<string>('SERPAPI_API_KEY');
    if (serp) {
      list.push(this.envProvider('google', 'Google / SerpAPI', serp, 'https://serpapi.com', 2));
      list.push(this.envProvider('scholar', 'Google Scholar / SerpAPI', serp, 'https://serpapi.com', 2));
    }
    list.push(
      this.envProvider(
        'semantic_scholar',
        'Semantic Scholar',
        this.config.get<string>('SEMANTIC_SCHOLAR_API_KEY') || null,
        'https://api.semanticscholar.org',
        0,
      ),
    );
    return list;
  }

  private envProvider(
    providerType: SearchProviderType,
    name: string,
    apiKey: string | null,
    baseUrl: string | null,
    costPerCall: number,
  ): ResolvedSearchProvider {
    return {
      id: `env_${providerType}`,
      providerType,
      name,
      apiKey,
      baseUrl,
      enabled: true,
      costPerCall,
      dailyQuota: null,
      rateLimitPerMinute: 30,
      priority: 0,
      config: null,
      source: 'env',
    };
  }
}
