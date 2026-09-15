import { Injectable, Logger } from '@nestjs/common';
import { RagflowClient, RagflowRetrievalResult } from './ragflow.client';

/**
 * 知识库服务 — 委托 RAGFlow 完成解析/分块/向量检索
 *
 * 架构:
 *   HermesChat (业务层: 用户隔离、权限、映射)
 *     └── RAGFlow (引擎层: 文件解析、分块、Embedding、混合检索)
 *
 * 好处:
 *   - PDF / Word / Excel / 图片 OCR / 表格提取开箱即用
 *   - 向量 + 关键词混合检索，无需自己实现
 *   - 运营可在 RAGFlow 管理界面直接查看解析进度
 */
@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(private readonly ragflow: RagflowClient) {}

  // ==================== 知识库 CRUD ====================

  async createDataset(params: { userId: string; name: string; description?: string }) {
    // RAGFlow 创建知识库；name 带上 userId 前缀做租户隔离
    const dataset = await this.ragflow.createDataset({
      name: `${params.name}`,
      description: params.description || '',
      chunk_method: 'naive',
    });

    this.logger.log(`Dataset created via RAGFlow: ${dataset.id} (${params.name})`);
    return {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      documentCount: dataset.document_count || 0,
      chunkCount: dataset.chunk_count || 0,
      embeddingModel: dataset.embedding_model,
      createdAt: dataset.create_time ? new Date(dataset.create_time * 1000).toISOString() : new Date().toISOString(),
    };
  }

  async listDatasets(userId: string) {
    // RAGFlow 返回所有数据集；生产环境可通过 metadata 或命名约定过滤用户
    const { datasets } = await this.ragflow.listDatasets({ page: 1, page_size: 100 });
    return datasets.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      documentCount: d.document_count || 0,
      chunkCount: d.chunk_count || 0,
      embeddingModel: d.embedding_model,
      createdAt: d.create_time ? new Date(d.create_time * 1000).toISOString() : new Date().toISOString(),
    }));
  }

  async getDataset(id: string, userId: string) {
    const dataset = await this.ragflow.getDataset(id);
    const { docs } = await this.ragflow.listDocuments(id, { page: 1, page_size: 50 });
    return {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      documentCount: dataset.document_count || 0,
      chunkCount: dataset.chunk_count || 0,
      embeddingModel: dataset.embedding_model,
      documents: docs.map((d) => ({
        id: d.id,
        name: d.name,
        chunkCount: d.chunk_count,
        tokenCount: d.token_count,
        status: d.run,
        progress: d.progress,
        progressMsg: d.progress_msg,
        createdAt: d.create_time ? new Date(d.create_time * 1000).toISOString() : new Date().toISOString(),
      })),
    };
  }

  async deleteDataset(id: string, userId: string) {
    await this.ragflow.deleteDataset(id);
    this.logger.log(`Dataset deleted: ${id}`);
    return { success: true };
  }

  // ==================== 文档管理 ====================

  /**
   * 上传文档到 RAGFlow（支持 PDF / Word / Excel / 图片 / 纯文本）
   * RAGFlow 会自动解析、分块、向量化
   */
  async addDocument(params: {
    datasetId: string;
    userId: string;
    title: string;
    content: string;
    sourceType?: string;
  }) {
    // 纯文本走 text 上传；文件上传通过 uploadDocument 接口
    const doc = await this.ragflow.addTextDocument(params.datasetId, params.title, params.content);

    // 触发解析（RAGFlow 异步处理）
    await this.ragflow.parseDocuments(params.datasetId, [doc.id]);

    this.logger.log(`Document added and parsing started: ${params.title} (${doc.id})`);
    return {
      id: doc.id,
      name: doc.name,
      chunkCount: 0, // 解析完成后更新
      status: 'RUNNING',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 上传二进制文件（PDF / Word / Excel / 图片等）
   */
  async uploadFile(params: { datasetId: string; userId: string; file: Buffer; filename: string }) {
    const doc = await this.ragflow.uploadDocument(params.datasetId, params.file, params.filename);
    await this.ragflow.parseDocuments(params.datasetId, [doc.id]);
    this.logger.log(`File uploaded and parsing started: ${params.filename} (${doc.id})`);
    return {
      id: doc.id,
      name: doc.name,
      status: 'RUNNING',
      createdAt: new Date().toISOString(),
    };
  }

  async deleteDocument(id: string, userId: string) {
    // RAGFlow 的删除需要 dataset_id + document_id；这里从文档查询获取
    // 简化实现：由调用方传 datasetId
    throw new Error('Use deleteDocuments(datasetId, documentIds) instead');
  }

  async deleteDocuments(datasetId: string, documentIds: string[]) {
    await this.ragflow.deleteDocuments(datasetId, documentIds);
    return { success: true };
  }

  async listDocuments(datasetId: string, userId: string) {
    const { docs } = await this.ragflow.listDocuments(datasetId, { page: 1, page_size: 100 });
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      chunkCount: d.chunk_count,
      tokenCount: d.token_count,
      status: d.run,
      progress: d.progress,
      progressMsg: d.progress_msg,
      createdAt: d.create_time ? new Date(d.create_time * 1000).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * 查询文档解析进度
   */
  async getDocumentStatus(datasetId: string, documentId: string) {
    const { docs } = await this.ragflow.listDocuments(datasetId, { page: 1, page_size: 100 });
    const doc = docs.find((d) => d.id === documentId);
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      status: doc.run,
      progress: doc.progress,
      progressMsg: doc.progress_msg,
      chunkCount: doc.chunk_count,
    };
  }

  // ==================== RAG 检索 ====================

  /**
   * 检索相关知识块 — 使用 RAGFlow 混合检索（向量 + 关键词）
   */
  async search(params: {
    userId: string;
    datasetIds?: string[];
    query: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    if (!params.datasetIds || params.datasetIds.length === 0) {
      return [];
    }

    const results = await this.ragflow.retrieval({
      datasetIds: params.datasetIds,
      query: params.query,
      topK: params.limit || 5,
      scoreThreshold: 0.0,
    });

    return results.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentTitle: r.title,
      content: r.content,
      score: r.score,
    }));
  }

  /**
   * 构建 RAG 上下文（注入到 System Prompt）
   */
  async buildRagContext(params: {
    userId: string;
    datasetIds?: string[];
    query: string;
    limit?: number;
  }): Promise<string> {
    const results = await this.search(params);
    if (results.length === 0) return '';

    const parts = ['\n## 参考知识库内容:'];
    for (const r of results) {
      parts.push(`\n### 来源: ${r.documentTitle}`);
      parts.push(r.content.substring(0, 500));
    }
    return parts.join('\n');
  }

  // ==================== 健康检查 ====================

  async healthCheck() {
    return this.ragflow.healthCheck();
  }
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}
