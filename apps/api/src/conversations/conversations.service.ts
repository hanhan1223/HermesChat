import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShortLinkService } from '../short-link/short-link.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shortLink: ShortLinkService,
  ) {}

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
    let modelId = data.modelId;
    if (!modelId || modelId === 'default') {
      const model = await this.prisma.model.findFirst({
        where: { enabled: true },
        orderBy: { priority: 'desc' },
      });
      modelId = model?.id || '';
    } else {
      const exists = await this.prisma.model.findUnique({ where: { id: modelId } });
      if (!exists) {
        const model = await this.prisma.model.findFirst({
          where: { enabled: true },
          orderBy: { priority: 'desc' },
        });
        modelId = model?.id || '';
      }
    }
    if (!modelId) {
      throw new ForbiddenException('没有可用模型，请先在管理后台配置模型');
    }

    return this.prisma.conversation.create({
      data: {
        userId,
        title: data.title || '新对话',
        modelId,
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
   * 创建分享（带用户隔离）— 返回短链与分享 URL
   */
  async share(id: string, userId: string) {
    const conversation = await this.getById(id, userId);

    const sharedId = conversation.sharedId ?? crypto.randomUUID();
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { sharedId },
    });

    const link = await this.shortLink.createShareLink(id, userId);

    return {
      sharedId: updated.sharedId,
      shortUrl: link.shortUrl,
      shareUrl: link.originalUrl,
      url: link.shortUrl,
    };
  }

  /**
   * 获取分享的对话（公开访问，无需认证）— 只返回展示所需字段
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

    return {
      id: conversation.id,
      title: conversation.title,
      sharedId: conversation.sharedId,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }
}