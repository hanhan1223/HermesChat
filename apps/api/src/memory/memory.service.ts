import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 三层记忆架构服务
 * 
 * Layer 1 - Working Memory (工作记忆): 当前对话上下文
 * Layer 2 - Episodic Memory (情景记忆): 跨会话对话摘要
 * Layer 3 - Semantic Memory (语义记忆): 知识库 RAG
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Layer 1: Working Memory ====================

  /**
   * 获取当前对话的工作记忆（最近 N 条消息）
   */
  async getWorkingMemory(conversationId: string, limit = 20) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== Layer 2: Episodic Memory ====================

  /**
   * 搜索情景记忆 - 基于用户历史对话摘要
   * 使用时间衰减算法：越新的记忆权重越高
   */
  async searchEpisodicMemory(userId: string, query: string, limit = 5) {
    // 获取用户的所有情景记忆，按重要度和时间排序
    const memories = await this.prisma.episodicMemory.findMany({
      where: { userId },
      orderBy: [
        { importance: 'desc' },
        { lastAccessed: 'desc' },
      ],
      take: limit * 3, // 取更多，然后过滤
    });

    // 简单的关键词匹配（生产环境应使用向量检索）
    const keywords = query.toLowerCase().split(/\s+/);
    const scored = memories.map(memory => {
      const summary = memory.summary.toLowerCase();
      const matchScore = keywords.reduce((score, kw) => {
        return score + (summary.includes(kw) ? 1 : 0);
      }, 0);
      
      // 时间衰减因子 (半衰期 30 天)
      const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 86400);
      const timeDecay = Math.pow(0.5, daysSinceAccess / 30);
      
      return {
        ...memory,
        relevanceScore: (matchScore / keywords.length) * timeDecay * memory.importance,
      };
    });

    // 按相关度排序并返回 top N
    return scored
      .filter(m => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * 保存对话摘要到情景记忆
   */
  async saveEpisodicMemory(params: {
    userId: string;
    conversationId: string;
    summary: string;
    keyTopics: string[];
    importance?: number;
  }) {
    return this.prisma.episodicMemory.create({
      data: {
        userId: params.userId,
        conversationId: params.conversationId,
        summary: params.summary,
        keyTopics: params.keyTopics,
        importance: params.importance ?? 0.5,
      },
    });
  }

  /**
   * 更新记忆访问记录（用于时间衰减计算）
   */
  async touchMemory(memoryId: string) {
    return this.prisma.episodicMemory.update({
      where: { id: memoryId },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
  }

  // ==================== Layer 3: Semantic Memory ====================

  /**
   * 搜索语义记忆 - 知识库检索
   */
  async searchSemanticMemory(userId: string, query: string, limit = 5) {
    // 生产环境应使用 pgvector 向量检索
    // 此处使用简单的关键词匹配作为基础实现
    const keywords = query.toLowerCase().split(/\s+/);
    
    const memories = await this.prisma.semanticMemory.findMany({
      where: {
        userId,
        OR: keywords.map(kw => ({
          content: { contains: kw, mode: 'insensitive' },
        })),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return memories;
  }

  /**
   * 索引知识到语义记忆
   */
  async indexSemanticMemory(params: {
    userId: string;
    content: string;
    sourceType: string;
    sourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.semanticMemory.create({
      data: {
        userId: params.userId,
        content: params.content,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        metadata: params.metadata as any,
      },
    });
  }

  // ==================== 用户偏好 ====================

  /**
   * 获取用户偏好
   */
  async getUserPreference(userId: string) {
    return this.prisma.userPreference.findUnique({
      where: { userId },
    });
  }

  /**
   * 更新用户偏好
   */
  async updateUserPreference(userId: string, updates: Record<string, unknown>) {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, preferences: updates as any },
      update: { preferences: updates as any },
    });
  }

  // ==================== 综合检索 ====================

  /**
   * 构建完整的 Agent 上下文（三层记忆融合）
   */
  async buildFullContext(params: {
    userId: string;
    conversationId: string;
    query: string;
  }) {
    const { userId, conversationId, query } = params;

    // 并行检索三层记忆
    const [working, episodes, semantic, preferences] = await Promise.all([
      this.getWorkingMemory(conversationId),
      this.searchEpisodicMemory(userId, query),
      this.searchSemanticMemory(userId, query),
      this.getUserPreference(userId),
    ]);

    return {
      // Layer 1: 当前对话上下文
      workingMemory: working,
      
      // Layer 2: 相关历史对话
      episodicMemory: episodes,
      
      // Layer 3: 知识库
      semanticMemory: semantic,
      
      // 用户偏好
      userPreferences: preferences,
      
      // 构建增强的 System Prompt
      systemContext: this.buildSystemContext(episodes, semantic, preferences),
    };
  }

  /**
   * 构建系统提示（融合记忆信息）
   */
  private buildSystemContext(
    episodes: any[],
    semantic: any[],
    preferences: any,
  ): string {
    const parts: string[] = [];

    // 添加用户偏好
    if (preferences?.preferences) {
      const prefs = preferences.preferences as Record<string, unknown>;
      if (prefs.language) {
        parts.push(`User prefers communication in ${String(prefs.language)}.`);
      }
    }

    // 添加相关历史
    if (episodes.length > 0) {
      parts.push('\n## Relevant Past Conversations:');
      episodes.forEach((ep: any) => {
        parts.push(`- ${ep.summary} (topics: ${JSON.stringify(ep.keyTopics)})`);
      });
    }

    // 添加相关知识
    if (semantic.length > 0) {
      parts.push('\n## Relevant Knowledge:');
      semantic.forEach((s: any) => {
        parts.push(`- ${s.content}`);
      });
    }

    return parts.join('\n');
  }
}