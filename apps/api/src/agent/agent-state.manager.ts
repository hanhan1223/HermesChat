import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Agent 状态机 — OpenHands 式运行状态管理
 *
 * 状态流转:
 *   IDLE → RUNNING → COMPLETED
 *                ↘ FAILED
 *   RUNNING ⇄ PAUSED
 *   RUNNING → CANCELLED
 *   PAUSED → RUNNING (恢复)
 *   PAUSED → CANCELLED
 */
export type AgentState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentRunInfo {
  runId: string;
  conversationId: string;
  userId: string;
  state: AgentState;
  currentStep: number;
  maxSteps: number;
  startedAt: number;
  updatedAt: number;
  error?: string;
  pausedAt?: number;
  abortController?: AbortController;
}

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  IDLE: ['RUNNING'],
  RUNNING: ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'CANCELLED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

/**
 * Agent 运行状态管理器
 *
 * 职责:
 * 1. 跟踪每个 Agent 运行的状态
 * 2. 支持暂停/恢复/取消
 * 3. 通过 AbortController 向 Harness 传递中断信号
 * 4. 超时自动清理
 */
@Injectable()
export class AgentStateManager {
  private readonly logger = new Logger(AgentStateManager.name);
  private readonly runs = new Map<string, AgentRunInfo>();
  private readonly cleanupIntervalMs = 60000; // 1 分钟清理一次
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // 定期清理已结束的运行记录
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    // 取消所有运行中的 Agent
    for (const run of this.runs.values()) {
      run.abortController?.abort();
    }
    this.runs.clear();
  }

  /**
   * 创建新的运行记录
   */
  createRun(params: {
    runId: string;
    conversationId: string;
    userId: string;
    maxSteps: number;
  }): AgentRunInfo {
    const run: AgentRunInfo = {
      runId: params.runId,
      conversationId: params.conversationId,
      userId: params.userId,
      state: 'RUNNING',
      currentStep: 0,
      maxSteps: params.maxSteps,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      abortController: new AbortController(),
    };
    this.runs.set(params.runId, run);
    this.logger.log(`Run created: ${params.runId} (user=${params.userId})`);
    return run;
  }

  /**
   * 获取运行记录
   */
  getRun(runId: string): AgentRunInfo | undefined {
    return this.runs.get(runId);
  }

  /**
   * 按会话 ID 查找运行中的记录
   */
  findActiveRun(conversationId: string): AgentRunInfo | undefined {
    for (const run of this.runs.values()) {
      if (run.conversationId === conversationId && (run.state === 'RUNNING' || run.state === 'PAUSED')) {
        return run;
      }
    }
    return undefined;
  }

  /**
   * 状态转移
   */
  transition(runId: string, newState: AgentState, error?: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    const allowed = VALID_TRANSITIONS[run.state];
    if (!allowed.includes(newState)) {
      this.logger.warn(`Invalid transition: ${run.state} → ${newState} (run=${runId})`);
      return false;
    }

    const oldState = run.state;
    run.state = newState;
    run.updatedAt = Date.now();
    if (error) run.error = error;
    if (newState === 'PAUSED') run.pausedAt = Date.now();

    this.logger.log(`Run ${runId}: ${oldState} → ${newState}`);
    return true;
  }

  /**
   * 暂停运行
   */
  pause(runId: string): boolean {
    return this.transition(runId, 'PAUSED');
  }

  /**
   * 恢复运行
   */
  resume(runId: string): boolean {
    return this.transition(runId, 'RUNNING');
  }

  /**
   * 取消运行（触发 AbortController）
   */
  cancel(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;

    const ok = this.transition(runId, 'CANCELLED');
    if (ok) {
      run.abortController?.abort();
    }
    return ok;
  }

  /**
   * 标记完成
   */
  complete(runId: string): boolean {
    return this.transition(runId, 'COMPLETED');
  }

  /**
   * 标记失败
   */
  fail(runId: string, error: string): boolean {
    return this.transition(runId, 'FAILED', error);
  }

  /**
   * 更新步骤进度
   */
  updateStep(runId: string, step: number): void {
    const run = this.runs.get(runId);
    if (run) {
      run.currentStep = step;
      run.updatedAt = Date.now();
    }
  }

  /**
   * 获取 AbortSignal（传给 Harness）
   */
  getSignal(runId: string): AbortSignal | undefined {
    return this.runs.get(runId)?.abortController?.signal;
  }

  /**
   * 列出用户的所有运行
   */
  listUserRuns(userId: string): AgentRunInfo[] {
    return Array.from(this.runs.values()).filter(r => r.userId === userId);
  }

  /**
   * 列出所有活跃运行（监控用）
   */
  listActiveRuns(): AgentRunInfo[] {
    return Array.from(this.runs.values()).filter(
      r => r.state === 'RUNNING' || r.state === 'PAUSED',
    );
  }

  /**
   * 清理已结束且超过 30 分钟的记录
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 分钟
    for (const [id, run] of this.runs) {
      if (
        (run.state === 'COMPLETED' || run.state === 'FAILED' || run.state === 'CANCELLED') &&
        now - run.updatedAt > maxAge
      ) {
        this.runs.delete(id);
      }
    }
  }
}
