import { Module } from '@nestjs/common';
import { PluginSystemService } from './plugin-system.service';
import { PluginController } from './plugin.controller';

@Module({
  controllers: [PluginController],
  providers: [PluginSystemService],
  exports: [PluginSystemService],
})
export class PluginModule {}
