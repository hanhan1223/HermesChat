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
import { AgentRunController } from './agent-run.controller';
import { TraceController } from './trace.controller';
import { AgentService } from './agent.service';
import { AgentStateManager } from './agent-state.manager';
import { SandboxService } from './sandbox.service';
import { TraceService } from './trace.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MemoryModule } from '../memory/memory.module';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';

/**
 * Agent 模块 - 自研调度循环核心（增强版）
 *
 * 特性：
 * - 用户隔离（JWT 认证上下文）
 * - 三层记忆架构（Working + Episodic + Semantic）
 * - 高并发支持（并行工具调用 + 按模型独立熔断）
 * - Agent 取消（AbortSignal）+ 暂停/恢复（状态机）
 * - 沙箱代码执行
 * - Trace 调用链追踪
 */
@Module({
  imports: [PrismaModule, MemoryModule],
  controllers: [AgentController, AgentRunController, TraceController],
  providers: [
    AgentHarness,
    EnhancedAgentHarness,
    AgentService,
    AgentStateManager,
    SandboxService,
    TraceService,
    ModelRouter,
    ToolRegistry,
    ToolRegistryInitializer,
    CircuitBreakerRegistry,
    WebSearchTool,
    CodeInterpreterTool,
    McpClientTool,
  ],
  exports: [
    AgentHarness,
    EnhancedAgentHarness,
    AgentService,
    AgentStateManager,
    SandboxService,
    TraceService,
    ToolRegistry,
    CircuitBreakerRegistry,
  ],
})
export class AgentModule implements OnModuleInit {
  constructor(private readonly initializer: ToolRegistryInitializer) {}

  onModuleInit() {
    this.initializer.initialize();
  }
}

export { AuthContext };