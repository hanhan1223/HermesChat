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
  freeAccess?: boolean;
  billingMode?: 'FREE' | 'TRIAL_THEN_PAID' | null;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
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
  type: 'GIFT' | 'SUBSCRIPTION' | 'CONSUME' | 'REFILL' | 'REFUND' | 'ADJUST';
  amount: number;
  balanceAfter: number;
  reason?: string;
  adminId?: string;
  createdAt: string;
}

// ==================== 计费与额度 ====================

export type BillingMode = 'FREE' | 'TRIAL_THEN_PAID';

export interface BillingConfig {
  mode: BillingMode;
  trialDays: number;
  trialCredits: number;
}

export type PurchaseRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreditPurchaseRequest {
  id: string;
  userId: string;
  amount: number;
  note?: string;
  contact?: string;
  status: PurchaseRequestStatus;
  adminId?: string;
  adminNote?: string;
  grantedAmount?: number;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export interface QuotaOverview {
  credits: number;
  totalTokenUsed: number;
  billingMode: BillingMode;
  freeAccess: boolean;
  inTrial: boolean;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  trialDays: number;
  trialCredits: number;
  /** FREE 或 freeAccess/inTrial 时为 true，可直接使用 */
  canUse: boolean;
  /** 试用结束后需购买额度 */
  requirePurchase: boolean;
}

export interface TokenUsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  creditsConsumed: number;
  messageCount: number;
  daily: Array<{
    usageDate: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  }>;
}