import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
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
  ],
})
export class AppModule {}