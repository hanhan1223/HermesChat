import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolContext } from './tool.interface';

/**
 * 工具注册表 - 管理所有可用工具
 *
 * 支持三类工具：
 * 1. Built-in Tools: 内置工具（网页搜索、代码执行等）
 * 2. MCP Tools: 通过 MCP 协议接入的外部工具
 * 3. Skill Tools: 用户自定义 Skill 关联的工具
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, Tool>();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`工具注册: ${tool.name}`);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具名称
   */
  getAllNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 获取工具定义列表（用于传给 LLM）
   */
  getToolDefinitions(names?: string[]): ToolDefinition[] {
    const targetNames = names || this.getAllNames();
    return targetNames
      .map(name => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined)
      .map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
  }

  /**
   * 批量注册
   */
  registerAll(tools: Tool[]): void {
    tools.forEach(t => this.register(t));
  }
}

interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}