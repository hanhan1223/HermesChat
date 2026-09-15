import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeController } from './knowledge.controller';
import { RagflowClient } from './ragflow.client';

@Module({
  imports: [],
  controllers: [KnowledgeController],
  providers: [KnowledgeBaseService, RagflowClient],
  exports: [KnowledgeBaseService, RagflowClient],
})
export class KnowledgeModule {}
