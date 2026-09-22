import { Module } from '@nestjs/common';
import {
  ConversationsController,
  SharedConversationController,
} from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationSearchService } from './conversation-search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ShortLinkModule } from '../short-link/short-link.module';

@Module({
  imports: [PrismaModule, AuthModule, ShortLinkModule],
  controllers: [ConversationsController, SharedConversationController, SearchController],
  providers: [ConversationsService, ConversationSearchService],
  exports: [ConversationsService, ConversationSearchService],
})
export class ConversationsModule {}
