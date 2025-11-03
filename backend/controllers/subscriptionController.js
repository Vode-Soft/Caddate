const Subscription = require('../models/Subscription');

// Abonelik planlarını listele
exports.getPlans = async (req, res) => {
  try {
    console.log('getPlans controller called');
    const plans = await Subscription.getPlans();
    console.log('Plans retrieved in controller:', plans.length);
    console.log('Plans data:', JSON.stringify(plans, null, 2));
    
    if (!plans || plans.length === 0) {
      console.warn('⚠️  No plans found in database');
      return res.json({
        success: true,
        plans: [],
        message: 'Henüz plan bulunmamaktadır'
      });
    }
    
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Planlar yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      plans: []
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
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
    
    res.json({
      success: true,
      premiumStatus
    });
  } catch (error) {
    console.error('Check premium status error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    res.status(500).json({
      success: false,
      message: 'Premium durumu kontrol edilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// ADMIN: Kullanıcıya premium üyelik ver
exports.givePremiumToUser = async (req, res) => {
  try {
    const { userId, planId, durationDays, reason } = req.body;
    
    if (!userId || !planId || !durationDays) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID, plan ID ve süre gerekli'
      });
    }

    // Plan bilgilerini al
    const plan = await Subscription.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan bulunamadı'
      });
    }

    // Admin tarafından premium ver
    const subscription = await Subscription.giveAdminPremium(
      userId,
      planId,
      durationDays,
      reason || 'Admin tarafından verildi'
    );
    
    res.json({
      success: true,
      message: 'Premium üyelik başarıyla verildi',
      subscription
    });
  } catch (error) {
    console.error('Give premium to user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Premium üyelik verilirken hata oluştu'
    });
  }
};

// ADMIN: Kullanıcının premium üyeliğini iptal et
exports.revokePremiumFromUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    // Admin tarafından premium iptal et
    const result = await Subscription.revokeAdminPremium(
      userId,
      reason || 'Admin tarafından iptal edildi'
    );
    
    res.json({
      success: true,
      message: 'Premium üyelik başarıyla iptal edildi',
      result
    });
  } catch (error) {
    console.error('Revoke premium from user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Premium üyelik iptal edilirken hata oluştu'
    });
  }
};

