import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

/**
 * Trace 追踪服务 — Langfuse 式调用链追踪
 *
 * 数据模型:
 *   Trace (一次完整对话)
 *     └── Span (一个步骤: planner / tool / verifier)
 *           └── Event (细粒度: LLM 调用、工具执行、缓存命中)
 */
@Injectable()
export class TraceService {
  private readonly logger = new Logger(TraceService.name);

  // 进程内缓冲，批量写入 DB（减少 IO）
  private buffer: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs = 5000;
  private readonly maxBufferSize = 50;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.flushTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  /**
   * 开始一个 Trace
   */
  startTrace(params: {
    userId: string;
    conversationId: string;
    modelId: string;
    input: string;
  }): string {
    const traceId = uuid();
    this.buffer.push({
      id: traceId,
      userId: params.userId,
      conversationId: params.conversationId,
      modelId: params.modelId,
      input: params.input.substring(0, 2000),
      startedAt: Date.now(),
      status: 'RUNNING',
      spans: [],
    });
    return traceId;
  }

  /**
   * 添加 Span（一个步骤）
   */
  addSpan(traceId: string, span: {
    name: string;
    type: 'planner' | 'tool' | 'verifier' | 'memory' | 'llm';
    input?: any;
    output?: any;
    durationMs?: number;
    tokens?: { input: number; output: number; cached?: number };
    cost?: number;
    error?: string;
  }): void {
    const trace = this.buffer.find(t => t.id === traceId);
    if (!trace) return;

    trace.spans.push({
      id: uuid().substring(0, 8),
      ...span,
      startedAt: Date.now(),
    });
  }

  /**
   * 结束 Trace
   */
  endTrace(traceId: string, params: {
    output?: string;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    totalTokens?: { input: number; output: number; cached?: number };
    totalCost?: number;
    error?: string;
  }): void {
    const trace = this.buffer.find(t => t.id === traceId);
    if (!trace) return;

    trace.output = params.output?.substring(0, 4000);
    trace.status = params.status;
    trace.endedAt = Date.now();
    trace.durationMs = trace.endedAt - trace.startedAt;
    trace.totalTokens = params.totalTokens;
    trace.totalCost = params.totalCost;
    trace.error = params.error;

    // 如果缓冲区满了，立即刷入
    if (this.buffer.filter(t => t.endedAt).length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * 查询 Trace 列表
   */
  async listTraces(params: {
    userId?: string;
    conversationId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.conversationId) where.conversationId = params.conversationId;
    if (params.status) where.status = params.status;

    // 先从缓冲区查
    const buffered = this.buffer.filter(t => {
      if (params.userId && t.userId !== params.userId) return false;
      if (params.conversationId && t.conversationId !== params.conversationId) return false;
      if (params.status && t.status !== params.status) return false;
      return true;
    });

    return {
      traces: buffered.slice(-(params.limit || 20)).reverse(),
      source: 'buffer',
    };
  }

  /**
   * 成本统计
   */
  async getCostStats(params: { userId?: string; days?: number }) {
    const days = params.days || 30;
    const cutoff = Date.now() - days * 86400000;

    // 从缓冲区聚合
    const traces = this.buffer.filter(t => {
      if (t.startedAt < cutoff) return false;
      if (params.userId && t.userId !== params.userId) return false;
      return t.status === 'COMPLETED';
    });

    const totalCost = traces.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const totalInputTokens = traces.reduce((sum, t) => sum + (t.totalTokens?.input || 0), 0);
    const totalOutputTokens = traces.reduce((sum, t) => sum + (t.totalTokens?.output || 0), 0);
    const totalCachedTokens = traces.reduce((sum, t) => sum + (t.totalTokens?.cached || 0), 0);

    // 按模型聚合
    const byModel: Record<string, { count: number; cost: number; tokens: number }> = {};
    for (const t of traces) {
      const key = t.modelId || 'unknown';
      if (!byModel[key]) byModel[key] = { count: 0, cost: 0, tokens: 0 };
      byModel[key].count++;
      byModel[key].cost += t.totalCost || 0;
      byModel[key].tokens += (t.totalTokens?.input || 0) + (t.totalTokens?.output || 0);
    }

    return {
      period: `${days}d`,
      totalTraces: traces.length,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalInputTokens,
      totalOutputTokens,
      totalCachedTokens,
      cacheHitRate: totalInputTokens > 0
        ? Math.round((totalCachedTokens / totalInputTokens) * 10000) / 100
        : 0,
      byModel,
    };
  }

  /**
   * 刷入数据库
   */
  private flush(): void {
    const completed = this.buffer.filter(t => t.endedAt);
    if (completed.length === 0) return;

    // 异步写入，不阻塞
    this.writeToDb(completed).catch(err => {
      this.logger.warn(`Trace flush failed: ${err.message}`);
    });

    // 从缓冲区移除已刷入的
    this.buffer = this.buffer.filter(t => !t.endedAt);
  }

  private async writeToDb(traces: any[]): Promise<void> {
    // 使用原始 SQL 写入 traces 表（需要先建表）
    // 此处简化为日志输出，生产环境应写入 DB
    for (const trace of traces) {
      this.logger.debug(
        `Trace ${trace.id}: status=${trace.status} duration=${trace.durationMs}ms ` +
        `tokens=${JSON.stringify(trace.totalTokens)} cost=${trace.totalCost}`,
      );
    }
  }
}
