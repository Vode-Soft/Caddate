const { pool } = require('../config/database');

class FriendSuggestionsController {
  // Arkadaş önerilerini getir
  async getFriendSuggestions(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;

      // Kullanıcının mevcut arkadaşlarını al
      const friendsResult = await pool.query(
        'SELECT friend_id FROM friendships WHERE user_id = $1 AND status = $2',
        [userId, 'accepted']
      );
      const friendIds = friendsResult.rows.map(row => row.friend_id);
      friendIds.push(userId); // Kendisini de hariç tut

      // Kullanıcının konum bilgilerini al
      const userLocationResult = await pool.query(
        'SELECT latitude, longitude FROM users WHERE id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL',
        [userId]
      );

      let suggestions = [];

      if (userLocationResult.rows.length > 0) {
        // Konum bazlı öneriler
        const userLocation = userLocationResult.rows[0];
        const radius = 5000; // 5km yarıçap

        const locationBasedSuggestions = await pool.query(`
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.profile_picture,
            u.age,
            u.bio,
            u.latitude,
            u.longitude,
            ST_Distance(
              ST_Point($1, $2)::geography,
              ST_Point(u.longitude, u.latitude)::geography
            ) as distance,
            'location' as suggestion_reason
          FROM users u
          WHERE u.id != ALL($3)
          AND u.latitude IS NOT NULL 
          AND u.longitude IS NOT NULL
          AND ST_DWithin(
            ST_Point($1, $2)::geography,
            ST_Point(u.longitude, u.latitude)::geography,
            $4
          )
          AND u.id NOT IN (
            SELECT blocked_user_id FROM user_blocks WHERE user_id = $5
            UNION
            SELECT user_id FROM user_blocks WHERE blocked_user_id = $5
          )
          ORDER BY distance ASC
          LIMIT $6
        `, [userLocation.longitude, userLocation.latitude, friendIds, radius, limit]);

        suggestions = locationBasedSuggestions.rows;
      }

      // Eğer konum bazlı öneriler yeterli değilse, ortak arkadaş bazlı öneriler ekle
      if (suggestions.length < limit) {
        const mutualFriendsSuggestions = await pool.query(`
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.profile_picture,
            u.age,
            u.bio,
            COUNT(mutual.friend_id) as mutual_friends_count,
            'mutual_friends' as suggestion_reason
          FROM users u
          LEFT JOIN friendships mutual ON mutual.friend_id = u.id 
            AND mutual.user_id IN (
              SELECT friend_id FROM friendships 
              WHERE user_id = $1 AND status = 'accepted'
            )
          WHERE u.id != ALL($2)
          AND u.id NOT IN (
            SELECT blocked_user_id FROM user_blocks WHERE user_id = $1
            UNION
            SELECT user_id FROM user_blocks WHERE blocked_user_id = $1
          )
          GROUP BY u.id, u.first_name, u.last_name, u.profile_picture, u.age, u.bio
          HAVING COUNT(mutual.friend_id) > 0
          ORDER BY mutual_friends_count DESC
          LIMIT $3
        `, [userId, friendIds, limit - suggestions.length]);

        suggestions = [...suggestions, ...mutualFriendsSuggestions.rows];
      }

      // Eğer hala yeterli öneri yoksa, rastgele öneriler ekle
      if (suggestions.length < limit) {
        const randomSuggestions = await pool.query(`
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.profile_picture,
            u.age,
            u.bio,
            'random' as suggestion_reason
          FROM users u
          WHERE u.id != ALL($1)
          AND u.id NOT IN (
            SELECT blocked_user_id FROM user_blocks WHERE user_id = $2
            UNION
            SELECT user_id FROM user_blocks WHERE blocked_user_id = $2
          )
          ORDER BY RANDOM()
          LIMIT $3
        `, [friendIds, userId, limit - suggestions.length]);

        suggestions = [...suggestions, ...randomSuggestions.rows];
      }

      // Önerileri formatla
      const formattedSuggestions = suggestions.map(suggestion => ({
        id: suggestion.id,
        firstName: suggestion.first_name,
        lastName: suggestion.last_name,
        profilePicture: suggestion.profile_picture,
        age: suggestion.age,
        bio: suggestion.bio,
        distance: suggestion.distance ? Math.round(suggestion.distance) : null,
        mutualFriendsCount: suggestion.mutual_friends_count || 0,
        suggestionReason: suggestion.suggestion_reason,
        isOnline: false // Bu bilgi gerçek zamanlı olarak güncellenebilir
      }));

      res.json({
        success: true,
        data: {
          suggestions: formattedSuggestions,
          totalCount: formattedSuggestions.length
        }
      });

    } catch (error) {
      console.error('Get friend suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Arkadaş önerileri alınırken bir hata oluştu'
      });
    }
  }

  // Önerilen kullanıcıyı beğen
  async likeSuggestion(req, res) {
    try {
      const { suggestedUserId } = req.params;
      const userId = req.user.id;

      if (suggestedUserId == userId) {
        return res.status(400).json({
          success: false,
          message: 'Kendinizi beğenemezsiniz'
        });
      }

      // Daha önce beğenmiş mi kontrol et
      const existingLike = await pool.query(
        'SELECT id FROM user_likes WHERE user_id = $1 AND liked_user_id = $2',
        [userId, suggestedUserId]
      );

      if (existingLike.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu kullanıcıyı zaten beğendiniz'
        });
      }

      // Beğeniyi kaydet
      await pool.query(
        'INSERT INTO user_likes (user_id, liked_user_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [userId, suggestedUserId]
      );

      // Karşılıklı beğeni kontrolü
      const mutualLike = await pool.query(
        'SELECT id FROM user_likes WHERE user_id = $1 AND liked_user_id = $2',
        [suggestedUserId, userId]
      );

      if (mutualLike.rows.length > 0) {
        // Karşılıklı beğeni - arkadaşlık oluştur
        await pool.query(
          'INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [userId, suggestedUserId, 'accepted']
        );
        await pool.query(
          'INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [suggestedUserId, userId, 'accepted']
        );

        res.json({
          success: true,
          message: 'Eşleşme! Yeni arkadaşlık oluşturuldu',
          isMatch: true
        });
      } else {
        res.json({
          success: true,
          message: 'Kullanıcı beğenildi',
          isMatch: false
        });
      }

    } catch (error) {
      console.error('Like suggestion error:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı beğenilirken bir hata oluştu'
      });
    }
  }

  // Önerilen kullanıcıyı geç
  async passSuggestion(req, res) {
    try {
      const { suggestedUserId } = req.params;
      const userId = req.user.id;

      // Geçme kaydını oluştur
      await pool.query(
        'INSERT INTO user_passes (user_id, passed_user_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [userId, suggestedUserId]
      );

      res.json({
        success: true,
        message: 'Kullanıcı geçildi'
      });

    } catch (error) {
      console.error('Pass suggestion error:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı geçilirken bir hata oluştu'
      });
    }
  }

  // Öneri istatistiklerini getir
  async getSuggestionStats(req, res) {
    try {
      const userId = req.user.id;

      // Beğeni sayısı
      const likesResult = await pool.query(
        'SELECT COUNT(*) FROM user_likes WHERE user_id = $1',
        [userId]
      );

      // Geçme sayısı
      const passesResult = await pool.query(
        'SELECT COUNT(*) FROM user_passes WHERE user_id = $1',
        [userId]
      );

      // Eşleşme sayısı
      const matchesResult = await pool.query(
        'SELECT COUNT(*) FROM friendships WHERE user_id = $1 AND status = $2',
        [userId, 'accepted']
      );

      res.json({
        success: true,
        data: {
          totalLikes: parseInt(likesResult.rows[0].count),
          totalPasses: parseInt(passesResult.rows[0].count),
          totalMatches: parseInt(matchesResult.rows[0].count)
        }
      });

    } catch (error) {
      console.error('Get suggestion stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Öneri istatistikleri alınırken bir hata oluştu'
      });
    }
  }
}

module.exports = new FriendSuggestionsController();
