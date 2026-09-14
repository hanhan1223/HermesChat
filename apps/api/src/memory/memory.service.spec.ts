import { Test, TestingModule } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 三层记忆架构单元测试
 */
describe('MemoryService', () => {
  let service: MemoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      message: { findMany: jest.fn() },
      episodicMemory: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      semanticMemory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      userPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  describe('Working Memory', () => {
    it('should get working memory for a conversation', async () => {
      const mockMessages = [
        { id: '1', content: 'Hello', role: 'USER' },
        { id: '2', content: 'Hi!', role: 'ASSISTANT' },
      ];
      prisma.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.getWorkingMemory('conv_1');
      expect(result).toHaveLength(2);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { conversationId: 'conv_1' } })
      );
    });
  });

  describe('Episodic Memory', () => {
    it('should search episodic memory with time decay', async () => {
      const mockMemories = [
        {
          id: 'ep_1',
          summary: 'User asked about AI',
          keyTopics: ['AI', 'ML'],
          importance: 0.8,
          lastAccessed: new Date(),
          accessCount: 3,
        },
      ];
      prisma.episodicMemory.findMany.mockResolvedValue(mockMemories);

      const result = await service.searchEpisodicMemory('user_1', 'AI', 5);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('relevanceScore');
    });

    it('should save episodic memory', async () => {
      prisma.episodicMemory.create.mockResolvedValue({ id: 'ep_new' });

      await service.saveEpisodicMemory({
        userId: 'user_1',
        conversationId: 'conv_1',
        summary: 'Test summary',
        keyTopics: ['test'],
        importance: 0.5,
      });

      expect(prisma.episodicMemory.create).toHaveBeenCalled();
    });
  });

  describe('Semantic Memory', () => {
    it('should search semantic memory', async () => {
      prisma.semanticMemory.findMany.mockResolvedValue([
        { id: 'sem_1', content: 'AI knowledge', sourceType: 'conversation' },
      ]);

      const result = await service.searchSemanticMemory('user_1', 'AI');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should index semantic memory', async () => {
      prisma.semanticMemory.create.mockResolvedValue({ id: 'sem_new' });

      await service.indexSemanticMemory({
        userId: 'user_1',
        content: 'New knowledge',
        sourceType: 'conversation',
      });

      expect(prisma.semanticMemory.create).toHaveBeenCalled();
    });
  });

  describe('User Preferences', () => {
    it('should get user preferences', async () => {
      prisma.userPreference.findUnique.mockResolvedValue({
        userId: 'user_1',
        preferences: { language: 'zh-CN' },
      });

      const result = await service.getUserPreference('user_1');
      expect(result).toHaveProperty('preferences');
    });

    it('should update user preferences', async () => {
      prisma.userPreference.upsert.mockResolvedValue({
        userId: 'user_1',
        preferences: { language: 'en' },
      });

      await service.updateUserPreference('user_1', { language: 'en' });
      expect(prisma.userPreference.upsert).toHaveBeenCalled();
    });
  });

  describe('Full Context', () => {
    it('should build full context from all three layers', async () => {
      prisma.message.findMany.mockResolvedValue([]);
      prisma.episodicMemory.findMany.mockResolvedValue([]);
      prisma.semanticMemory.findMany.mockResolvedValue([]);
      prisma.userPreference.findUnique.mockResolvedValue(null);

      const result = await service.buildFullContext({
        userId: 'user_1',
        conversationId: 'conv_1',
        query: 'test',
      });

      expect(result).toHaveProperty('workingMemory');
      expect(result).toHaveProperty('episodicMemory');
      expect(result).toHaveProperty('semanticMemory');
      expect(result).toHaveProperty('systemContext');
    });
  });
});