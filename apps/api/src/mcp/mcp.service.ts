import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.mcpServer.findMany({ where: { userId } });
  }

  async create(userId: string, data: any) {
    return this.prisma.mcpServer.create({ data: { ...data, userId } });
  }

  async update(id: string, userId: string, data: any) {
    return this.prisma.mcpServer.updateMany({ where: { id, userId }, data });
  }

  async delete(id: string, userId: string) {
    return this.prisma.mcpServer.deleteMany({ where: { id, userId } });
  }

  async connect(id: string, userId: string) {
    // 实际实现中建立 MCP 连接
    return this.prisma.mcpServer.updateMany({
      where: { id, userId },
      data: { status: 'connected' },
    });
  }
}