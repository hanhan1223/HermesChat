import { Module, OnModuleInit } from '@nestjs/common';
import { AgentHarness } from './agent.harness';
import { EnhancedAgentHarness, AuthContext } from './agent.harness.enhanced';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { ToolRegistryInitializer } from './tool.registry.initializer';
import { WebSearchTool } from './tools/web-search.tool';
import { CodeInterpreterTool } from './tools/code-interpreter.tool';
import { McpClientTool } from './tools/mcp-client.tool';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MemoryModule } from '../memory/memory.module';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Agent 模块 - 自研调度循环核心（增强版）
 * 
 * 新特性：
 * - 用户隔离（JWT 认证上下文）
 * - 三层记忆架构（Working + Episodic + Semantic）
 * - 高并发支持（并行工具调用 + 熔断器）
 */
@Module({
  imports: [PrismaModule, MemoryModule],
  controllers: [AgentController],
  providers: [
    AgentHarness,
    EnhancedAgentHarness,
    AgentService,
    ModelRouter,
    ToolRegistry,
    ToolRegistryInitializer,
    WebSearchTool,
    CodeInterpreterTool,
    McpClientTool,
  ],
  exports: [AgentHarness, EnhancedAgentHarness, AgentService, ToolRegistry],
})
export class AgentModule implements OnModuleInit {
  constructor(private readonly initializer: ToolRegistryInitializer) {}

  onModuleInit() {
    this.initializer.initialize();
  }
}

export { AuthContext };