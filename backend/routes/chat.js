const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getMessageHistory,
  sendMessage,
  markMessageAsRead,
  getUnreadCount,
  getPrivateMessageHistory,
  sendPrivateMessage,
  getPrivateConversations,
  clearPrivateChat
} = require('../controllers/chatController');

// Tüm chat route'ları auth middleware'i gerektirir
router.use(authenticateToken);

// Mesaj geçmişini getir
router.get('/history', getMessageHistory);

// Mesaj gönder (Premium kontrolü controller'da yapılıyor - ücretsiz kullanıcılar sınırlı mesaj gönderebilir)
router.post('/send', sendMessage);

// Mesajı okundu olarak işaretle
router.patch('/:messageId/read', markMessageAsRead);

// Okunmamış mesaj sayısını getir
router.get('/unread-count', getUnreadCount);

// Özel mesajlaşma route'ları
// Özel mesaj geçmişini getir
router.get('/private/history', getPrivateMessageHistory);

// Özel mesaj gönder (Premium kontrolü controller'da yapılıyor - ücretsiz kullanıcılar sınırlı mesaj gönderebilir)
router.post('/private/send', sendPrivateMessage);

// Özel konuşmaları getir
router.get('/private/conversations', getPrivateConversations);

// Özel sohbeti temizle
router.delete('/private/clear', clearPrivateChat);

module.exports = router;
