const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');

describe('Auth Middleware', () => {
  let testUser;
  let validToken;
  let invalidToken;

  beforeEach(async () => {
    testUser = await global.testUtils.createTestUser({
      email: 'middleware@test.com',
      password: 'testpassword123'
    });
    
    validToken = global.testUtils.createTestToken(testUser.id);
    invalidToken = 'invalid-token';
  });

  describe('authenticateToken middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny access with malformed token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer malformed.token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny access with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id }, 
        process.env.JWT_SECRET || 'test-secret', 
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('adminAuth middleware', () => {
    it('should allow access for admin user', async () => {
      // Admin kullanıcı oluştur
      const adminUser = await global.testUtils.createTestUser({
        email: 'admin@test.com',
        password: 'testpassword123'
      });

      // Admin rolü ver
      const client = await global.testUtils.getTestDb().connect();
      try {
        await client.query(
          'UPDATE users SET role = $1, admin_level = $2 WHERE id = $3',
          ['admin', 50, adminUser.id]
        );
      } finally {
        await client.release();
      }

      const adminToken = global.testUtils.createTestToken(adminUser.id);

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for regular user', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('premiumAuth middleware', () => {
    it('should allow access for premium user', async () => {
      // Premium kullanıcı oluştur
      const premiumUser = await global.testUtils.createTestUser({
        email: 'premium@test.com',
        password: 'testpassword123'
      });

      // Premium durumu ver
      const client = await global.testUtils.getTestDb().connect();
      try {
        await client.query(
          'UPDATE users SET is_premium = $1, premium_until = $2 WHERE id = $3',
          [true, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), premiumUser.id]
        );
      } finally {
        await client.release();
      }

      const premiumToken = global.testUtils.createTestToken(premiumUser.id);

      const response = await request(app)
        .get('/api/users/premium-features')
        .set('Authorization', `Bearer ${premiumToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny access for non-premium user', async () => {
      const response = await request(app)
        .get('/api/users/premium-features')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
