import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.skill.findMany({
      where: { OR: [{ userId }, { isPublic: true }] },  // 自己的 + 公开的
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, data: any) {
    return this.prisma.skill.create({ data: { ...data, userId } });
  }

  async update(id: string, userId: string, data: any) {
    // 验证所有权
    const skill = await this.prisma.skill.findFirst({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill 不存在或无权修改');
    
    return this.prisma.skill.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    // 验证所有权
    const skill = await this.prisma.skill.findFirst({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill 不存在或无权删除');
    
    return this.prisma.skill.delete({ where: { id } });
  }
}