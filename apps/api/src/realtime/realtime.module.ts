import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [AgentModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}