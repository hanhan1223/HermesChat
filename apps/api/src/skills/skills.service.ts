import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.skill.findMany({
      where: { OR: [{ userId }, { isPublic: true }] },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, data: any) {
    return this.prisma.skill.create({ data: { ...data, userId } });
  }

  async update(id: string, userId: string, data: any) {
    return this.prisma.skill.updateMany({ where: { id, userId }, data });
  }

  async delete(id: string, userId: string) {
    return this.prisma.skill.deleteMany({ where: { id, userId } });
  }
}