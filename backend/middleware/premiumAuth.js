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
    res.status(500).json({
      success: false,
      message: 'Yetkilendirme hatası'
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
      
      // Özellik kullanımını kaydet
      await Subscription.trackFeatureUsage(userId, featureName);
      
      next();
    } catch (error) {
      console.error('Premium feature auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Yetkilendirme hatası'
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
    res.status(500).json({
      success: false,
      message: 'Yetkilendirme hatası'
    });
  }
};

module.exports = {
  requirePremium,
  requirePremiumFeature,
  requirePremiumOrAdmin
};

