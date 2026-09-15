import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 会话全文搜索服务
 *
 * 使用 PostgreSQL 内置全文搜索（tsvector + tsquery），无需额外扩展。
 * 支持中英文混合搜索，按相关度排序。
 *
 * 实现方式:
 *   1. 消息内容写入时同步更新 search_vector 列（触发器或应用层）
 *   2. 查询时用 plainto_tsquery 构建查询向量
 *   3. 用 ts_rank 计算相关度并排序
 *
 * 性能:
 *   - GIN 索引加速 tsvector 检索
 *   - 支持分页
 *   - 可按会话/时间范围过滤
 */
@Injectable()
export class ConversationSearchService {
  private readonly logger = new Logger(ConversationSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全文搜索消息内容
   *
   * @param params 搜索参数
   * @returns 匹配的消息列表（含高亮摘要）
   */
  async searchMessages(params: {
    userId: string;
    query: string;
    conversationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResult[]> {
    const { userId, query, conversationId, limit = 20, offset = 0 } = params;

    if (!query || query.trim().length === 0) return [];

    // 构建查询：支持中英文
    // websearch_to_tsquery 更适合用户自然语言输入
    const searchQuery = this.buildSearchQuery(query);

    // 基础过滤条件
    const conversationFilter = conversationId
      ? `AND m.conversation_id = '${conversationId.replace(/'/g, "''")}'`
      : '';

    // 使用原生 SQL 全文搜索
    const sql = `
      SELECT
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.created_at,
        c.title as conversation_title,
        ts_rank(
          to_tsvector('simple', m.content),
          to_tsquery('simple', $1)
        ) as rank,
        ts_headline(
          'simple',
          m.content,
          to_tsquery('simple', $1),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=3'
        ) as highlighted
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = $2
        ${conversationFilter}
        AND to_tsvector('simple', m.content) @@ to_tsquery('simple', $1)
      ORDER BY rank DESC, m.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        sql,
        searchQuery,
        userId,
        limit,
        offset,
      );

      return rows.map((row) => ({
        messageId: row.id,
        conversationId: row.conversation_id,
        conversationTitle: row.conversation_title,
        role: row.role,
        content: row.content.substring(0, 500),
        highlighted: row.highlighted || row.content.substring(0, 200),
        rank: parseFloat(row.rank) || 0,
        createdAt: row.created_at,
      }));
    } catch (error) {
      this.logger.error(`全文搜索失败: ${error instanceof Error ? error.message : error}`);
      // 降级为 LIKE 搜索
      return this.fallbackSearch(userId, query, conversationId, limit, offset);
    }
  }

  /**
   * 搜索会话标题
   */
  async searchConversations(params: {
    userId: string;
    query: string;
    limit?: number;
  }): Promise<ConversationSearchResult[]> {
    const { userId, query, limit = 10 } = params;

    try {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            {
              messages: {
                some: {
                  content: { contains: query, mode: 'insensitive' },
                },
              },
            },
          ],
        },
        include: {
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return conversations.map((c) => ({
        conversationId: c.id,
        title: c.title,
        messageCount: c._count.messages,
        updatedAt: c.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`会话搜索失败: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * 初始化全文搜索索引
   * 在数据库迁移时调用，创建 GIN 索引加速检索
   */
  async initializeSearchIndex(): Promise<void> {
    try {
      // 创建 GIN 索引（幂等）
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_messages_search_vector
        ON messages USING GIN (to_tsvector('simple', content))
      `);

      this.logger.log('全文搜索索引初始化完成');
    } catch (error) {
      this.logger.warn(`索引初始化失败（可能已存在）: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 构建 tsquery 字符串
   * 处理中英文混合、特殊字符
   */
  private buildSearchQuery(query: string): string {
    // 移除 tsquery 特殊字符
    const cleaned = query
      .replace(/[&|!():<>@~*']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return '';

    // 分词：按空格分割，每个词加 & 连接（AND 语义）
    const terms = cleaned
      .split(' ')
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/"/g, ''));

    return terms.join(' & ');
  }

  /**
   * LIKE 降级搜索（全文搜索不可用时）
   */
  private async fallbackSearch(
    userId: string,
    query: string,
    conversationId?: string,
    limit = 20,
    offset = 0,
  ): Promise<SearchResult[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversation: {
          userId,
          ...(conversationId ? { id: conversationId } : {}),
        },
        content: { contains: query, mode: 'insensitive' },
      },
      include: {
        conversation: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return messages.map((m) => ({
      messageId: m.id,
      conversationId: m.conversationId,
      conversationTitle: m.conversation.title,
      role: m.role,
      content: m.content.substring(0, 500),
      highlighted: this.highlightText(m.content, query),
      rank: 0.5,
      createdAt: m.createdAt,
    }));
  }

  /**
   * 简单文本高亮
   */
  private highlightText(text: string, query: string): string {
    const terms = query.split(' ').filter((t) => t.length > 1);
    let result = text.substring(0, 200);
    for (const term of terms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    }
    return result;
  }
}

// ==================== 类型定义 ====================

export interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  role: string;
  content: string;
  highlighted: string;
  rank: number;
  createdAt: Date;
}

export interface ConversationSearchResult {
  conversationId: string;
  title: string;
  messageCount: number;
  updatedAt: Date;
}
