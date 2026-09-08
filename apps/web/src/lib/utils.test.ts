import { formatDate, formatNumber, formatTokens, generateShortCode, copyToClipboard } from '@/lib/utils';

/**
 * 工具函数单元测试
 */
describe('Utils', () => {
  describe('formatDate', () => {
    it('formats recent dates correctly', () => {
      const now = new Date().toISOString();
      expect(formatDate(now)).toBe('刚刚');
    });

    it('formats minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatDate(date)).toBe('5 分钟前');
    });

    it('formats hours ago', () => {
      const date = new Date(Date.now() - 3 * 3600000).toISOString();
      expect(formatDate(date)).toBe('3 小时前');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });
  });

  describe('formatTokens', () => {
    it('formats K for thousands', () => {
      expect(formatTokens(1500)).toBe('1.5K');
    });

    it('formats M for millions', () => {
      expect(formatTokens(2500000)).toBe('2.5M');
    });

    it('returns raw number for small values', () => {
      expect(formatTokens(500)).toBe('500');
    });
  });

  describe('generateShortCode', () => {
    it('generates code of correct length', () => {
      const code = generateShortCode(7);
      expect(code).toHaveLength(7);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateShortCode()));
      expect(codes.size).toBe(100);
    });

    it('only contains alphanumeric characters', () => {
      const code = generateShortCode();
      expect(code).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('copyToClipboard', () => {
    it('returns true on success', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
      });
      
      const result = await copyToClipboard('test');
      expect(result).toBe(true);
    });
  });
});