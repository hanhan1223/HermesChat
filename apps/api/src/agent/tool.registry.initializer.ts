import { Injectable, Logger } from '@nestjs/common';
import { Tool } from './tool.interface';
import { ToolRegistry } from './tool.registry';
import { WebSearchTool } from './tools/web-search.tool';
import { CodeInterpreterTool } from './tools/code-interpreter.tool';
import { McpClientTool } from './tools/mcp-client.tool';

/**
 * 工具注册中心 - 初始化所有内置工具
 */
@Injectable()
export class ToolRegistryInitializer {
  private readonly logger = new Logger(ToolRegistryInitializer.name);

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly webSearch: WebSearchTool,
    private readonly codeInterpreter: CodeInterpreterTool,
    private readonly mcpClient: McpClientTool,
  ) {}

  /**
   * 注册所有内置工具
   */
  initialize(): void {
    const builtInTools: Tool[] = [
      {
        name: 'web_search',
        description: '搜索互联网获取最新信息',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            limit: { type: 'number', description: '返回结果数量', default: 5 },
          },
          required: ['query'],
        },
        execute: (args, ctx) => this.webSearch.execute(args, ctx),
      },
      {
        name: 'code_interpreter',
        description: '执行 Python 代码进行数据分析、计算等',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '要执行的 Python 代码' },
            language: { type: 'string', description: '编程语言', default: 'python' },
          },
          required: ['code'],
        },
        execute: (args, ctx) => this.codeInterpreter.execute(args, ctx),
      },
      {
        name: 'mcp_call',
        description: '调用 MCP 工具',
        parameters: {
          type: 'object',
          properties: {
            server: { type: 'string', description: 'MCP 服务器名称' },
            tool: { type: 'string', description: '工具名称' },
            arguments: { type: 'object', description: '工具参数' },
          },
          required: ['server', 'tool'],
        },
        execute: (args, ctx) => this.mcpClient.execute(args, ctx),
      },
    ];

    this.toolRegistry.registerAll(builtInTools);
    this.logger.log(`已注册 ${builtInTools.length} 个内置工具`);
  }
}