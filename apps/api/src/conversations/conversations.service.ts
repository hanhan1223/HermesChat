import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的所有对话（只返回自己的）
   */
  async list(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },  // ★ 用户隔离
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  /**
   * 创建对话（自动关联当前用户）
   */
  async create(userId: string, data: { title?: string; modelId: string }) {
    return this.prisma.conversation.create({
      data: { 
        userId,  // ★ 从认证上下文获取，不信任请求体
        title: data.title || '新对话', 
        modelId: data.modelId 
      },
    });
  }

  /**
   * 获取对话详情（带用户隔离）
   */
  async getById(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },  // ★ 强制用户 ID 过滤
    });
    
    if (!conversation) {
      throw new NotFoundException('对话不存在或无权访问');
    }
    
    return conversation;
  }

  /**
   * 删除对话（带用户隔离）
   */
  async delete(id: string, userId: string) {
    // 先验证所有权
    await this.getById(id, userId);
    
    return this.prisma.conversation.delete({ where: { id } });
  }

  /**
   * 创建分享（带用户隔离）
   */
  async share(id: string, userId: string) {
    // 先验证所有权
    await this.getById(id, userId);
    
    const sharedId = crypto.randomUUID();
    return this.prisma.conversation.update({
      where: { id },
      data: { sharedId },
    });
  }

  /**
   * 获取分享的对话（公开访问，无需认证）
   */
  async getShared(sharedId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { sharedId },
      include: {
        messages: {
          where: { role: { in: ['USER', 'ASSISTANT'] } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    if (!conversation) {
      throw new NotFoundException('分享的对话不存在');
    }
    
    return conversation;
  }
}