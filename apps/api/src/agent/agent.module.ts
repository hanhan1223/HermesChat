import { Module, OnModuleInit } from '@nestjs/common';
import { AgentHarness } from './agent.harness';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { ToolRegistryInitializer } from './tool.registry.initializer';
import { WebSearchTool } from './tools/web-search.tool';
import { CodeInterpreterTool } from './tools/code-interpreter.tool';
import { McpClientTool } from './tools/mcp-client.tool';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Agent 模块 - 自研调度循环核心
 */
@Module({
  imports: [PrismaModule],
  controllers: [AgentController],
  providers: [
    AgentHarness,
    AgentService,
    ModelRouter,
    ToolRegistry,
    ToolRegistryInitializer,
    WebSearchTool,
    CodeInterpreterTool,
    McpClientTool,
  ],
  exports: [AgentHarness, AgentService, ToolRegistry],
})
export class AgentModule implements OnModuleInit {
  constructor(private readonly initializer: ToolRegistryInitializer) {}

  onModuleInit() {
    // 应用启动时注册所有内置工具
    this.initializer.initialize();
  }
}