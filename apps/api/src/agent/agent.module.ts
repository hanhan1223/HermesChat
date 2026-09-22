import { Module, OnModuleInit } from '@nestjs/common';
import { AgentHarness } from './agent.harness';
import { EnhancedAgentHarness, AuthContext } from './agent.harness.enhanced';
import { ModelRouter } from './model.router';
import { ToolRegistry } from './tool.registry';
import { ToolRegistryInitializer } from './tool.registry.initializer';
import { WebSearchTool } from './tools/web-search.tool';
import { GoogleSearchTool } from './tools/google-search.tool';
import { PubMedSearchTool } from './tools/pubmed-search.tool';
import { ScholarSearchTool } from './tools/scholar-search.tool';
import { CodeInterpreterTool } from './tools/code-interpreter.tool';
import { McpClientTool } from './tools/mcp-client.tool';
import { SearchModule } from '../search/search.module';
import { TokensModule } from '../tokens/tokens.module';
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
import { SourceTracker } from './source-tracker';
import { SubAgentService } from './sub-agent.service';
import { AgentGuidanceService } from './agent-guidance.service';

/**
 * Agent 妯″潡 - 鑷爺璋冨害寰幆鏍稿績锛堝寮虹増锛? *
 * 鐗规€э細
 * - 鐢ㄦ埛闅旂锛圝WT 璁よ瘉涓婁笅鏂囷級
 * - 涓夊眰璁板繂鏋舵瀯锛圵orking + Episodic + Semantic锛? * - 楂樺苟鍙戞敮鎸侊紙骞惰宸ュ叿璋冪敤 + 鎸夋ā鍨嬬嫭绔嬬啍鏂級
 * - Agent 鍙栨秷锛圓bortSignal锛? 鏆傚仠/鎭㈠锛堢姸鎬佹満锛? * - 娌欑浠ｇ爜鎵ц
 * - Trace 璋冪敤閾捐拷韪? */
@Module({
  imports: [PrismaModule, MemoryModule, SearchModule, TokensModule],
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
    SourceTracker,
    SubAgentService,
    AgentGuidanceService,
    WebSearchTool,
    GoogleSearchTool,
    PubMedSearchTool,
    ScholarSearchTool,
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
    SourceTracker,
    SubAgentService,
    AgentGuidanceService,
  ],
})
export class AgentModule implements OnModuleInit {
  constructor(private readonly initializer: ToolRegistryInitializer) {}

  onModuleInit() {
    this.initializer.initialize();
  }
}

export { AuthContext };
