import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/**
 * JWT 认证守卫
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) return false;

    try {
      const payload = this.jwt.verify(token);
      const user = await this.auth.validateUser(payload.sub);
      if (!user) return false;
      req.user = user;
      return true;
    } catch {
      return false;
    }
  }
}