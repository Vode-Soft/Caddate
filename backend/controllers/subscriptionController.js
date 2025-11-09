const Subscription = require('../models/Subscription');

// Abonelik planlarını listele
exports.getPlans = async (req, res) => {
  try {
    const plans = await Subscription.getPlans();
    
    if (!plans || plans.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  No plans found in database');
      }
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
    
    // Veritabanı hatası ise özel mesaj
    if (error.code === '42P01') { // Table does not exist
      console.error('❌ subscription_plans tablosu bulunamadı!');
      return res.status(500).json({
        success: false,
        message: 'Planlar tablosu bulunamadı. Lütfen veritabanı migrasyonunu çalıştırın.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        plans: []
      });
    }
    
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
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
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
      message: 'Abonelik bilgileri yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Kullanıcının abonelik geçmişini getir
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100
    
    const subscriptions = await Subscription.getUserSubscriptions(userId, limit);
    
    res.json({
      success: true,
      subscriptions: subscriptions || []
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelik geçmişi yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Yeni abonelik oluştur
exports.createSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const { planId, paymentMethod, transactionId, amountPaid } = req.body;
    
    // Validation
    if (!planId || !paymentMethod || !transactionId || amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik: planId, paymentMethod, transactionId ve amountPaid gerekli'
      });
    }
    
    // Amount validation
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ödeme tutarı'
      });
    }
    
    const subscription = await Subscription.createSubscription(
      userId,
      planId,
      paymentMethod,
      transactionId,
      amount
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
      message: error.message || 'Abonelik oluşturulurken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Aboneliği iptal et
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Abonelik ID gerekli'
      });
    }
    
    const { reason } = req.body;
    
    const subscription = await Subscription.cancelSubscription(userId, subscriptionId, reason);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abonelik bulunamadı veya iptal edilemez'
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
      message: error.message || 'Abonelik iptal edilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ödeme geçmişini getir
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
    
    const payments = await Subscription.getPaymentHistory(userId, limit);
    
    res.json({
      success: true,
      payments: payments || []
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme geçmişi yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Premium durumu kontrol et
exports.checkPremiumStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    
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
    const status = req.query.status || null;
    const page = Math.max(parseInt(req.query.page) || 1, 1); // Min 1
    const limit = Math.min(parseInt(req.query.limit) || 25, 500); // Max 500, default 25
    const offset = (page - 1) * limit;
    
    const result = await Subscription.getAllSubscriptions(status, limit, offset);
    
    res.json({
      success: true,
      subscriptions: result.subscriptions || [],
      pagination: {
        page,
        limit,
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelikler yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ADMIN: Abonelik istatistikleri
exports.getSubscriptionStats = async (req, res) => {
  try {
    const stats = await Subscription.getStats();
    
    res.json({
      success: true,
      stats: stats || {}
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

