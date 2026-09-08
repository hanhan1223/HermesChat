/**
 * HermesChat 前后端共享类型定义
 */

// ==================== 用户 ====================
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  credits: number;
  avatarUrl?: string;
  createdAt: string;
}

// ==================== 对话 ====================
export interface Conversation {
  id: string;
  title: string;
  userId: string;
  modelId: string;
  sharedId?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  attachments?: Attachment[];
  toolCalls?: ToolCallRecord[];
  thinking?: string;
  tokenCount: number;
  createdAt: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  mimeType?: string;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

// ==================== 模型 ====================
export interface LlmModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  enabled: boolean;
  priority: number;
}

// ==================== Skill ====================
export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  mcpServers?: string[];
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== MCP ====================
export interface McpServer {
  id: string;
  name: string;
  transport: 'sse' | 'stdio' | 'websocket';
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
}

// ==================== Agent 事件 ====================
export type AgentEvent =
  | { type: 'thinking'; content: string; step: number }
  | { type: 'message'; content: string; step: number }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown>; step: number }
  | { type: 'tool_result'; tool: string; result: Record<string, unknown>; step: number }
  | { type: 'tool_error'; tool: string; error: string; step: number }
  | { type: 'feedback'; content: string; step: number }
  | { type: 'error'; content: string };

// ==================== 订阅 ====================
export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  monthlyCredits: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  maxConversations: number;
  maxSkills: number;
  maxMcpServers: number;
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  currentPeriodCredits: number;
  currentPeriodTokens: number;
}

// ==================== 积分 ====================
export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'GIFT' | 'SUBSCRIPTION' | 'CONSUME' | 'REFUND' | 'ADJUST';
  amount: number;
  balanceAfter: number;
  reason?: string;
  adminId?: string;
  createdAt: string;
}