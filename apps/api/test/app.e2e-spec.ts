import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * HermesChat API 端到端测试
 */
describe('HermesChat API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let conversationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== 认证 ====================

  describe('Auth', () => {
    it('/auth/login - 管理员登录成功', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hermes.chat', password: 'admin123' })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'admin@hermes.chat');
      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('/auth/login - 密码错误返回 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@hermes.chat', password: 'wrong' })
        .expect(401);
    });

    it('/auth/me - 获取当前用户信息', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(res.body).toHaveProperty('email', 'admin@hermes.chat');
    });
  });

  // ==================== 对话 ====================

  describe('Conversations', () => {
    it('/conversations - 创建对话', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', 'Bearer ' + authToken)
        .send({ title: '测试对话', modelId: 'model00000000000000000000000001' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('测试对话');
      conversationId = res.body.id;
    });

    it('/conversations - 获取对话列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('/conversations/:id - 获取对话详情', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations/' + conversationId)
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(res.body.id).toBe(conversationId);
    });

    it('/conversations/:id/share - 创建分享', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations/' + conversationId + '/share')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(201);

      expect(res.body).toHaveProperty('sharedId');
    });
  });

  // ==================== 短链 ====================

  describe('Short Links', () => {
    it('/short-links - 创建短链', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/short-links')
        .set('Authorization', 'Bearer ' + authToken)
        .send({ url: 'https://example.com/test' })
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('shortUrl');
      expect(res.body.originalUrl).toBe('https://example.com/test');
    });

    it('/short-links - 获取短链列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/short-links')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('/s/:code - 短链跳转', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/short-links')
        .set('Authorization', 'Bearer ' + authToken)
        .send({ url: 'https://example.com/redirect-test' });

      await request(app.getHttpServer())
        .get('/api/s/' + createRes.body.code)
        .expect(302);
    });
  });

  // ==================== Skill ====================

  describe('Skills', () => {
    it('/skills - 创建 Skill', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/skills')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: '测试 Skill',
          description: '自动化测试用',
          prompt: 'You are a test assistant.',
          isPublic: false,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('测试 Skill');
    });

    it('/skills - 获取 Skill 列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/skills')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ==================== MCP ====================

  describe('MCP', () => {
    it('/mcp - 创建 MCP 服务器', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mcp')
        .set('Authorization', 'Bearer ' + authToken)
        .send({
          name: 'Test MCP',
          transport: 'sse',
          config: { url: 'http://localhost:3001/sse' },
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test MCP');
    });

    it('/mcp - 获取 MCP 列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mcp')
        .set('Authorization', 'Bearer ' + authToken)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ==================== 模型 ====================

  describe('Models', () => {
    it('/models - 获取可用模型列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/models')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});