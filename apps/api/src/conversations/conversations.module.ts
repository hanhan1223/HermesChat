import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationSearchService } from './conversation-search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationsController, SearchController],
  providers: [ConversationsService, ConversationSearchService],
  exports: [ConversationsService, ConversationSearchService],
})
export class ConversationsModule {}
