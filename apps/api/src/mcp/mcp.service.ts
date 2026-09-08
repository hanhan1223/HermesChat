import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    const server = await this.prisma.mcpServer.findFirst({ where: { id, userId } });
    if (!server) throw new NotFoundException('MCP 服务器不存在');
    return this.prisma.mcpServer.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const server = await this.prisma.mcpServer.findFirst({ where: { id, userId } });
    if (!server) throw new NotFoundException('MCP 服务器不存在');
    return this.prisma.mcpServer.delete({ where: { id } });
  }

  async connect(id: string, userId: string) {
    const server = await this.prisma.mcpServer.findFirst({ where: { id, userId } });
    if (!server) throw new NotFoundException('MCP 服务器不存在');
    return this.prisma.mcpServer.update({
      where: { id },
      data: { status: 'connected' },
    });
  }
}