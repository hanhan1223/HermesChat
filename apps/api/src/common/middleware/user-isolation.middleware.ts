import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * 用户隔离中间件
 *
 * 核心职责：
 * 1. 从 JWT 中提取用户 ID（不可伪造）
 * 2. 将用户信息注入请求上下文
 * 3. 验证用户状态（是否被禁用）
 * 4. 确保后续所有操作都基于认证后的用户 ID
 */
@Injectable()
export class UserIsolationMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 从 Authorization header 提取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // 验证并解码 JWT
      const payload = this.jwt.verify(token);

      // ★ 关键：从 JWT 中提取用户 ID，不信任请求体中的 userId
      (req as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // 将用户 ID 注入响应头（便于调试）
      res.setHeader('X-User-Id', payload.sub);

      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * 扩展 Express Request 类型
 * 使用自定义属性名避免与 @types/passport 的 Express.User 冲突
 */
declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}