import { Global, Module } from '@nestjs/common';
import { CacheManager } from './cache.manager';

@Global()
@Module({
  providers: [CacheManager],
  exports: [CacheManager],
})
export class CacheModule {}