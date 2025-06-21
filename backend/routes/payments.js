// backend/routes/payments.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for payment routes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    error: 'Çox sayda ödəniş cəhdi. Zəhmət olmasa 15 dəqiqə gözləyin.'
  }
});

// Apply rate limiting to most payment routes (not webhook)
router.use((req, res, next) => {
  if (req.path === '/webhook') {
    next(); // Skip rate limiting for webhook
  } else {
    paymentLimiter(req, res, next);
  }
});

// 🚀 Create Payment Intent
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { amount, currency = 'usd', orderInfo, customerInfo } = req.body;
    const userId = req.user.id;

    console.log('💳 Creating Stripe Payment Intent:', {
      amount,
      currency,
      userId,
      orderInfo: orderInfo?.orderNumber
    });

    // Validate amount (minimum $0.50 = 50 cents)
    if (amount < 50) {
      return res.status(400).json({
        success: false,
        error: 'Minimum ödəniş məbləği $0.50-dir'
      });
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId,
        userEmail: req.user.email,
        orderNumber: orderInfo?.orderNumber || `temp_${Date.now()}`,
        customerEmail: customerInfo?.email || req.user.email,
        source: 'marketplace_checkout'
      }
    });

    console.log('✅ Payment Intent created:', paymentIntent.id);

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });

  } catch (error) {
    console.error('❌ Payment Intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ödəniş başladılmasında xəta'
    });
  }
});

// ✅ Confirm Payment
router.post('/confirm/:paymentIntentId', protect, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user.id;

    console.log('✅ Confirming payment:', paymentIntentId);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment belongs to user
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Bu ödəniş sizə aid deyil'
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Ödəniş tamamlanmayıb',
        status: paymentIntent.status
      });
    }

    console.log('✅ Payment confirmed successfully');

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: 'completed',
        chargeId: paymentIntent.latest_charge,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created
      }
    });

  } catch (error) {
    console.error('❌ Payment confirmation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ödəniş təsdiqlənməsində xəta'
    });
  }
});

// 📊 Get Payment Status
router.get('/status/:paymentIntentId', protect, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.user.id;

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment belongs to user
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Bu ödəniş sizə aid deyil'
      });
    }

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000),
        lastPaymentError: paymentIntent.last_payment_error
      }
    });

  } catch (error) {
    console.error('❌ Payment status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ödəniş statusu yoxlanmasında xəta'
    });
  }
});

// 📈 Payment Analytics (Development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/analytics', protect, async (req, res) => {
    try {
      // This is a simple analytics endpoint for development
      // In production, you should store payment data in your database
      
      res.json({
        success: true,
        message: 'Payment analytics (development mode)',
        data: {
          info: 'Bu endpoint production-da database-dən real məlumat qaytaracaq',
          stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
          webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
          testCards: {
            success: '4242424242424242',
            declined: '4000000000000002',
            requiresAuth: '4000002760003184'
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// 🧪 Test endpoint (Development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/test-config', (req, res) => {
    res.json({
      success: true,
      message: 'Stripe konfiqurasiya test',
      data: {
        stripeSecretConfigured: !!process.env.STRIPE_SECRET_KEY,
        stripeSecretPrefix: process.env.STRIPE_SECRET_KEY ? 
          process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...' : 'Missing',
        stripePublishableConfigured: !!process.env.STRIPE_PUBLISHABLE_KEY,
        stripePublishablePrefix: process.env.STRIPE_PUBLISHABLE_KEY ? 
          process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 12) + '...' : 'Missing',
        webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.NODE_ENV,
        testInstructions: [
          '1. Frontend-də kart ödənişi seçin',
          '2. Test kartı: 4242424242424242 istifadə edin',
          '3. CVC: 123, Expiry: 12/25',
          '4. Ödəniş uğurlu olmalıdır'
        ]
      }
    });
  });
}

module.exports = router;