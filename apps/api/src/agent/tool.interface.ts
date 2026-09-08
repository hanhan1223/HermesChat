/**
 * 工具接口定义
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<Record<string, unknown>>;
}

export interface ToolContext {
  userId: string;
  conversationId: string;
  context: any;
}