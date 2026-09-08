import { CircuitBreaker } from '../src/agent/circuit-breaker';

/**
 * 熔断器单元测试
 */
describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenMaxCalls: 2,
    });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.getState().state).toBe('CLOSED');
  });

  it('should pass through successful calls', async () => {
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.getState().state).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const failFn = jest.fn().mockRejectedValue(new Error('fail'));

    // 3 failures to trigger OPEN
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(failFn); } catch {}
    }

    expect(breaker.getState().state).toBe('OPEN');
    expect(failFn).toHaveBeenCalledTimes(3);
  });

  it('should reject calls when OPEN', async () => {
    // Trigger OPEN
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error('fail'); }); } catch {}
    }

    // Next call should be rejected
    await expect(breaker.execute(async () => 'success'))
      .rejects.toThrow('OPEN');
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    jest.useFakeTimers();

    // Trigger OPEN
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error('fail'); }); } catch {}
    }

    // Advance time past reset timeout
    jest.advanceTimersByTime(1500);

    // Should allow a test call
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');

    jest.useRealTimers();
  });

  it('should close after successful half-open calls', async () => {
    jest.useFakeTimers();

    // Trigger OPEN
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error('fail'); }); } catch {}
    }

    // Advance time
    jest.advanceTimersByTime(1500);

    // 2 successful calls to close
    await breaker.execute(async () => 'ok1');
    await breaker.execute(async () => 'ok2');

    expect(breaker.getState().state).toBe('CLOSED');

    jest.useRealTimers();
  });

  it('should re-open on failure in HALF_OPEN', async () => {
    jest.useFakeTimers();

    // Trigger OPEN
    for (let i = 0; i < 3; i++) {
      try { await breaker.execute(async () => { throw new Error('fail'); }); } catch {}
    }

    // Advance time
    jest.advanceTimersByTime(1500);

    // Failure in HALF_OPEN
    try { await breaker.execute(async () => { throw new Error('fail again'); }); } catch {}

    expect(breaker.getState().state).toBe('OPEN');

    jest.useRealTimers();
  });
});