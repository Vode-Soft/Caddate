const { pool } = require('../config/database');

// Mesaj geçmişini getir
const getMessageHistory = async (req, res) => {
  try {
    const { room = 'general', limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    console.log(`Mesaj geçmişi isteniyor - Kullanıcı: ${userId}, Oda: ${room}`);

    // Genel sohbet için tüm mesajları getir
    let query;
    let params;

    if (room === 'general') {
      // Genel sohbet için receiver_id NULL olan mesajları getir
      query = `
        SELECT 
          m.id,
          m.sender_id,
          m.message,
          m.message_type,
          m.is_read,
          m.created_at,
          u.first_name,
          u.last_name,
          u.profile_picture
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.receiver_id IS NULL
        ORDER BY m.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    } else {
      // Özel sohbet için kullanıcı ile ilgili mesajları getir
      query = `
        SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.message,
          m.message_type,
          m.is_read,
          m.created_at,
          u.first_name,
          u.last_name,
          u.profile_picture
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
           OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      params = [userId, room, limit, offset];
    }

    const result = await pool.query(query, params);
    
    // Tam URL oluştur
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Mesajları formatla
    const messages = result.rows.map(row => {
      const profilePictureUrl = row.profile_picture ? `${protocol}://${host}${row.profile_picture}` : null;
      console.log(`💬 ChatHistory - User: ${row.first_name} ${row.last_name} - Profile Picture URL:`, profilePictureUrl);
      
      return {
        id: row.id,
        senderId: row.sender_id,
        senderName: `${row.first_name} ${row.last_name}`,
        senderEmail: row.first_name, // Geçici olarak
        message: row.message,
        messageType: row.message_type,
        isRead: row.is_read,
        timestamp: row.created_at,
        profilePicture: profilePictureUrl
      };
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: messages.length
      }
    });

  } catch (error) {
    console.error('Mesaj geçmişi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj geçmişi alınırken hata oluştu'
    });
  }
};

// Mesaj gönder
const sendMessage = async (req, res) => {
  try {
    const { message, room = 'general', receiverId = null } = req.body;
    const senderId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj boş olamaz'
      });
    }

    // Premium kontrolü - ücretsiz kullanıcılar için mesaj limiti
    const Subscription = require('../models/Subscription');
    const premiumStatus = await Subscription.checkUserPremiumStatus(senderId);
    
    if (!premiumStatus.isPremium || !premiumStatus.features['unlimited_messages']) {
      // Ücretsiz kullanıcılar için günlük mesaj limiti kontrolü
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const messageCountQuery = `
        SELECT COUNT(*) as message_count
        FROM messages
        WHERE sender_id = $1 
          AND created_at >= $2
      `;
      const countResult = await pool.query(messageCountQuery, [senderId, today]);
      const dailyMessageCount = parseInt(countResult.rows[0].message_count);
      
      const FREE_USER_MESSAGE_LIMIT = 20; // Ücretsiz kullanıcılar için günlük 20 mesaj
      
      if (dailyMessageCount >= FREE_USER_MESSAGE_LIMIT) {
        return res.status(403).json({
          success: false,
          message: `Günlük mesaj limitinize ulaştınız (${FREE_USER_MESSAGE_LIMIT} mesaj/gün). Premium üyelik ile sınırsız mesaj gönderebilirsiniz.`,
          requiresPremium: true,
          limit: FREE_USER_MESSAGE_LIMIT,
          used: dailyMessageCount
        });
      }
    }

    console.log(`Mesaj gönderiliyor - Gönderen: ${senderId}, Oda: ${room}, Alıcı: ${receiverId}`);

    // Mesajı veritabanına kaydet
    const query = `
      INSERT INTO messages (sender_id, receiver_id, message, message_type, created_at)
      VALUES ($1, $2, $3, 'text', NOW())
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [senderId, receiverId, message]);
    const messageId = result.rows[0].id;
    const createdAt = result.rows[0].created_at;

    // Kullanıcı bilgilerini al
    const userQuery = `
      SELECT first_name, last_name, profile_picture
      FROM users
      WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [senderId]);
    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: messageId,
        senderId: senderId,
        senderName: `${user.first_name} ${user.last_name}`,
        message: message,
        messageType: 'text',
        timestamp: createdAt,
        profilePicture: user.profile_picture
      }
    });

  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken hata oluştu'
    });
  }
};

// Mesajı okundu olarak işaretle
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE messages 
      SET is_read = true 
      WHERE id = $1 AND receiver_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [messageId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mesaj bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Mesaj okundu olarak işaretlendi'
    });

  } catch (error) {
    console.error('Mesaj okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj okundu işaretlenirken hata oluştu'
    });
  }
};

// Okunmamış mesaj sayısını getir
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT COUNT(*) as unread_count
      FROM messages
      WHERE receiver_id = $1 AND is_read = false
    `;
    
    const result = await pool.query(query, [userId]);
    const unreadCount = parseInt(result.rows[0].unread_count);

    res.json({
      success: true,
      data: {
        unreadCount: unreadCount
      }
    });

  } catch (error) {
    console.error('Okunmamış mesaj sayısı hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Okunmamış mesaj sayısı alınırken hata oluştu'
    });
  }
};

// Özel mesaj geçmişini getir
const getPrivateMessageHistory = async (req, res) => {
  try {
    const { friendId, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: 'Arkadaş ID gerekli'
      });
    }

    console.log(`Özel mesaj geçmişi isteniyor - Kullanıcı: ${userId}, Arkadaş: ${friendId}`);

    // İki kullanıcı arasındaki mesajları getir
    const query = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.message,
        m.message_type,
        m.is_read,
        m.created_at,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    
    const result = await pool.query(query, [userId, friendId, limit, offset]);
    
    // Mesajları formatla
    const messages = result.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: `${row.first_name} ${row.last_name}`,
      message: row.message,
      messageType: row.message_type,
      isRead: row.is_read,
      timestamp: row.created_at,
      profilePicture: row.profile_picture
    }));

    res.json({
      success: true,
      data: messages,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: messages.length
      }
    });

  } catch (error) {
    console.error('Özel mesaj geçmişi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel mesaj geçmişi alınırken hata oluştu'
    });
  }
};

// Özel mesaj gönder
const sendPrivateMessage = async (req, res) => {
  try {
    const { message, friendId } = req.body;
    const senderId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj boş olamaz'
      });
    }

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: 'Arkadaş ID gerekli'
      });
    }

    // Premium kontrolü - ücretsiz kullanıcılar için mesaj limiti
    const Subscription = require('../models/Subscription');
    const premiumStatus = await Subscription.checkUserPremiumStatus(senderId);
    
    if (!premiumStatus.isPremium || !premiumStatus.features['unlimited_messages']) {
      // Ücretsiz kullanıcılar için günlük mesaj limiti kontrolü
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const messageCountQuery = `
        SELECT COUNT(*) as message_count
        FROM messages
        WHERE sender_id = $1 
          AND created_at >= $2
      `;
      const countResult = await pool.query(messageCountQuery, [senderId, today]);
      const dailyMessageCount = parseInt(countResult.rows[0].message_count);
      
      const FREE_USER_MESSAGE_LIMIT = 20; // Ücretsiz kullanıcılar için günlük 20 mesaj
      
      if (dailyMessageCount >= FREE_USER_MESSAGE_LIMIT) {
        return res.status(403).json({
          success: false,
          message: `Günlük mesaj limitinize ulaştınız (${FREE_USER_MESSAGE_LIMIT} mesaj/gün). Premium üyelik ile sınırsız mesaj gönderebilirsiniz.`,
          requiresPremium: true,
          limit: FREE_USER_MESSAGE_LIMIT,
          used: dailyMessageCount
        });
      }
    }

    console.log(`Özel mesaj gönderiliyor - Gönderen: ${senderId}, Alıcı: ${friendId}`);

    // Mesajı veritabanına kaydet
    const query = `
      INSERT INTO messages (sender_id, receiver_id, message, message_type, created_at)
      VALUES ($1, $2, $3, 'text', NOW())
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [senderId, friendId, message]);
    const messageId = result.rows[0].id;
    const createdAt = result.rows[0].created_at;

    // Kullanıcı bilgilerini al
    const userQuery = `
      SELECT first_name, last_name, profile_picture
      FROM users
      WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [senderId]);
    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: messageId,
        senderId: senderId,
        senderName: `${user.first_name} ${user.last_name}`,
        message: message,
        messageType: 'text',
        timestamp: createdAt,
        profilePicture: user.profile_picture
      }
    });

  } catch (error) {
    console.error('Özel mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel mesaj gönderilirken hata oluştu'
    });
  }
};

// Özel konuşmaları getir
const getPrivateConversations = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    console.log(`Özel konuşmalar isteniyor - Kullanıcı: ${userId}`);

    // Kullanıcının özel mesajlaştığı kişileri getir
    const query = `
      WITH conversation_partners AS (
        SELECT DISTINCT
          CASE 
            WHEN m.sender_id = $1 THEN m.receiver_id
            WHEN m.receiver_id = $1 THEN m.sender_id
          END as friend_id
        FROM messages m
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
          AND m.receiver_id IS NOT NULL
      ),
      last_messages AS (
        SELECT 
          cp.friend_id,
          m.message as last_message,
          m.created_at as last_message_time,
          ROW_NUMBER() OVER (PARTITION BY cp.friend_id ORDER BY m.created_at DESC) as rn
        FROM conversation_partners cp
        JOIN messages m ON (
          (m.sender_id = $1 AND m.receiver_id = cp.friend_id) OR
          (m.sender_id = cp.friend_id AND m.receiver_id = $1)
        )
      )
      SELECT 
        cp.friend_id,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.is_active,
        lm.last_message,
        lm.last_message_time
      FROM conversation_partners cp
      LEFT JOIN users u ON u.id = cp.friend_id
      LEFT JOIN last_messages lm ON lm.friend_id = cp.friend_id AND lm.rn = 1
      WHERE u.is_active = true
      ORDER BY lm.last_message_time DESC
      LIMIT $2 OFFSET $3
    `;
    
    console.log('SQL Query:', query);
    console.log('Query parameters:', [userId, limit, offset]);
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    console.log('Query result:', result.rows);
    
    // Tam URL oluştur
    const protocol = req.protocol;
    const host = req.get('host');

    // Konuşmaları formatla
    const conversations = result.rows.map(row => ({
      friendId: row.friend_id,
      friendName: `${row.first_name} ${row.last_name}`,
      profilePicture: row.profile_picture ? `${protocol}://${host}${row.profile_picture}` : null,
      lastMessage: row.last_message || 'Henüz mesaj yok',
      lastMessageTime: row.last_message_time,
      unreadCount: 0 // Geçici olarak 0
    }));

    res.json({
      success: true,
      data: conversations,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: conversations.length
      }
    });

  } catch (error) {
    console.error('Özel konuşmalar hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel konuşmalar alınırken hata oluştu'
    });
  }
};

// Özel sohbeti temizle (tüm mesajları sil)
const clearPrivateChat = async (req, res) => {
  try {
    const { friendId } = req.query;
    const userId = req.user.id;

    console.log(`Özel sohbet temizleniyor - Kullanıcı: ${userId}, Arkadaş: ${friendId}`);

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: 'Arkadaş ID gerekli'
      });
    }

    // Kullanıcı ile arkadaş arasındaki tüm mesajları sil
    const query = `
      DELETE FROM messages 
      WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
    `;
    
    const result = await pool.query(query, [userId, friendId]);
    
    console.log(`Silinen mesaj sayısı: ${result.rowCount}`);

    res.json({
      success: true,
      message: 'Sohbet temizlendi',
      deletedCount: result.rowCount
    });

  } catch (error) {
    console.error('Sohbet temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sohbet temizlenirken hata oluştu'
    });
  }
};

module.exports = {
  getMessageHistory,
  sendMessage,
  markMessageAsRead,
  getUnreadCount,
  getPrivateMessageHistory,
  sendPrivateMessage,
  getPrivateConversations,
  clearPrivateChat
};
