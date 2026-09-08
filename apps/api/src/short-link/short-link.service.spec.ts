import { Test, TestingModule } from '@nestjs/testing';
import { ShortLinkService } from '../src/short-link/short-link.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * 短链服务单元测试
 */
describe('ShortLinkService', () => {
  let service: ShortLinkService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      shortLink: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortLinkService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShortLinkService>(ShortLinkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a short link', async () => {
    prisma.shortLink.findFirst.mockResolvedValue(null);
    prisma.shortLink.create.mockResolvedValue({
      id: '1',
      code: 'abc1234',
      originalUrl: 'https://example.com',
      userId: 'user1',
      clickCount: 0,
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    const result = await service.createShortLink('https://example.com', 'user1');
    expect(result).toHaveProperty('code');
    expect(result.originalUrl).toBe('https://example.com');
  });

  it('should return existing link for same URL', async () => {
    const existing = {
      id: '1',
      code: 'abc1234',
      originalUrl: 'https://example.com',
      userId: 'user1',
      clickCount: 0,
      createdAt: new Date(),
      expiresAt: new Date(),
    };
    prisma.shortLink.findFirst.mockResolvedValue(existing);

    const result = await service.createShortLink('https://example.com', 'user1');
    expect(result.code).toBe('abc1234');
  });

  it('should resolve a short link', async () => {
    prisma.shortLink.findUnique.mockResolvedValue({
      id: '1',
      code: 'abc1234',
      originalUrl: 'https://example.com',
      userId: 'user1',
      clickCount: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    prisma.shortLink.update.mockResolvedValue({});

    const result = await service.resolveShortLink('abc1234');
    expect(result).not.toBeNull();
    expect(result?.originalUrl).toBe('https://example.com');
  });

  it('should return null for non-existent code', async () => {
    prisma.shortLink.findUnique.mockResolvedValue(null);
    const result = await service.resolveShortLink('nonexist');
    expect(result).toBeNull();
  });

  it('should return null for expired link', async () => {
    prisma.shortLink.findUnique.mockResolvedValue({
      id: '1',
      code: 'expired1',
      originalUrl: 'https://example.com',
      userId: 'user1',
      clickCount: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 86400000), // 已过期
    });

    const result = await service.resolveShortLink('expired1');
    expect(result).toBeNull();
  });

  it('should delete a short link', async () => {
    prisma.shortLink.deleteMany.mockResolvedValue({ count: 1 });
    const result = await service.deleteLink('abc1234', 'user1');
    expect(result).toBe(true);
  });
});