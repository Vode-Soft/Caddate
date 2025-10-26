const { pool } = require('../config/database');
const { createNotification } = require('./notificationController');
const antiSpamController = require('./antiSpamController');

// Kullanıcıyı beğen (Like)
const likeUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { likedUserId } = req.body;

    console.log('👍 Like isteği:', { userId, likedUserId });

    if (!likedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Beğenilecek kullanıcı ID gerekli'
      });
    }

    if (userId === parseInt(likedUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinizi beğenemezsiniz'
      });
    }

    // Anti-spam kontrolü
    const spamCheck = await antiSpamController.canLikeUser(userId, likedUserId);
    if (!spamCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: spamCheck.reason,
        waitTime: spamCheck.waitTime,
        remaining: spamCheck.remaining,
        spamScore: spamCheck.spamScore
      });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const userCheck = await pool.query(
      'SELECT id, is_active FROM users WHERE id = $1',
      [likedUserId]
    );

    if (userCheck.rows.length === 0 || !userCheck.rows[0].is_active) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Daha önce beğenilmiş mi kontrol et
    const existingMatch = await pool.query(
      'SELECT * FROM matches WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)',
      [userId, likedUserId]
    );

    if (existingMatch.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu kullanıcıyı zaten beğenmişsiniz'
      });
    }

    // Karşı taraf seni beğenmiş mi kontrol et
    const reverseMatch = await pool.query(
      'SELECT * FROM matches WHERE user1_id = $1 AND user2_id = $2',
      [likedUserId, userId]
    );

    const isMutual = reverseMatch.rows.length > 0;

    // Match kaydı oluştur
    const result = await pool.query(
      'INSERT INTO matches (user1_id, user2_id, is_mutual, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *',
      [userId, likedUserId, isMutual]
    );

    // Eğer karşılıklı eşleşme varsa, karşı tarafın kaydını da güncelle
    if (isMutual) {
      await pool.query(
        'UPDATE matches SET is_mutual = true, updated_at = CURRENT_TIMESTAMP WHERE user1_id = $1 AND user2_id = $2',
        [likedUserId, userId]
      );

      // Kullanıcı bilgilerini al
      const userInfo = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      // Karşılıklı eşleşme bildirimi gönder
      await createNotification(
        likedUserId,
        'match',
        'Yeni Eşleşme! 💕',
        `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name} ile eşleştiniz!`,
        {
          matchedUserId: userId,
          matchedUserName: `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`,
          isMutual: true
        },
        userId
      );

      console.log('💘 Karşılıklı eşleşme oluştu!');
    }

    res.json({
      success: true,
      message: isMutual ? 'Karşılıklı eşleşme oluştu!' : 'Kullanıcı beğenildi',
      data: {
        match: result.rows[0],
        isMutual
      }
    });
  } catch (error) {
    console.error('Like user error:', error);
    res.status(500).json({
      success: false,
      message: 'Beğeni işlemi başarısız',
      error: error.message
    });
  }
};

// Beğeniyi geri al (Unlike)
const unlikeUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unlikedUserId } = req.params;

    console.log('👎 Unlike isteği:', { userId, unlikedUserId });

    if (!unlikedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    // Match kaydını sil
    const result = await pool.query(
      'DELETE FROM matches WHERE user1_id = $1 AND user2_id = $2 RETURNING *',
      [userId, unlikedUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Beğeni kaydı bulunamadı'
      });
    }

    // Eğer karşılıklı eşleşme ise, karşı tarafın kaydını güncelle
    if (result.rows[0].is_mutual) {
      await pool.query(
        'UPDATE matches SET is_mutual = false WHERE user1_id = $1 AND user2_id = $2',
        [unlikedUserId, userId]
      );
    }

    res.json({
      success: true,
      message: 'Beğeni geri alındı'
    });
  } catch (error) {
    console.error('Unlike user error:', error);
    res.status(500).json({
      success: false,
      message: 'Beğeni geri alma işlemi başarısız',
      error: error.message
    });
  }
};

// Eşleşme listesini getir
const getMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, mutualOnly = 'true' } = req.query;

    console.log('📋 Eşleşme listesi isteği:', { userId, mutualOnly });

    let query;
    let queryParams;

    if (mutualOnly === 'true') {
      // Sadece karşılıklı eşleşmeleri getir
      query = `
        SELECT DISTINCT
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.is_active,
          u.location_latitude,
          u.location_longitude,
          m.created_at as matched_at,
          m.is_mutual,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age
        FROM matches m
        JOIN users u ON (
          CASE 
            WHEN m.user1_id = $1 THEN u.id = m.user2_id
            WHEN m.user2_id = $1 THEN u.id = m.user1_id
          END
        )
        WHERE (m.user1_id = $1 OR m.user2_id = $1)
          AND m.is_mutual = true
          AND u.is_active = true
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, parseInt(limit), parseInt(offset)];
    } else {
      // Tüm beğenileri getir (karşılıklı olsun olmasın)
      query = `
        SELECT DISTINCT
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.is_active,
          u.location_latitude,
          u.location_longitude,
          m.created_at as matched_at,
          m.is_mutual,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age
        FROM matches m
        JOIN users u ON u.id = m.user2_id
        WHERE m.user1_id = $1
          AND u.is_active = true
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, parseInt(limit), parseInt(offset)];
    }

    const result = await pool.query(query, queryParams);

    const matches = result.rows.map(match => ({
      id: match.id,
      firstName: match.first_name,
      lastName: match.last_name,
      name: `${match.first_name} ${match.last_name}`,
      profilePicture: match.profile_picture,
      age: match.age || null,
      isActive: match.is_active,
      location: match.location_latitude && match.location_longitude ? {
        latitude: parseFloat(match.location_latitude),
        longitude: parseFloat(match.location_longitude)
      } : null,
      matchedAt: match.matched_at,
      isMutual: match.is_mutual
    }));

    res.json({
      success: true,
      data: {
        matches,
        totalCount: matches.length,
        hasMore: matches.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Eşleşme listesi alınamadı',
      error: error.message
    });
  }
};

// Seni beğenenleri getir (Likes you)
const getLikesReceived = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    console.log('💝 Seni beğenenler listesi:', { userId });

    const query = `
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.birth_date,
        u.is_active,
        m.created_at as liked_at,
        m.is_mutual,
        EXTRACT(YEAR FROM AGE(u.birth_date)) as age
      FROM matches m
      JOIN users u ON u.id = m.user1_id
      WHERE m.user2_id = $1
        AND u.is_active = true
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, parseInt(limit), parseInt(offset)]);

    const likes = result.rows.map(like => ({
      id: like.id,
      firstName: like.first_name,
      lastName: like.last_name,
      name: `${like.first_name} ${like.last_name}`,
      profilePicture: like.profile_picture,
      age: like.age || null,
      isActive: like.is_active,
      likedAt: like.liked_at,
      isMutual: like.is_mutual
    }));

    res.json({
      success: true,
      data: {
        likes,
        totalCount: likes.length,
        hasMore: likes.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get likes received error:', error);
    res.status(500).json({
      success: false,
      message: 'Beğeni listesi alınamadı',
      error: error.message
    });
  }
};

// Eşleşme önerileri getir (Yakındaki kullanıcılar + algoritmik öneriler)
const getSuggestedMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 20, 
      offset = 0, 
      maxDistance = 100, // km cinsinden
      minAge = 18,
      maxAge = 99,
      gender = 'all'
    } = req.query;

    console.log('🎯 Eşleşme önerileri isteği:', { userId, maxDistance, minAge, maxAge, gender });

    // Kullanıcının cinsiyetini kontrol et
    const userInfo = await pool.query(
      'SELECT gender, location_latitude, location_longitude, birth_date FROM users WHERE id = $1',
      [userId]
    );

    if (userInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const { gender: userGender, location_latitude, location_longitude, birth_date } = userInfo.rows[0];

    console.log('👤 User info:', { userGender, location_latitude, location_longitude });

    // Kız kullanıcılar için öncelikli eşleşme sistemi
    if (userGender === 'female') {
      const prioritizedMatches = await antiSpamController.getPrioritizedMatches(userId, parseInt(limit));
      if (prioritizedMatches.success) {
        return res.json({
          success: true,
          data: {
            suggestions: prioritizedMatches.matches,
            totalCount: prioritizedMatches.total,
            hasMore: prioritizedMatches.matches.length === parseInt(limit),
            isPrioritized: true
          }
        });
      }
    }

    // Daha basit ve güvenli bir sorgu - konum kontrolü olmadan
    let query = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.profile_picture,
        u.birth_date,
        u.gender,
        u.is_active,
        u.location_latitude,
        u.location_longitude,
        u.location_last_updated,
        u.created_at,
        EXTRACT(YEAR FROM AGE(u.birth_date)) as age
      FROM users u
      WHERE u.id != $1
        AND u.is_active = true
        AND u.birth_date IS NOT NULL
        AND u.id NOT IN (
          SELECT user2_id FROM matches WHERE user1_id = $1
          UNION
          SELECT user1_id FROM matches WHERE user2_id = $1
        )
    `;
    
    // Parametre sayacı
    let paramIndex = 4;
    const conditions = [];
    
    // Yaş filtresi ekle (SQL seviyesinde)
    conditions.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) >= $${paramIndex}`);
    paramIndex++;
    conditions.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) <= $${paramIndex}`);
    paramIndex++;
    
    // Cinsiyet filtresi ekle
    if (gender !== 'all') {
      conditions.push(`u.gender = $${paramIndex}`);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`;

    // Query parametrelerini hazırla
    const queryParams = [userId, parseInt(limit), parseInt(offset)];
    
    // Yaş parametrelerini ekle
    queryParams.push(parseInt(minAge), parseInt(maxAge));
    
    // Cinsiyet parametresini ekle
    if (gender !== 'all') {
      queryParams.push(gender);
    }
    
    console.log('📋 Query:', query);
    console.log('📋 Query Params:', queryParams);
    
    const result = await pool.query(query, queryParams);

    // Mesafe hesaplama fonksiyonu (Haversine formula) - Düzeltilmiş ve Debug
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) {
        console.log('⚠️ Missing coordinates:', { lat1, lon1, lat2, lon2 });
        return null;
      }
      
      // Değerleri sayıya çevir
      const lat1Num = parseFloat(lat1);
      const lon1Num = parseFloat(lon1);
      const lat2Num = parseFloat(lat2);
      const lon2Num = parseFloat(lon2);
      
      console.log('📍 Calculating distance between:', {
        from: { lat: lat1Num, lon: lon1Num },
        to: { lat: lat2Num, lon: lon2Num }
      });
      
      const R = 6371; // Earth radius in kilometers
      const dLat = (lat2Num - lat1Num) * Math.PI / 180;
      const dLon = (lon2Num - lon1Num) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Num * Math.PI / 180) * Math.cos(lat2Num * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;
      
      console.log('📏 Calculated distance:', distanceKm.toFixed(2), 'km');
      
      // Kilometre cinsinden döndür (virgülden sonra 2 basamak)
      return Math.round(distanceKm * 100) / 100;
    };

    const suggestions = result.rows
      .map(user => {
        const distance = calculateDistance(
          location_latitude,
          location_longitude,
          user.location_latitude,
          user.location_longitude
        );

        return {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          profilePicture: user.profile_picture,
          age: user.age || null,
          isActive: user.is_active,
          gender: user.gender,
          location: user.location_latitude && user.location_longitude ? {
            latitude: parseFloat(user.location_latitude),
            longitude: parseFloat(user.location_longitude)
          } : null,
          distance: distance,
          locationLastUpdated: user.location_last_updated
        };
      })
      .filter(user => {
        // Sadece mesafe filtresini burada yapalım (SQL'de yapılamaz çünkü dinamik hesaplama gerekiyor)
        if (user.distance && user.distance > parseFloat(maxDistance)) {
          console.log(`❌ Distance filter: User ${user.id} (${user.distance}km) exceeds ${maxDistance}km`);
          return false;
        }
        
        console.log(`✅ User ${user.id} passed all filters`);
        return true;
      });

    console.log(`🎯 Final suggestions count: ${suggestions.length}`);

    res.json({
      success: true,
      data: {
        suggestions,
        totalCount: suggestions.length,
        hasMore: suggestions.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get suggested matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Eşleşme önerileri alınamadı',
      error: error.message
    });
  }
};

// Eşleşme istatistikleri
const getMatchStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        COUNT(CASE WHEN (user1_id = $1 OR user2_id = $1) AND is_mutual = true THEN 1 END) as total_matches,
        COUNT(CASE WHEN user1_id = $1 THEN 1 END) as likes_sent,
        COUNT(CASE WHEN user2_id = $1 THEN 1 END) as likes_received,
        COUNT(CASE WHEN user2_id = $1 AND is_mutual = false THEN 1 END) as pending_likes
      FROM matches 
      WHERE user1_id = $1 OR user2_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalMatches: parseInt(stats.total_matches) || 0,
        likesSent: parseInt(stats.likes_sent) || 0,
        likesReceived: parseInt(stats.likes_received) || 0,
        pendingLikes: parseInt(stats.pending_likes) || 0
      }
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
};

module.exports = {
  likeUser,
  unlikeUser,
  getMatches,
  getLikesReceived,
  getSuggestedMatches,
  getMatchStats
};

