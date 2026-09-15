import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * RAGFlow HTTP API 客户端
 *
 * 文档解析、分块、向量化、混合检索全部由 RAGFlow 完成，
 * HermesChat 只负责调用 API 和管理业务层映射。
 *
 * API 文档: https://ragflow.io/docs/http_api_reference
 */
@Injectable()
export class RagflowClient {
  private readonly logger = new Logger(RagflowClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get('RAGFLOW_API_URL') || 'http://localhost:9380').replace(/\/+$/, '');
    this.apiKey = this.config.get('RAGFLOW_API_KEY') || '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`RAGFlow API ${method} ${path} failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    // RAGFlow 统一返回 { code, data, message }，code=0 表示成功
    if (json.code !== 0 && json.code !== undefined) {
      throw new Error(`RAGFlow error: ${json.message || 'unknown'}`);
    }
    return json.data !== undefined ? json.data : json;
  }

  // ==================== Dataset（知识库）====================

  async createDataset(params: {
    name: string;
    description?: string;
    embedding_model?: string;
    chunk_method?: string;
  }): Promise<RagflowDataset> {
    return this.request('POST', '/api/v1/datasets', {
      name: params.name,
      description: params.description || '',
      embedding_model: params.embedding_model,
      chunk_method: params.chunk_method || 'naive',
    });
  }

  async listDatasets(params?: { page?: number; page_size?: number; keywords?: string }): Promise<{
    datasets: RagflowDataset[];
    total: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.keywords) qs.set('keywords', params.keywords);
    const data = await this.request<any>('GET', `/api/v1/datasets?${qs.toString()}`);
    // 兼容两种返回格式
    if (Array.isArray(data)) return { datasets: data, total: data.length };
    return { datasets: data.datasets || [], total: data.total ?? 0 };
  }

  async getDataset(datasetId: string): Promise<RagflowDataset> {
    return this.request('GET', `/api/v1/datasets/${datasetId}`);
  }

  async updateDataset(datasetId: string, updates: Partial<{ name: string; description: string; permission: string }>): Promise<RagflowDataset> {
    return this.request('PUT', `/api/v1/datasets/${datasetId}`, updates);
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.request('DELETE', '/api/v1/datasets', { ids: [datasetId] });
  }

  // ==================== Document（文档）====================

  async uploadDocument(datasetId: string, file: Buffer, filename: string): Promise<RagflowDocument> {
    const url = `${this.baseUrl}/api/v1/datasets/${datasetId}/documents`;
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(file)]), filename);

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    const json = await res.json();
    if (json.code !== 0) throw new Error(`RAGFlow upload failed: ${json.message}`);
    return json.data?.[0] || json.data;
  }

  async addTextDocument(datasetId: string, title: string, content: string): Promise<RagflowDocument> {
    // RAGFlow 支持纯文本上传，用 Blob 模拟文件
    const blob = Buffer.from(content, 'utf-8');
    return this.uploadDocument(datasetId, blob, `${title}.txt`);
  }

  async listDocuments(datasetId: string, params?: { page?: number; page_size?: number; keywords?: string }): Promise<{
    docs: RagflowDocument[];
    total: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.keywords) qs.set('keywords', params.keywords);
    const data = await this.request<any>('GET', `/api/v1/datasets/${datasetId}/documents?${qs.toString()}`);
    return { docs: data.docs || [], total: data.total ?? 0 };
  }

  async deleteDocuments(datasetId: string, documentIds: string[]): Promise<void> {
    await this.request('DELETE', `/api/v1/datasets/${datasetId}/documents`, { ids: documentIds });
  }

  async parseDocuments(datasetId: string, documentIds: string[]): Promise<void> {
    await this.request('POST', `/api/v1/datasets/${datasetId}/chunks`, { document_ids: documentIds });
  }

  async stopParsingDocuments(datasetId: string, documentIds: string[]): Promise<void> {
    await this.request('DELETE', `/api/v1/datasets/${datasetId}/chunks`, { document_ids: documentIds });
  }

  // ==================== Retrieval（检索）====================

  /**
   * 知识库检索 — Dify 兼容接口
   * 返回 chunks 含 content / score / title / metadata
   */
  async retrieval(params: {
    datasetIds: string[];
    query: string;
    topK?: number;
    scoreThreshold?: number;
  }): Promise<RagflowRetrievalResult[]> {
    // RAGFlow 的 /retrieval 端点接受多个 dataset_id
    const body: any = {
      question: params.query,
      dataset_ids: params.datasetIds,
      page_size: params.topK || 5,
      similarity_threshold: params.scoreThreshold || 0.0,
    };

    const data = await this.request<any>('POST', '/api/v1/retrieval', body);
    const chunks = data.chunks || data.records || [];
    return chunks.map((c: any) => ({
      content: c.content || c.content_with_weight || '',
      score: c.similarity ?? c.score ?? 0,
      title: c.docnm_kwd || c.title || '',
      documentId: c.doc_id || c.metadata?.document_id || '',
      chunkId: c.chunk_id || c.id || '',
    }));
  }

  /**
   * Dify 兼容检索接口（如果标准接口不可用可切换到这个）
   */
  async difyRetrieval(params: {
    knowledgeId: string;
    query: string;
    topK?: number;
    scoreThreshold?: number;
  }): Promise<{ content: string; score: number; title: string; metadata: any }[]> {
    const data = await this.request<any>('POST', '/api/v1/dify/retrieval', {
      knowledge_id: params.knowledgeId,
      query: params.query,
      retrieval_setting: {
        top_k: params.topK || 5,
        score_threshold: params.scoreThreshold || 0.0,
      },
    });
    return data.records || [];
  }

  // ==================== 健康检查 ====================

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/datasets?page=1&page_size=1`, {
        headers: this.headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ==================== 类型定义 ====================

export interface RagflowDataset {
  id: string;
  name: string;
  description: string;
  embedding_model: string;
  chunk_method: string;
  permission: string;
  document_count: number;
  chunk_count: number;
  create_time?: number;
  update_time?: number;
}

export interface RagflowDocument {
  id: string;
  name: string;
  dataset_id: string;
  chunk_count: number;
  token_count: number;
  run: string; // UNSTART / RUNNING / DONE / FAIL / CANCEL
  progress: number;
  progress_msg: string;
  create_time?: number;
  update_time?: number;
}

export interface RagflowRetrievalResult {
  content: string;
  score: number;
  title: string;
  documentId: string;
  chunkId: string;
}
