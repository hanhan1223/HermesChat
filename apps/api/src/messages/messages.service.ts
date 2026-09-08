import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(conversationId: string, userId: string) {
    // 验证对话归属
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new Error('对话不存在');

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { conversationId: string; role: string; content: string; attachments?: any }) {
    return this.prisma.message.create({ data });
  }
}