import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEnabled() {
    return this.prisma.model.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    });
  }
}