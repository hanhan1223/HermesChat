import { Test, TestingModule } from '@nestjs/testing';
import { PromptCacheManager, OptimizedPrompt } from './prompt-cache.manager';
import { ConfigService } from '@nestjs/config';

/**
 * Prompt 缓存管理器单元测试
 */
describe('PromptCacheManager', () => {
  let service: PromptCacheManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptCacheManager,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<PromptCacheManager>(PromptCacheManager);
  });

  describe('optimizeMessageStructure', () => {
    it('should separate static and dynamic content', () => {
      const result = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        dynamicContext: 'User likes Python.',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // 静态内容在前
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('You are a helpful assistant.');
      
      // 动态内容在后
      expect(result.messages[1].role).toBe('system');
      expect(result.messages[1].content).toBe('User likes Python.');
      
      // 用户消息在最后
      expect(result.messages[2].role).toBe('user');
    });

    it('should add cache_control to static content', () => {
      const result = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.messages[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should add cache_control to tool definitions', () => {
      const tools = [{ name: 'search', description: 'Search the web' }];
      const result = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        tools,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const toolMsg = result.messages.find((m: any) => m.role === '_tool_definitions');
      expect(toolMsg).toBeDefined();
      expect(toolMsg.cache_control).toEqual({ type: 'ephemeral' });
    });

    it('should generate consistent cache fingerprint for same static content', () => {
      const result1 = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const result2 = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'World' }],
      });

      // 相同静态内容应该产生相同的 fingerprint
      expect(result1.cacheFingerprint).toBe(result2.cacheFingerprint);
    });

    it('should generate different fingerprint for different static content', () => {
      const result1 = service.optimizeMessageStructure({
        systemPrompt: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const result2 = service.optimizeMessageStructure({
        systemPrompt: 'You are a coding assistant.',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result1.cacheFingerprint).not.toBe(result2.cacheFingerprint);
    });
  });

  describe('fingerprint computation', () => {
    it('should compute consistent fingerprint', () => {
      const fp1 = service.computeFingerprint('test prompt', [{ name: 'tool1' }]);
      const fp2 = service.computeFingerprint('test prompt', [{ name: 'tool1' }]);
      expect(fp1).toBe(fp2);
    });

    it('should compute different fingerprints for different content', () => {
      const fp1 = service.computeFingerprint('prompt A');
      const fp2 = service.computeFingerprint('prompt B');
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('request deduplication', () => {
    it('should deduplicate concurrent identical requests', async () => {
      let callCount = 0;
      const executor = jest.fn().mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { content: 'response', toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 } };
      });

      const hash = 'test-hash';
      
      // 同时发起 5 个相同请求
      const results = await Promise.all([
        service.deduplicate(hash, executor),
        service.deduplicate(hash, executor),
        service.deduplicate(hash, executor),
        service.deduplicate(hash, executor),
        service.deduplicate(hash, executor),
      ]);

      // 应该只调用一次 executor
      expect(callCount).toBe(1);
      
      // 所有结果应该相同
      results.forEach((r: any) => {
        expect(r.content).toBe('response');
      });
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      // 模拟命中
      service['stats'].exactHits = 10;
      service['stats'].semanticHits = 5;
      service['stats'].misses = 85;

      const stats = service.getStats();
      expect(stats.totalRequests).toBe(100);
      expect(stats.hitRate).toBe('15.0%');
    });
  });
});