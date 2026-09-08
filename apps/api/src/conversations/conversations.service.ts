import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async create(userId: string, data: { title?: string; modelId: string }) {
    return this.prisma.conversation.create({
      data: { userId, title: data.title || '新对话', modelId: data.modelId },
    });
  }

  async getById(id: string, userId: string) {
    return this.prisma.conversation.findFirst({ where: { id, userId } });
  }

  async delete(id: string, userId: string) {
    return this.prisma.conversation.deleteMany({ where: { id, userId } });
  }

  async share(id: string, userId: string) {
    const sharedId = crypto.randomUUID();
    return this.prisma.conversation.update({
      where: { id },
      data: { sharedId },
    });
  }
}