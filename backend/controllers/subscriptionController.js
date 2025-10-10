const Subscription = require('../models/Subscription');

// Abonelik planlarını listele
exports.getPlans = async (req, res) => {
  try {
    const plans = await Subscription.getPlans();
    
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Planlar yüklenirken hata oluştu'
    });
  }
};

// Kullanıcının aktif aboneliğini getir
exports.getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.getUserActiveSubscription(userId);
    const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    
    res.json({
      success: true,
      subscription: subscription || null,
      premiumStatus
    });
  } catch (error) {
    console.error('Get user subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelik bilgileri yüklenirken hata oluştu'
    });
  }
};

// Kullanıcının abonelik geçmişini getir
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const subscriptions = await Subscription.getUserSubscriptions(userId, limit);
    
    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelik geçmişi yüklenirken hata oluştu'
    });
  }
};

// Yeni abonelik oluştur
exports.createSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, paymentMethod, transactionId, amountPaid } = req.body;
    
    if (!planId || !paymentMethod || !transactionId || !amountPaid) {
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik'
      });
    }
    
    const subscription = await Subscription.createSubscription(
      userId,
      planId,
      paymentMethod,
      transactionId,
      amountPaid
    );
    
    res.json({
      success: true,
      message: 'Abonelik başarıyla oluşturuldu',
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Abonelik oluşturulurken hata oluştu'
    });
  }
};

// Aboneliği iptal et
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    
    const subscription = await Subscription.cancelSubscription(userId, subscriptionId, reason);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abonelik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Abonelik başarıyla iptal edildi',
      subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelik iptal edilirken hata oluştu'
    });
  }
};

// Ödeme geçmişini getir
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    
    const payments = await Subscription.getPaymentHistory(userId, limit);
    
    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme geçmişi yüklenirken hata oluştu'
    });
  }
};

// Premium durumu kontrol et
exports.checkPremiumStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    
    res.json({
      success: true,
      premiumStatus
    });
  } catch (error) {
    console.error('Check premium status error:', error);
    res.status(500).json({
      success: false,
      message: 'Premium durumu kontrol edilirken hata oluştu'
    });
  }
};

// ADMIN: Tüm abonelikleri getir
exports.getAllSubscriptions = async (req, res) => {
  try {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const subscriptions = await Subscription.getAllSubscriptions(status, limit, offset);
    
    res.json({
      success: true,
      subscriptions,
      pagination: {
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelikler yüklenirken hata oluştu'
    });
  }
};

// ADMIN: Abonelik istatistikleri
exports.getSubscriptionStats = async (req, res) => {
  try {
    const stats = await Subscription.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken hata oluştu'
    });
  }
};

