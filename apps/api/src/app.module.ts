import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GuestModule } from './auth/guest.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { SkillsModule } from './skills/skills.module';
import { McpModule } from './mcp/mcp.module';
import { ModelsModule } from './models/models.module';
import { AgentModule } from './agent/agent.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';
import { ShortLinkModule } from './short-link/short-link.module';
import { MemoryModule } from './memory/memory.module';
import { UserIsolationMiddleware } from './common/middleware/user-isolation.middleware';
import { PromptCacheModule } from './prompt-cache/prompt-cache.module';
import { CacheModule } from './cache/cache.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { HealthController } from './common/health.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '90d') },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    GuestModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    SkillsModule,
    McpModule,
    ModelsModule,
    AgentModule,
    RealtimeModule,
    StorageModule,
    ShortLinkModule,
    MemoryModule,
    PromptCacheModule,
    CacheModule,
    ApiKeysModule,
    KnowledgeModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全局用户隔离中间件
    // 排除：health（健康检查）、auth（登录/注册）、guest（免登录对话）
    consumer
      .apply(UserIsolationMiddleware)
      .exclude(
        'health',
        'health/(.*)',
        'auth/login',
        'auth/register',
        'auth/guest-config',
        'guest/(.*)',
      )
      .forRoutes('*');
  }
}
