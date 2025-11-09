const Subscription = require('../models/Subscription');

// Premium kullanıcı kontrolü
const requirePremium = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli'
      });
    }

    const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    
    if (!premiumStatus.isPremium) {
      return res.status(403).json({
        success: false,
        message: 'Bu özellik sadece premium kullanıcılar için geçerlidir',
        requiresPremium: true
      });
    }

    // Premium bilgilerini request'e ekle
    req.premiumStatus = premiumStatus;
    next();
  } catch (error) {
    console.error('Premium auth error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    
    // Veritabanı hatası kontrolü
    if (error.code === '42P01') {
      return res.status(500).json({
        success: false,
        message: 'Veritabanı tablosu bulunamadı. Lütfen sistem yöneticisine başvurun.',
        error: 'Database table not found'
      });
    }
    
    // Diğer veritabanı hataları
    if (error.code && error.code.startsWith('42')) {
      return res.status(500).json({
        success: false,
        message: 'Veritabanı hatası oluştu',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Yetkilendirme hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Belirli bir premium özelliği kontrolü
const requirePremiumFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Yetkilendirme gerekli'
        });
      }

      const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
      
      if (!premiumStatus.isPremium) {
        return res.status(403).json({
          success: false,
          message: 'Bu özellik sadece premium kullanıcılar için geçerlidir',
          requiresPremium: true,
          requiredFeature: featureName
        });
      }

      // Özellik kontrolü (özellik true olmalı, false veya undefined ise erişim yok)
      const featureValue = premiumStatus.features[featureName];
      if (featureValue !== true) {
        return res.status(403).json({
          success: false,
          message: `Bu özellik '${featureName}' premium planınızda mevcut değil`,
          requiresPremium: true,
          requiredFeature: featureName
        });
      }

      // Premium bilgilerini request'e ekle
      req.premiumStatus = premiumStatus;
      
      // Özellik kullanımını kaydet (kritik değil, hata olsa bile devam et)
      try {
        await Subscription.trackFeatureUsage(userId, featureName);
      } catch (trackError) {
        // Tracking hatası kritik değil, sadece logla ve devam et
        console.warn('Feature usage tracking error (non-critical):', trackError.message);
      }
      
      next();
    } catch (error) {
      console.error('Premium feature auth error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      
      // Veritabanı hatası kontrolü
      if (error.code === '42P01') {
        return res.status(500).json({
          success: false,
          message: 'Veritabanı tablosu bulunamadı. Lütfen sistem yöneticisine başvurun.',
          error: 'Database table not found'
        });
      }
      
      // Diğer veritabanı hataları
      if (error.code && error.code.startsWith('42')) {
        return res.status(500).json({
          success: false,
          message: 'Veritabanı hatası oluştu',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Yetkilendirme hatası',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// Premium veya Admin kontrolü (hem premium hem de admin erişebilir)
const requirePremiumOrAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli'
      });
    }

    // Admin ise direkt geçir
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    // Değilse premium kontrolü yap
    const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    
    if (!premiumStatus.isPremium) {
      return res.status(403).json({
        success: false,
        message: 'Bu özellik sadece premium kullanıcılar ve adminler için geçerlidir',
        requiresPremium: true
      });
    }

    req.premiumStatus = premiumStatus;
    next();
  } catch (error) {
    console.error('Premium or admin auth error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    
    // Veritabanı hatası kontrolü
    if (error.code === '42P01') {
      return res.status(500).json({
        success: false,
        message: 'Veritabanı tablosu bulunamadı. Lütfen sistem yöneticisine başvurun.',
        error: 'Database table not found'
      });
    }
    
    // Diğer veritabanı hataları
    if (error.code && error.code.startsWith('42')) {
      return res.status(500).json({
        success: false,
        message: 'Veritabanı hatası oluştu',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Yetkilendirme hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  requirePremium,
  requirePremiumFeature,
  requirePremiumOrAdmin
};

