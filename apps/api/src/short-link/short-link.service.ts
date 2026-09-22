import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * 短链服务 - 对话分享链接生成
 */
@Injectable()
export class ShortLinkService {
  private readonly logger = new Logger(ShortLinkService.name);
  private readonly baseUrl: string;
  private readonly webBaseUrl: string;
  private readonly charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get('SHORT_LINK_BASE_URL', 'http://localhost:3000/s/');
    this.webBaseUrl = (this.config.get('WEB_BASE_URL') || this.config.get('CORS_ORIGINS', 'http://localhost:3000').split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');
  }

  async createShortLink(originalUrl: string, userId: string, expiresInDays = 30): Promise<ShortLink> {
    const existing = await this.prisma.shortLink.findFirst({
      where: { originalUrl, userId, expiresAt: { gt: new Date() } },
    });
    if (existing) return this.toResponse(existing);

    const code = this.generateCode(7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const link = await this.prisma.shortLink.create({
      data: { code, originalUrl, userId, expiresAt },
    });
    this.logger.log(`短链创建: ${code} -> ${originalUrl}`);
    return this.toResponse(link);
  }

  async createShareLink(conversationId: string, userId: string): Promise<ShortLink> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('对话不存在或无权访问');
    }

    // 复用已有 sharedId，保证同一对话分享链接稳定
    const sharedId = conversation.sharedId ?? crypto.randomUUID();
    if (!conversation.sharedId) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { sharedId },
      });
    }

    const originalUrl = `${this.webBaseUrl}/share/${sharedId}`;
    return this.createShortLink(originalUrl, userId, 365);
  }

  async resolveShortLink(code: string): Promise<ShortLink | null> {
    const link = await this.prisma.shortLink.findUnique({ where: { code } });
    if (!link) return null;
    if (link.expiresAt && link.expiresAt < new Date()) return null;

    await this.prisma.shortLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });
    return this.toResponse(link);
  }

  async listUserLinks(userId: string): Promise<ShortLink[]> {
    const links = await this.prisma.shortLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return links.map(l => this.toResponse(l));
  }

  async deleteLink(code: string, userId: string): Promise<boolean> {
    const result = await this.prisma.shortLink.deleteMany({ where: { code, userId } });
    return result.count > 0;
  }

  private generateCode(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.charset.charAt(Math.floor(Math.random() * this.charset.length));
    }
    return result;
  }

  private toResponse(link: any): ShortLink {
    return {
      code: link.code,
      shortUrl: `${this.baseUrl}${link.code}`,
      originalUrl: link.originalUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    };
  }
}

export interface ShortLink {
  code: string;
  shortUrl: string;
  originalUrl: string;
  clickCount: number;
  createdAt: Date;
  expiresAt: Date | null;
}