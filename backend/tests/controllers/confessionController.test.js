const request = require('supertest');
const app = require('../../server');

describe('Confession Controller', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // Test kullanıcısı oluştur
    testUser = await global.testUtils.createTestUser({
      email: 'confession@test.com',
      password: 'testpassword123'
    });
    
    testToken = global.testUtils.createTestToken(testUser.id);
  });

  describe('POST /api/confessions', () => {
    it('should create confession successfully', async () => {
      const confessionData = {
        content: 'Bu bir test itirafıdır.',
        isAnonymous: true
      };

      const response = await request(app)
        .post('/api/confessions')
        .set('Authorization', `Bearer ${testToken}`)
        .send(confessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.confession).toBeDefined();
      expect(response.body.data.confession.content).toBe(confessionData.content);
      expect(response.body.data.confession.isAnonymous).toBe(true);
    });

    it('should return error for empty content', async () => {
      const response = await request(app)
        .post('/api/confessions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ content: '', isAnonymous: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('boş olamaz');
    });

    it('should return error for content too long', async () => {
      const longContent = 'a'.repeat(1001);
      
      const response = await request(app)
        .post('/api/confessions')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ content: longContent, isAnonymous: true })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('1000 karakter');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/confessions')
        .send({ content: 'Test confession', isAnonymous: true })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/confessions', () => {
    beforeEach(async () => {
      // Test itirafları oluştur
      await global.testUtils.createTestConfession(testUser.id, 'Test confession 1');
      await global.testUtils.createTestConfession(testUser.id, 'Test confession 2');
    });

    it('should get confessions successfully', async () => {
      const response = await request(app)
        .get('/api/confessions')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.confessions).toBeDefined();
      expect(Array.isArray(response.body.data.confessions)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/confessions?page=1&limit=1')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
    });
  });

  describe('POST /api/confessions/:confessionId/like', () => {
    let confessionId;

    beforeEach(async () => {
      const confession = await global.testUtils.createTestConfession(testUser.id, 'Test confession');
      confessionId = confession.id;
    });

    it('should like confession successfully', async () => {
      const response = await request(app)
        .post(`/api/confessions/${confessionId}/like`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('beğenildi');
    });

    it('should return error for non-existent confession', async () => {
      const response = await request(app)
        .post('/api/confessions/99999/like')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/confessions/:confessionId', () => {
    let confessionId;

    beforeEach(async () => {
      const confession = await global.testUtils.createTestConfession(testUser.id, 'Test confession');
      confessionId = confession.id;
    });

    it('should delete confession successfully', async () => {
      const response = await request(app)
        .delete(`/api/confessions/${confessionId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('silindi');
    });

    it('should return error for non-existent confession', async () => {
      const response = await request(app)
        .delete('/api/confessions/99999')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
