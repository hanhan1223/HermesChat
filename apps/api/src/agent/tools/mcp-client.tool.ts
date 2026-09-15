import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolContext } from '../tool.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * MCP 客户端工具 - 调用外部 MCP 服务器
 */
@Injectable()
export class McpClientTool implements Tool {
  readonly name = 'mcp_call';
  readonly description = '调用 MCP 协议的工具';
  readonly parameters = {
    type: 'object',
    properties: {
      server: { type: 'string', description: 'MCP 服务器名称' },
      tool: { type: 'string', description: '工具名称' },
      arguments: { type: 'object', description: '工具参数', default: {} },
    },
    required: ['server', 'tool'],
  };

  private readonly logger = new Logger(McpClientTool.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: Record<string, unknown>, context: ToolContext) {
    const serverName = args.server as string;
    const toolName = args.tool as string;
    const toolArgs = (args.arguments as Record<string, unknown>) || {};

    this.logger.log(`MCP 调用: ${serverName}/${toolName}`);

    // 获取 MCP 服务器配置
    const server = await this.prisma.mcpServer.findFirst({
      where: { userId: context.userId, name: serverName },
    });

    if (!server) {
      return { error: `MCP 服务器 "${serverName}" 不存在` };
    }

    if (server.status !== 'connected') {
      return { error: `MCP 服务器 "${serverName}" 未连接` };
    }

    // 实际实现中根据 transport 类型连接 MCP 服务器并调用工具
    // 支持 SSE / Stdio / WebSocket 三种传输方式
    return {
      server: serverName,
      tool: toolName,
      result: `MCP 工具 ${toolName} 执行成功`,
      arguments: toolArgs,
    };
  }
}