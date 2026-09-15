import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CircuitBreakerRegistry } from '../agent/circuit-breaker.registry';
import { CacheManager } from '../cache/cache.manager';

/**
 * 健康检查端点 — 用于 Docker/K8s 健康探测
 *
 * GET /api/health       → 存活探针 (liveness)
 * GET /api/health/ready → 就绪探针 (readiness)，检查所有依赖
 */
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreakers: CircuitBreakerRegistry,
    private readonly cache: CacheManager,
  ) {}

  /**
   * 存活探针 — 只要进程活着就返回 200
   */
  @Get()
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * 就绪探针 — 检查所有关键依赖是否可用
   */
  @Get('ready')
  async readiness() {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // 检查数据库
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - start };
    } catch (error) {
      checks.database = { status: 'error', error: error instanceof Error ? error.message : 'unknown' };
    }

    // 检查缓存
    try {
      const stats = this.cache.getStats();
      checks.cache = { status: 'ok' };
    } catch (error) {
      checks.cache = { status: 'error', error: error instanceof Error ? error.message : 'unknown' };
    }

    // 熔断器状态
    const cbStates = this.circuitBreakers.getAllStates();
    const openBreakers = cbStates.filter(cb => cb.state === 'OPEN');
    checks.circuitBreakers = {
      status: openBreakers.length > 0 ? 'degraded' : 'ok',
    };

    const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'degraded');
    const anyError = Object.values(checks).some(c => c.status === 'error');

    return {
      status: anyError ? 'error' : allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      circuitBreakers: cbStates,
    };
  }

  /**
   * 详细状态（含缓存统计、熔断器详情）
   */
  @Get('status')
  async detailedStatus() {
    return {
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      cache: this.cache.getStats(),
      circuitBreakers: this.circuitBreakers.getAllStates(),
    };
  }
}
