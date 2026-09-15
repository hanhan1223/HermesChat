import { Global, Module } from '@nestjs/common';
import { PromptCacheManager } from './prompt-cache.manager';

@Global()
@Module({
  providers: [PromptCacheManager],
  exports: [PromptCacheManager],
})
export class PromptCacheModule {}