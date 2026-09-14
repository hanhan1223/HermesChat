import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 用户资源守卫 - 确保用户只能访问自己的资源
 * 
 * 核心机制：
 * 1. 从 JWT 获取认证用户 ID
 * 2. 验证请求的资源是否属于该用户
 * 3. 管理员可以访问所有资源
 */
@Injectable()
export class UserResourceGuard implements CanActivate {
  private readonly logger = new Logger(UserResourceGuard.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未认证');
    }

    // 管理员可以访问所有资源
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    // 验证对话所有权
    const conversationId = request.params.id || request.params.conversationId;
    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
      });
      if (!conversation) {
        this.logger.warn(`用户 ${user.id} 尝试越权访问对话 ${conversationId}`);
        throw new ForbiddenException('无权访问此资源');
      }
    }

    // 验证用户资源所有权
    const targetUserId = request.params.userId;
    if (targetUserId && targetUserId !== user.id) {
      throw new ForbiddenException('无权访问其他用户的资源');
    }

    return true;
  }
}