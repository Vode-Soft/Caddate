const express = require('express');
const cors = require('cors');
const Subscription = require('./models/Subscription');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/subscriptions/plans', async (req, res) => {
  try {
    console.log('Plans endpoint called');
    const plans = await Subscription.getPlans();
    console.log('Plans retrieved:', plans.length);
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Planlar yüklenirken hata oluştu',
      error: error.message
    });
  }
});

// Admin stats route
app.get('/api/subscriptions/admin/stats', async (req, res) => {
  try {
    console.log('Admin stats endpoint called');
    const stats = await Subscription.getStats();
    console.log('Stats retrieved:', stats);
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken hata oluştu',
      error: error.message
    });
  }
});

// Admin all subscriptions route
app.get('/api/subscriptions/admin/all', async (req, res) => {
  try {
    console.log('Admin all subscriptions endpoint called');
    const subscriptions = await Subscription.getAllSubscriptions();
    console.log('Subscriptions retrieved:', subscriptions.length);
    res.json({
      success: true,
      subscriptions,
      pagination: {
        total: subscriptions.length,
        limit: 25,
        offset: 0
      }
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelikler yüklenirken hata oluştu',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});



