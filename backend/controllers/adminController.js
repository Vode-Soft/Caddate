const { pool } = require('../config/database');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Dashboard istatistikleri
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Dashboard stats requested');
    
    // Kullanıcı istatistikleri
    let userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month
      FROM users
      WHERE deleted_at IS NULL
    `;
    
    // is_premium kolonu varsa ekle
    try {
      const checkColumn = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_premium'
      `);
      
      if (checkColumn.rows.length > 0) {
        userStatsQuery = `
          SELECT 
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE is_active = true) as active_users,
            COUNT(*) FILTER (WHERE is_premium = true) as premium_users,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month
          FROM users
          WHERE deleted_at IS NULL
        `;
      }
    } catch (error) {
      console.log('⚠️  is_premium kolonu kontrolü başarısız');
    }
    
    const userStats = await pool.query(userStatsQuery);
    
    // premium_users yoksa 0 olarak ekle
    if (!userStats.rows[0].premium_users) {
      userStats.rows[0].premium_users = 0;
    }

    // Abonelik istatistikleri (tablolar yoksa boş değer dön)
    let subscriptionStats = {
      active_subscribers: 0,
      active_subscriptions: 0,
      expired_subscriptions: 0,
      cancelled_subscriptions: 0,
      revenue_last_30_days: 0,
      total_revenue: 0
    };
    
    try {
      subscriptionStats = await Subscription.getStats();
    } catch (error) {
      console.log('⚠️  Abonelik tabloları bulunamadı, varsayılan değerler kullanılıyor');
    }

    // Fotoğraf istatistikleri
    const photoStats = await pool.query(`
      SELECT 
        COUNT(*) as total_photos,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as photos_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as photos_month
      FROM photos
    `);

    // Mesaj istatistikleri
    const messageStats = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as messages_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as messages_month
      FROM messages
    `);

    // Araç istatistikleri
    const vehicleStats = await pool.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(*) FILTER (WHERE is_verified = true) as verified_vehicles,
        COUNT(*) FILTER (WHERE is_verified = false) as pending_vehicles
      FROM user_vehicles
    `);

    // Güvenlik istatistikleri
    const securityStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE activity_type = 'login_failed') as failed_logins,
        COUNT(*) FILTER (WHERE activity_type = 'suspicious_activity') as suspicious_activities,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as security_events_week
      FROM security_history
    `);

    // Son 30 günlük kullanıcı artışı (günlük)
    const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const statsResponse = {
      users: userStats.rows[0],
      subscriptions: subscriptionStats,
      photos: photoStats.rows[0],
      messages: messageStats.rows[0],
      vehicles: vehicleStats.rows[0],
      security: securityStats.rows[0],
      userGrowth: userGrowth.rows
    };

    console.log('📊 Dashboard Stats:', JSON.stringify(statsResponse, null, 2));

    res.json({
      success: true,
      stats: statsResponse
    });
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Tüm kullanıcıları listele
exports.getAllUsers = async (req, res) => {
  try {
    console.log('👥 Get all users requested:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all'; // all, active, premium, banned

    // Mevcut kolonları kontrol et
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('deleted_at', 'is_premium', 'premium_until', 'role', 'admin_level')
    `);
    
    const availableColumns = columnsCheck.rows.map(r => r.column_name);
    console.log('Available columns:', availableColumns);

    // WHERE clause oluştur
    let whereClause = 'WHERE 1=1';
    if (availableColumns.includes('deleted_at')) {
      whereClause += ' AND deleted_at IS NULL';
    }

    const params = [limit, offset];
    let paramIndex = 3;

    // Arama
    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtre
    if (filter === 'active') {
      whereClause += ' AND is_active = true';
    } else if (filter === 'premium' && availableColumns.includes('is_premium')) {
      whereClause += ' AND is_premium = true';
    } else if (filter === 'banned') {
      whereClause += ' AND is_active = false';
    }

    // SELECT clause oluştur
    let selectFields = 'id, email, first_name, last_name, birth_date, gender, profile_picture, is_active, email_verified, created_at, updated_at';
    
    if (availableColumns.includes('is_premium')) {
      selectFields += ', is_premium';
    }
    if (availableColumns.includes('premium_until')) {
      selectFields += ', premium_until';
    }
    if (availableColumns.includes('role')) {
      selectFields += ', role';
    }
    if (availableColumns.includes('admin_level')) {
      selectFields += ', admin_level';
    }

    const query = `
      SELECT ${selectFields}
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) FROM users ${whereClause}
    `;

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(2))
    ]);

    // Eksik kolonları varsayılan değerlerle ekle
    const users = usersResult.rows.map(user => ({
      ...user,
      is_premium: user.is_premium ?? false,
      premium_until: user.premium_until ?? null,
      role: user.role ?? 'user',
      admin_level: user.admin_level ?? 0
    }));

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    console.log('✅ Users fetched:', users.length, 'Total:', total);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('❌ Get all users error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Kullanıcı detaylarını getir
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('👤 Get user details requested for userId:', userId);

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Şifreyi çıkar
    delete user.password;

    // Abonelik bilgisi (tablo yoksa null döner)
    let subscription = null;
    try {
      subscription = await Subscription.getUserActiveSubscription(userId);
    } catch (error) {
      console.log('⚠️  Abonelik tablosu bulunamadı');
    }

    // Premium durumu (detaylı bilgi)
    let premiumStatus = null;
    try {
      premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    } catch (error) {
      console.error('⚠️  Premium durumu kontrol edilemedi:', error.message);
      // Hata durumunda varsayılan değer
      premiumStatus = {
        isPremium: user.is_premium || false,
        premiumUntil: user.premium_until || null,
        features: {}
      };
    }

    // Araçlar
    let vehicles = [];
    try {
      const vehiclesResult = await pool.query(
        'SELECT * FROM user_vehicles WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      vehicles = vehiclesResult.rows;
    } catch (error) {
      console.log('⚠️  Araç tablosu bulunamadı');
    }

    // Fotoğraflar
    let photos = [];
    try {
      const photosResult = await pool.query(
        'SELECT * FROM photos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      photos = photosResult.rows;
    } catch (error) {
      console.log('⚠️  Fotoğraf tablosu bulunamadı');
    }

    // Güvenlik geçmişi
    let securityHistory = [];
    try {
      const securityResult = await pool.query(
        'SELECT * FROM security_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
        [userId]
      );
      securityHistory = securityResult.rows;
    } catch (error) {
      console.log('⚠️  Güvenlik geçmişi tablosu bulunamadı');
    }

    // Aktiviteler
    let activities = [];
    try {
      const activitiesResult = await pool.query(
        'SELECT * FROM activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      activities = activitiesResult.rows;
    } catch (error) {
      console.log('⚠️  Aktiviteler tablosu bulunamadı');
    }

    // Mesajlar (gönderilen ve alınan)
    let messages = { sent: 0, received: 0 };
    try {
      const sentResult = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE sender_id = $1',
        [userId]
      );
      const receivedResult = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1',
        [userId]
      );
      messages = {
        sent: parseInt(sentResult.rows[0].count),
        received: parseInt(receivedResult.rows[0].count)
      };
    } catch (error) {
      console.log('⚠️  Mesaj tablosu bulunamadı');
    }

    // Arkadaşlıklar
    let friendships = { friends: 0, pending: 0, blocked: 0 };
    try {
      const friendsResult = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'accepted') as friends,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'blocked') as blocked
        FROM friendships 
        WHERE user_id = $1 OR friend_id = $1
      `, [userId]);
      
      if (friendsResult.rows[0]) {
        friendships = {
          friends: parseInt(friendsResult.rows[0].friends || 0),
          pending: parseInt(friendsResult.rows[0].pending || 0),
          blocked: parseInt(friendsResult.rows[0].blocked || 0)
        };
      }
    } catch (error) {
      console.log('⚠️  Arkadaşlık tablosu bulunamadı');
    }

    // Profil ziyaretleri
    let profileVisits = 0;
    try {
      const visitsResult = await pool.query(
        'SELECT COUNT(*) as count FROM profile_visits WHERE profile_id = $1',
        [userId]
      );
      profileVisits = parseInt(visitsResult.rows[0].count);
    } catch (error) {
      console.log('⚠️  Profil ziyaretleri tablosu bulunamadı');
    }

    console.log('✅ User details fetched successfully');

    res.json({
      success: true,
      user: {
        ...user,
        role: user.role || 'user',
        admin_level: user.admin_level || 0,
        is_premium: user.is_premium || false
      },
      subscription,
      premiumStatus,
      vehicles,
      photos,
      securityHistory,
      activities,
      statistics: {
        messages,
        friendships,
        profileVisits,
        totalPhotos: photos.length,
        totalVehicles: vehicles.length,
        totalActivities: activities.length
      }
    });
  } catch (error) {
    console.error('❌ Get user details error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı detayları yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Kullanıcıyı güncelle
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Şifre güncellemesine izin verme
    delete updates.password;
    delete updates.id;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'is_active', 'is_premium',
      'premium_until', 'role', 'admin_level', 'email_verified'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, is_active, is_premium, role, admin_level
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenirken hata oluştu'
    });
  }
};

// Kullanıcıyı banla/aktif et
exports.toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const newStatus = !user.is_active;

    const query = `
      UPDATE users 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, first_name, last_name, is_active
    `;

    const result = await pool.query(query, [newStatus, userId]);

    // Güvenlik geçmişine kaydet
    const securityQuery = `
      INSERT INTO security_history (user_id, activity_type, description)
      VALUES ($1, $2, $3)
    `;

    await pool.query(securityQuery, [
      userId,
      newStatus ? 'account_activated' : 'account_banned',
      reason || (newStatus ? 'Admin tarafından aktif edildi' : 'Admin tarafından banlandı')
    ]);

    res.json({
      success: true,
      message: newStatus ? 'Kullanıcı aktif edildi' : 'Kullanıcı banlandı',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle user ban error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu değiştirilirken hata oluştu'
    });
  }
};

// Kullanıcıyı sil (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      UPDATE users 
      SET deleted_at = NOW(), is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu'
    });
  }
};

// Tüm fotoğrafları listele
exports.getAllPhotos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        p.*,
        u.email, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM photo_likes WHERE photo_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM photo_comments WHERE photo_id = p.id) as comments_count
      FROM photos p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM photos';

    const [photosResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      photos: photosResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get all photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Fotoğraflar yüklenirken hata oluştu'
    });
  }
};

// Fotoğraf sil
exports.deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const query = 'DELETE FROM photos WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [photoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fotoğraf bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Fotoğraf başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Fotoğraf silinirken hata oluştu'
    });
  }
};

// Tüm araçları listele
exports.getAllVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // all, verified, pending

    let whereClause = '';
    if (filter === 'verified') {
      whereClause = 'WHERE is_verified = true';
    } else if (filter === 'pending') {
      whereClause = 'WHERE is_verified = false';
    }

    const query = `
      SELECT 
        v.*,
        u.email, u.first_name, u.last_name
      FROM user_vehicles v
      LEFT JOIN users u ON v.user_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM user_vehicles ${whereClause}`;

    const [vehiclesResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      vehicles: vehiclesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get all vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Araçlar yüklenirken hata oluştu'
    });
  }
};

// Aracı onayla/reddet
exports.verifyVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { isVerified } = req.body;

    const query = `
      UPDATE user_vehicles 
      SET is_verified = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [isVerified, vehicleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    res.json({
      success: true,
      message: isVerified ? 'Araç onaylandı' : 'Araç onayı kaldırıldı',
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error('Verify vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Araç doğrulanırken hata oluştu'
    });
  }
};

// Aracı sil
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const query = 'DELETE FROM user_vehicles WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [vehicleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Araç başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Araç silinirken hata oluştu'
    });
  }
};

// Mesaj geçmişini getir
exports.getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        m.*,
        u1.email as sender_email, u1.first_name as sender_first_name, u1.last_name as sender_last_name,
        u2.email as receiver_email, u2.first_name as receiver_first_name, u2.last_name as receiver_last_name
      FROM messages m
      LEFT JOIN users u1 ON m.sender_id = u1.id
      LEFT JOIN users u2 ON m.receiver_id = u2.id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM messages';

    const [messagesResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      messages: messagesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar yüklenirken hata oluştu'
    });
  }
};

// Güvenlik olaylarını getir
exports.getSecurityEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        sh.*,
        u.email, u.first_name, u.last_name
      FROM security_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      ORDER BY sh.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM security_history';

    const [eventsResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      events: eventsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Güvenlik olayları yüklenirken hata oluştu'
    });
  }
};

