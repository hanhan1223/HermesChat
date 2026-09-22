import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PROFILE_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  credits: true,
  avatarUrl: true,
  freeAccess: true,
  billingMode: true,
  trialStartAt: true,
  trialEndAt: true,
  totalTokenUsed: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_FIELDS,
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string | null },
  ) {
    const payload: { name?: string; avatarUrl?: string | null } = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (name.length > 50) throw new BadRequestException('昵称不能超过 50 字');
      payload.name = name;
    }

    if (data.avatarUrl !== undefined) {
      const url = data.avatarUrl;
      if (url === null || url === '') {
        payload.avatarUrl = null;
      } else if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:image/') ||
        url.startsWith('/users/')
      ) {
        if (url.length > 2048) throw new BadRequestException('头像地址过长');
        payload.avatarUrl = url;
      } else {
        throw new BadRequestException('头像地址格式不正确');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: payload,
      select: PROFILE_FIELDS,
    });
  }
}
