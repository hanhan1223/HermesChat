import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEnabled() {
    const models = await this.prisma.model.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    });
    // 不向前端泄露上游 API Key
    return models.map((m) => {
      const { apiKey, ...rest } = m;
      return {
        ...rest,
        hasApiKey: Boolean(apiKey),
        apiKeyMasked: maskKey(apiKey),
      };
    });
  }
}

function maskKey(key: string | null): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}
