import { Logger } from '@nestjs/common';

/**
 * 熔断器 - 防止 LLM 故障级联
 * 
 * 三种状态：
 * - CLOSED: 正常，允许请求通过
 * - OPEN: 熔断，拒绝所有请求
 * - HALF_OPEN: 半开，允许少量请求测试恢复
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    private readonly config: {
      failureThreshold?: number;    // 触发熔断的失败次数
      resetTimeoutMs?: number;      // 熔断恢复时间 (ms)
      halfOpenMaxCalls?: number;    // 半开状态最大测试请求数
    } = {},
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeoutMs: config.resetTimeoutMs ?? 30000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
    };
    this.logger = new Logger(CircuitBreaker:);
  }

  /**
   * 执行受保护的操作
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs!) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        this.logger.log(进入 HALF_OPEN 状态);
      } else {
        throw new Error(Circuit breaker [] is OPEN - request rejected);
      }
    }

    if (this.state === 'HALF_OPEN' && this.successCount >= this.config.halfOpenMaxCalls!) {
      throw new Error(Circuit breaker [] is HALF_OPEN - too many test requests);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxCalls!) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.logger.log(恢复 CLOSED 状态);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.logger.warn(半开状态失败，重新进入 OPEN 状态);
    } else if (this.failureCount >= this.config.failureThreshold!) {
      this.state = 'OPEN';
      this.logger.warn(失败次数达到阈值 ，进入 OPEN 状态);
    }
  }
}