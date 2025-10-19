const request = require('supertest');
const app = require('../../server');

describe('User Controller', () => {
  let testUser;
  let testToken;
  let otherUser;

  beforeEach(async () => {
    // Test kullanıcıları oluştur
    testUser = await global.testUtils.createTestUser({
      email: 'user@test.com',
      password: 'testpassword123'
    });
    
    otherUser = await global.testUtils.createTestUser({
      email: 'other@test.com',
      password: 'testpassword123'
    });
    
    testToken = global.testUtils.createTestToken(testUser.id);
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.first_name).toBe(updateData.first_name);
      expect(response.body.user.last_name).toBe(updateData.last_name);
    });

    it('should not allow email update', async () => {
      const updateData = {
        email: 'newemail@test.com'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      // Email değişmemeli
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('GET /api/users/discover', () => {
    it('should return discoverable users', async () => {
      const response = await request(app)
        .get('/api/users/discover')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users/search?q=Test')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });
  });

  describe('GET /api/users/nearby', () => {
    it('should return nearby users', async () => {
      const response = await request(app)
        .get('/api/users/nearby?lat=41.0082&lng=28.9784')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
