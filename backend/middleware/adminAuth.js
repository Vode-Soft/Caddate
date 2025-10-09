const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Admin kontrolü - sadece admin ve super_admin erişebilir
const requireAdmin = async (req, res, next) => {
  try {
    // Token kontrolü
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Yetkilendirme token\'ı bulunamadı' 
      });
    }

    // Token doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı veritabanından al
    const userQuery = 'SELECT id, email, first_name, last_name, role, admin_level, is_active FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Kullanıcı bulunamadı' 
      });
    }

    const user = userResult.rows[0];

    // Kullanıcı aktif mi kontrol et
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Hesabınız devre dışı bırakılmış' 
      });
    }

    // Admin kontrolü
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir' 
      });
    }

    // Kullanıcı bilgilerini request'e ekle
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token süresi dolmuş' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Yetkilendirme hatası' 
    });
  }
};

// Super admin kontrolü - sadece super_admin erişebilir
const requireSuperAdmin = async (req, res, next) => {
  try {
    // Token kontrolü
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Yetkilendirme token\'ı bulunamadı' 
      });
    }

    // Token doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı veritabanından al
    const userQuery = 'SELECT id, email, first_name, last_name, role, admin_level, is_active FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Kullanıcı bulunamadı' 
      });
    }

    const user = userResult.rows[0];

    // Kullanıcı aktif mi kontrol et
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Hesabınız devre dışı bırakılmış' 
      });
    }

    // Super admin kontrolü
    if (user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Bu işlem için süper admin yetkisi gereklidir' 
      });
    }

    // Kullanıcı bilgilerini request'e ekle
    req.user = user;
    next();
  } catch (error) {
    console.error('Super admin auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Geçersiz token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token süresi dolmuş' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Yetkilendirme hatası' 
    });
  }
};

// Admin seviye kontrolü - belirli bir seviye ve üzeri erişebilir
const requireAdminLevel = (minLevel) => {
  return async (req, res, next) => {
    try {
      // Token kontrolü
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Yetkilendirme token\'ı bulunamadı' 
        });
      }

      // Token doğrula
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Kullanıcıyı veritabanından al
      const userQuery = 'SELECT id, email, first_name, last_name, role, admin_level, is_active FROM users WHERE id = $1';
      const userResult = await pool.query(userQuery, [decoded.userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Kullanıcı bulunamadı' 
        });
      }

      const user = userResult.rows[0];

      // Kullanıcı aktif mi kontrol et
      if (!user.is_active) {
        return res.status(403).json({ 
          success: false,
          message: 'Hesabınız devre dışı bırakılmış' 
        });
      }

      // Admin seviye kontrolü
      if (!user.admin_level || user.admin_level < minLevel) {
        return res.status(403).json({ 
          success: false,
          message: `Bu işlem için minimum ${minLevel} seviye admin yetkisi gereklidir` 
        });
      }

      // Kullanıcı bilgilerini request'e ekle
      req.user = user;
      next();
    } catch (error) {
      console.error('Admin level auth error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Geçersiz token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token süresi dolmuş' 
        });
      }

      res.status(500).json({ 
        success: false,
        message: 'Yetkilendirme hatası' 
      });
    }
  };
};

module.exports = {
  requireAdmin,
  requireSuperAdmin,
  requireAdminLevel
};

