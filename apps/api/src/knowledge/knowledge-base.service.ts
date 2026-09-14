import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

/**
 * 知识库服务 — Dify 式 RAG 管理
 *
 * 功能:
 * 1. 知识库 CRUD
 * 2. 文档上传 + 分块
 * 3. 向量检索（简化版：关键词匹配，生产用 pgvector）
 * 4. 文档嵌入索引
 */
@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 知识库 CRUD ====================

  async createDataset(params: { userId: string; name: string; description?: string }) {
    return this.prisma.knowledgeDataset.create({
      data: {
        id: uuid().replace(/-/g, ''),
        userId: params.userId,
        name: params.name,
        description: params.description || '',
      },
    });
  }

  async listDatasets(userId: string) {
    return this.prisma.knowledgeDataset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async getDataset(id: string, userId: string) {
    return this.prisma.knowledgeDataset.findFirst({
      where: { id, userId },
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async deleteDataset(id: string, userId: string) {
    return this.prisma.knowledgeDataset.deleteMany({ where: { id, userId } });
  }

  // ==================== 文档管理 ====================

  async addDocument(params: {
    datasetId: string;
    userId: string;
    title: string;
    content: string;
    sourceType?: string;
    metadata?: Record<string, unknown>;
  }) {
    // 验证知识库归属
    const dataset = await this.prisma.knowledgeDataset.findFirst({
      where: { id: params.datasetId, userId: params.userId },
    });
    if (!dataset) throw new Error('知识库不存在或无权访问');

    // 分块
    const chunks = this.chunkText(params.content, 500, 50);

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        id: uuid().replace(/-/g, ''),
        datasetId: params.datasetId,
        userId: params.userId,
        title: params.title,
        content: params.content,
        chunkCount: chunks.length,
        sourceType: params.sourceType || 'manual',
        metadata: params.metadata as any,
      },
    });

    // 保存分块
    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.knowledgeChunk.create({
        data: {
          id: uuid().replace(/-/g, ''),
          documentId: doc.id,
          datasetId: params.datasetId,
          userId: params.userId,
          content: chunks[i],
          chunkIndex: i,
        },
      });
    }

    this.logger.log(`Document added: ${params.title} (${chunks.length} chunks)`);
    return doc;
  }

  async deleteDocument(id: string, userId: string) {
    return this.prisma.knowledgeDocument.deleteMany({ where: { id, userId } });
  }

  async listDocuments(datasetId: string, userId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { datasetId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== RAG 检索 ====================

  /**
   * 检索相关知识块
   * 简化版：关键词匹配。生产环境应使用 pgvector 向量相似度检索。
   */
  async search(params: {
    userId: string;
    datasetIds?: string[];
    query: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    const limit = params.limit || 5;
    const keywords = params.query.toLowerCase().split(/\s+/).filter(k => k.length > 1);

    const where: any = { userId: params.userId };
    if (params.datasetIds && params.datasetIds.length > 0) {
      where.datasetId = { in: params.datasetIds };
    }

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where,
      include: { document: { select: { title: true, sourceType: true } } },
      take: 200, // 取更多再排序
    });

    // 关键词评分
    const scored = chunks.map(chunk => {
      const content = chunk.content.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (content.includes(kw)) score += 1;
        // 完整短语匹配加权
        if (content.includes(params.query.toLowerCase())) score += 2;
      }
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        content: chunk.content,
        score: keywords.length > 0 ? score / keywords.length : 0,
      };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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

  // ==================== 文本分块 ====================

  /**
   * 滑动窗口分块
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));

      if (end >= text.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}
