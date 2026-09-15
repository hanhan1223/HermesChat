import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

/**
 * 子代理委派服务
 *
 * 将复杂任务拆解为多个独立子任务，每个子任务由一个隔离的子代理并行处理。
 * 子代理拥有独立的上下文和记忆，不污染主对话。
 *
 * 架构:
 *   主 Agent → delegate(task1, task2, task3)
 *     ├─ SubAgent-1 (独立上下文) → result-1
 *     ├─ SubAgent-2 (独立上下文) → result-2
 *     └─ SubAgent-3 (独立上下文) → result-3
 *   主 Agent ← 汇总所有结果，生成最终回答
 *
 * 特性:
 *   - 并行执行：多个子代理同时运行
 *   - 上下文隔离：子代理不共享主对话消息历史
 *   - 超时控制：每个子代理独立超时
 *   - 结果聚合：自动汇总子代理输出
 */
@Injectable()
export class SubAgentService {
  private readonly logger = new Logger(SubAgentService.name);
  private readonly maxConcurrent: number;
  private readonly defaultTimeout: number;

  constructor(private readonly config: ConfigService) {
    this.maxConcurrent = parseInt(this.config.get('SUBAGENT_MAX_CONCURRENT', '5'), 10);
    this.defaultTimeout = parseInt(this.config.get('SUBAGENT_TIMEOUT_MS', '120000'), 10);
  }

  /**
   * 并行执行多个子任务
   *
   * @param tasks 子任务列表
   * @param executor 执行器函数（调用 Agent Harness）
   * @returns 所有子任务结果
   */
  async executeParallel<T extends SubAgentTask>(
    tasks: T[],
    executor: (task: T) => Promise<SubAgentResult>,
  ): Promise<SubAgentResult[]> {
    if (tasks.length === 0) return [];

    // 限制并发数
    const batches = this.chunk(tasks, this.maxConcurrent);
    const allResults: SubAgentResult[] = [];

    for (const batch of batches) {
      const batchId = uuid().substring(0, 8);
      this.logger.log(`子代理批次 ${batchId}: 并行执行 ${batch.length} 个任务`);

      const settled = await Promise.allSettled(
        batch.map(async (task) => {
          const taskId = task.id || uuid().substring(0, 8);
          const startTime = Date.now();

          try {
            // 超时控制
            const result = await this.withTimeout(
              executor(task),
              task.timeoutMs || this.defaultTimeout,
              `子代理 ${taskId} 超时`,
            );

            const duration = Date.now() - startTime;
            this.logger.log(`子代理 ${taskId} 完成: ${duration}ms`);

            return {
              taskId,
              taskDescription: task.description,
              success: true,
              output: result.output,
              steps: result.steps || 0,
              durationMs: duration,
            } as SubAgentResult;
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`子代理 ${taskId} 失败: ${errorMsg} (${duration}ms)`);

            return {
              taskId,
              taskDescription: task.description,
              success: false,
              output: '',
              error: errorMsg,
              durationMs: duration,
            } as SubAgentResult;
          }
        }),
      );

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          allResults.push(outcome.value);
        } else {
          allResults.push({
            taskId: 'unknown',
            taskDescription: 'unknown',
            success: false,
            output: '',
            error: outcome.reason?.message || 'Unknown error',
            durationMs: 0,
          });
        }
      }
    }

    return allResults;
  }

  /**
   * 汇总子代理结果为可读文本
   */
  summarizeResults(results: SubAgentResult[]): string {
    if (results.length === 0) return '没有子任务结果。';

    const parts: string[] = ['\n## 子代理执行结果汇总:\n'];

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    for (const r of results) {
      const status = r.success ? '✅' : '❌';
      parts.push(`### ${status} ${r.taskDescription}`);
      if (r.success) {
        parts.push(r.output.substring(0, 1000));
      } else {
        parts.push(`失败: ${r.error}`);
      }
      parts.push(`耗时: ${r.durationMs}ms\n`);
    }

    parts.push(`\n总计: ${succeeded.length} 成功, ${failed.length} 失败`);
    return parts.join('\n');
  }

  /**
   * 构建 delegate 工具的 Schema（供 LLM 调用）
   */
  getDelegateToolSchema() {
    return {
      type: 'function',
      function: {
        name: 'delegate',
        description: '将复杂任务拆解为多个子任务，并行委派给独立子代理执行。适用于可以并行处理的独立子任务。',
        parameters: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    description: '子任务描述（子代理将根据此描述独立执行）',
                  },
                  context: {
                    type: 'string',
                    description: '子任务需要的额外上下文信息',
                  },
                },
                required: ['description'],
              },
              description: '子任务列表（2-5 个为宜）',
            },
          },
          required: ['tasks'],
        },
      },
    };
  }

  // ==================== 私有方法 ====================

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        if (timer.unref) timer.unref();
      }),
    ]);
  }
}

// ==================== 类型定义 ====================

export interface SubAgentTask {
  id?: string;
  description: string;
  context?: string;
  timeoutMs?: number;
}

export interface SubAgentResult {
  taskId: string;
  taskDescription: string;
  success: boolean;
  output: string;
  error?: string;
  steps?: number;
  durationMs: number;
}
