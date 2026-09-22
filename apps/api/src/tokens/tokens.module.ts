import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenUsageService } from './token-usage.service';

@Module({
  imports: [PrismaModule],
  providers: [TokenUsageService],
  exports: [TokenUsageService],
})
export class TokensModule {}
