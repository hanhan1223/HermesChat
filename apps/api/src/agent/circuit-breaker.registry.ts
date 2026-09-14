import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';

/**
 * 熔断器注册表 — 统一管理所有熔断器实例
 *
 * 解决原架构中两套熔断逻辑冲突的问题：
 * - ModelRouter 之前注入了一个全局单例 CB（一个模型故障影响全部）
 * - EnhancedAgentHarness 自己维护 Map 按 modelId 分
 *
 * 现在统一走这里：按 name（通常是 modelId 或 provider）获取独立实例。
 */
@Injectable()
export class CircuitBreakerRegistry {
  private readonly logger = new Logger(CircuitBreakerRegistry.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  /**
   * 获取指定名称的熔断器（不存在则创建）
   */
  get(name: string, config?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
    halfOpenMaxCalls?: number;
  }): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, {
        failureThreshold: config?.failureThreshold ?? 5,
        resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
        halfOpenMaxCalls: config?.halfOpenMaxCalls ?? 3,
      }));
      this.logger.log(`Created circuit breaker: ${name}`);
    }
    return this.breakers.get(name)!;
  }

  /**
   * 获取所有熔断器状态（用于健康检查 / 监控）
   */
  getAllStates() {
    return Array.from(this.breakers.entries()).map(([name, cb]) => ({
      breakerName: name,
      ...cb.getState(),
    }));
  }

  /**
   * 重置指定熔断器
   */
  reset(name: string): void {
    this.breakers.delete(name);
  }

  /**
   * 重置所有熔断器
   */
  resetAll(): void {
    this.breakers.clear();
  }
}
