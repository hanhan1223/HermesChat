import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

/**
 * 用户隔离 E2E 测试
 * 
 * 验证：
 * 1. 未认证请求被拒绝
 * 2. 用户只能访问自己的资源
 * 3. 跨用户访问被拒绝
 * 4. JWT 验证正确性
 */
describe('User Isolation (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let user1Token: string;
  let user2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = app.get(JwtService);
    await app.init();

    // 生成测试用 JWT
    user1Token = jwtService.sign({ sub: 'user_1', email: 'user1@test.com', role: 'USER' });
    user2Token = jwtService.sign({ sub: 'user_2', email: 'user2@test.com', role: 'USER' });
    adminToken = jwtService.sign({ sub: 'admin_1', email: 'admin@test.com', role: 'ADMIN' });
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== 认证测试 ====================

  describe('Authentication', () => {
    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should accept request with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', 'Bearer ' + user1Token)
        .expect(200);
    });
  });

  // ==================== 资源隔离测试 ====================

  describe('Resource Isolation', () => {
    it('should inject user ID from JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', 'Bearer ' + user1Token)
        .expect(200);

      // 验证响应头包含用户 ID
      expect(res.headers['x-user-id']).toBe('user_1');
    });

    it('should not allow user1 to access user2 resources', async () => {
      // user1 尝试获取 user2 的对话
      await request(app.getHttpServer())
        .get('/api/conversations/user2_conv_id')
        .set('Authorization', 'Bearer ' + user1Token)
        .expect(404); // 或 403
    });

    it('should allow admin to access any resource', async () => {
      await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200);
    });
  });

  // ==================== 跨用户操作测试 ====================

  describe('Cross-User Operations', () => {
    let conversationId: string;

    it('user1 can create a conversation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', 'Bearer ' + user1Token)
        .send({ title: 'User1 Conversation', modelId: 'model_1' })
        .expect(201);

      conversationId = res.body.id;
      expect(res.body).toHaveProperty('id');
    });

    it('user2 cannot delete user1 conversation', async () => {
      await request(app.getHttpServer())
        .delete('/api/conversations/' + conversationId)
        .set('Authorization', 'Bearer ' + user2Token)
        .expect(403);
    });

    it('user1 can delete own conversation', async () => {
      await request(app.getHttpServer())
        .delete('/api/conversations/' + conversationId)
        .set('Authorization', 'Bearer ' + user1Token)
        .expect(200);
    });
  });
});