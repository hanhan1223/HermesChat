import { Injectable, Logger } from '@nestjs/common';
import { Tool } from './tool.interface';
import { ToolRegistry } from './tool.registry';
import { WebSearchTool } from './tools/web-search.tool';
import { GoogleSearchTool } from './tools/google-search.tool';
import { PubMedSearchTool } from './tools/pubmed-search.tool';
import { ScholarSearchTool } from './tools/scholar-search.tool';
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
    private readonly googleSearch: GoogleSearchTool,
    private readonly pubmedSearch: PubMedSearchTool,
    private readonly scholarSearch: ScholarSearchTool,
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
        description:
          '使用 Tavily 搜索互联网，获取最新网页、新闻、文档等信息。返回 title/url/snippet。',
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
        name: 'google_search',
        description:
          'Google 网页搜索（SerpAPI；未配置时回退 Tavily）。适合需要 Google 结果质量的通用检索。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            limit: { type: 'number', description: '返回结果数量', default: 5 },
          },
          required: ['query'],
        },
        execute: (args, ctx) => this.googleSearch.execute(args, ctx),
      },
      {
        name: 'pubmed_search',
        description:
          '检索 PubMed 生物医学文献（NCBI）。返回标题、作者、期刊、PMID 链接。适合医学/生命科学问题。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '文献检索词，可含 PubMed 语法' },
            limit: { type: 'number', description: '返回条数', default: 5 },
          },
          required: ['query'],
        },
        execute: (args, ctx) => this.pubmedSearch.execute(args, ctx),
      },
      {
        name: 'scholar_search',
        description:
          '学术文献检索。source=semantic_scholar（免费，默认）或 google_scholar（SerpAPI）。返回论文标题、摘要片段、被引与链接。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '学术检索词' },
            limit: { type: 'number', description: '返回条数', default: 5 },
            source: {
              type: 'string',
              description: '数据源',
              enum: ['semantic_scholar', 'google_scholar'],
              default: 'semantic_scholar',
            },
          },
          required: ['query'],
        },
        execute: (args, ctx) => this.scholarSearch.execute(args, ctx),
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
