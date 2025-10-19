const request = require('supertest');
const app = require('../../server');

describe('Chat Controller', () => {
  let testUser;
  let otherUser;
  let testToken;
  let otherToken;

  beforeEach(async () => {
    // Test kullanıcıları oluştur
    testUser = await global.testUtils.createTestUser({
      email: 'chat@test.com',
      password: 'testpassword123'
    });
    
    otherUser = await global.testUtils.createTestUser({
      email: 'otherchat@test.com',
      password: 'testpassword123'
    });
    
    testToken = global.testUtils.createTestToken(testUser.id);
    otherToken = global.testUtils.createTestToken(otherUser.id);
  });

  describe('POST /api/chat/send', () => {
    it('should send message successfully', async () => {
      const messageData = {
        receiver_id: otherUser.id,
        message: 'Test message',
        message_type: 'text'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.message.content).toBe(messageData.message);
    });

    it('should return error for invalid receiver', async () => {
      const messageData = {
        receiver_id: 99999, // Var olmayan kullanıcı
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for empty message', async () => {
      const messageData = {
        receiver_id: otherUser.id,
        message: ''
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/history', () => {
    it('should get message history', async () => {
      // Önce bir mesaj gönder
      await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          receiver_id: otherUser.id,
          message: 'Test message'
        });

      const response = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });

  describe('POST /api/chat/mark-read', () => {
    it('should mark message as read', async () => {
      // Önce bir mesaj gönder
      const sendResponse = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          receiver_id: otherUser.id,
          message: 'Test message'
        });

      const messageId = sendResponse.body.message.id;

      const response = await request(app)
        .post('/api/chat/mark-read')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ message_id: messageId })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/chat/unread-count', () => {
    it('should get unread message count', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unreadCount).toBeDefined();
      expect(typeof response.body.unreadCount).toBe('number');
    });
  });
});
