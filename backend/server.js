const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Konfiqurasiya və middleware import
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

// Routes import
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/review');
const paymentRoutes = require('./routes/payments'); // 🆕 STRIPE PAYMENTS

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (Heroku, Vercel üçün)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 dəqiqə
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // maksimum request
  message: {
    success: false,
    error: 'Çox sayda request göndərirsiniz. Zəhmət olmasa bir az gözləyin.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://yourfrontenddomain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'];
    
    // Development üçün origin check-ni burax
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS tərəfindən bloklandı'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// 🆕 Special handling for Stripe webhooks (must be before express.json())
app.use('/api/payments/webhook', express.raw({type: 'application/json'}));

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb' 
}));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'MarketPlace Pro API işləyir',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MarketPlace Pro API-sinə xoş gəlmisiniz!',
    version: '1.0.0',
    documentation: `${process.env.API_URL || 'http://localhost:5000'}/api/docs`,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      reviews: '/api/reviews',
      payments: '/api/payments' // 🆕 PAYMENTS ENDPOINT
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes); // 🆕 STRIPE PAYMENTS ROUTE

// 🆕 Test Stripe Configuration
app.get('/api/test-stripe', (req, res) => {
  console.log('🔑 Stripe Configuration Test:');
  console.log('  - Secret Key:', process.env.STRIPE_SECRET_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('  - Publishable Key:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Loaded' : '❌ Missing');
  console.log('  - Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Loaded' : '❌ Missing');
  
  res.json({
    success: true,
    message: 'Stripe konfiqurasiya test',
    stripe: {
      secretKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? 
        process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'Missing',
      publishableKeyConfigured: !!process.env.STRIPE_PUBLISHABLE_KEY,
      publishableKeyPrefix: process.env.STRIPE_PUBLISHABLE_KEY ? 
        process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 10) + '...' : 'Missing',
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false
    },
    instructions: {
      step1: 'GET /api/payments/test-config - Stripe test konfiqurasiyası',
      step2: 'POST /api/payments/create-intent - Payment intent yaradın',
      step3: 'Frontend-də test kartı 4242424242424242 istifadə edin',
      testCards: {
        success: '4242424242424242',
        declined: '4000000000000002',
        requiresAuth: '4000002760003184'
      }
    }
  });
});

// Test route - database bağlantısını test et
app.get('/api/test', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({
        success: true,
        message: 'Database bağlantısı uğurludur',
        dbStatus: 'connected',
        dbName: mongoose.connection.name,
        host: mongoose.connection.host
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database bağlantısı yoxdur',
        dbStatus: 'disconnected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test xətası',
      error: error.message
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.get('/api/test/reviews-setup', async (req, res) => {
    try {
      const Review = require('./models/Review');
      const Product = require('./models/Product');
      const User = require('./models/User');
      
      // Test məlumatları
      const reviewCount = await Review.countDocuments();
      const productCount = await Product.countDocuments();
      const userCount = await User.countDocuments();
      
      // Review route-larını yoxla
      const reviewRoutes = [
        'GET /api/reviews/info/routes - Route documentation',
        'GET /api/reviews/product/:productId - Public product reviews',
        'POST /api/reviews - Create review (auth required)',
        'GET /api/reviews/my-reviews - My reviews (auth required)',
        'POST /api/reviews/:id/vote - Vote helpful (auth required)',
        'GET /api/reviews/vendor/my-reviews - Vendor reviews (vendor role)',
        'GET /api/reviews/admin/all - All reviews (admin role)'
      ];

      res.status(200).json({
        success: true,
        message: 'Review sistem statusu',
        data: {
          database: {
            reviews: reviewCount,
            products: productCount,
            users: userCount
          },
          availableRoutes: reviewRoutes,
          testInstructions: {
            step1: 'Register/login bir user ilə',
            step2: 'GET /api/reviews/info/routes ilə bütün route-ları gör',
            step3: 'GET /api/products ilə bir product ID al',
            step4: 'POST /api/reviews ilə review yarat',
            step5: 'GET /api/reviews/product/:productId ilə review-ları gör'
          },
          tips: [
            'Review yaratmaq üçün Bearer token lazımdır',
            'Bir user bir product üçün yalnız bir review yaza bilər',
            'Review-lar avtomatik moderation keçir',
            'Vendor cavabı yalnız vendor role ilə verilə bilər'
          ]
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Review setup test xətası',
        error: error.message
      });
    }
  });
}

// Development email test
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/send-email', async (req, res) => {
    try {
      const emailService = require('./utils/emailService');
      
      await emailService.sendEmail({
        to: req.body.email || 'test@example.com',
        subject: 'Test Email from MarketPlace Pro',
        html: '<h1>Test Email</h1><p>Email sistemi işləyir! 🎉</p>'
      });

      res.json({
        success: true,
        message: 'Test email göndərildi!'
      });
    } catch (error) {
      res.json({
        success: false,
        error: error.message
      });
    }
  });
}

// Cart test endpoint
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/create-cart-and-add', protect, async (req, res) => {
    try {
      const Cart = require('./models/Cart');
      const Product = require('./models/Product');
      
      // Əvvəlcə mövcud səbəti sil
      await Cart.deleteMany({ user: req.user.id });
      
      // Yeni səbət yarat
      const cart = await Cart.create({
        user: req.user.id,
        items: [],
        status: 'active'
      });

      // Mövcud məhsul tap
      const product = await Product.findOne({ status: 'active' });
      
      if (!product) {
        return res.json({ success: false, message: 'Aktiv məhsul tapılmadı' });
      }

      // Məhsulu əlavə et
      const newItem = {
        product: product._id,
        quantity: 1,
        unitPrice: product.pricing?.sellingPrice || 100,
        totalPrice: product.pricing?.sellingPrice || 100,
        currency: 'AZN',
        productSnapshot: {
          name: product.name,
          sku: product.sku,
          image: product.images?.[0]?.url || null,
          brand: product.brand,
          category: product.category,
          status: product.status,
          inStock: true
        },
        selectedVariants: [],
        addedAt: new Date(),
        updatedAt: new Date()
      };

      cart.items.push(newItem);
      await cart.save();

      res.json({
        success: true,
        message: 'Səbət yaradıldı və məhsul əlavə edildi',
        cart: {
          id: cart._id,
          itemCount: cart.items.length,
          product: product.name
        }
      });

    } catch (error) {
      console.error('Create cart error:', error);
      res.json({ success: false, error: error.message });
    }
  });
}

// Users test endpoint
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test/users', async (req, res) => {
    try {
      const User = require('./models/User');
      
      const users = await User.find()
        .select('firstName lastName email role isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(20);

      res.status(200).json({
        success: true,
        message: 'Mövcud istifadəçilər',
        count: users.length,
        data: users
      });

    } catch (error) {
      console.error('İstifadəçiləri alma xətası:', error);
      res.status(500).json({
        success: false,
        message: 'İstifadəçilər alınarkən xəta baş verdi',
        error: error.message
      });
    }
  });
}

// Make admin test endpoint
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/make-admin', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email daxil edilməlidir'
        });
      }

      const User = require('./models/User');
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { role: 'admin' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'İstifadəçi tapılmadı'
        });
      }

      res.status(200).json({
        success: true,
        message: `${user.email} artıq admin-dir`,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName
        }
      });

    } catch (error) {
      console.error('Admin etmə xətası:', error);
      res.status(500).json({
        success: false,
        message: 'Server xətası'
      });
    }
  });
}

// Make vendor test endpoint
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/make-vendor', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email daxil edilməlidir'
        });
      }

      const User = require('./models/User');
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { 
          role: 'vendor',
          'vendorInfo.businessName': 'Test Business',
          'vendorInfo.businessType': 'individual',
          'vendorInfo.isVerified': true
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'İstifadəçi tapılmadı'
        });
      }

      res.status(200).json({
        success: true,
        message: `${user.email} artıq vendor-dir`,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          businessName: user.vendorInfo?.businessName
        }
      });

    } catch (error) {
      console.error('Vendor etmə xətası:', error);
      res.status(500).json({
        success: false,
        message: 'Server xətası'
      });
    }
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🔄 Server bağlanır...');
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ MongoDB bağlantısı bağlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown xətası:', error);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error('Stack:', err.stack);
  
  // Server-i bağla
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Server başlatılması
const startServer = async () => {
  try {
    // Database bağlantısı
    await connectDB();
    
    // Server başlat
    const server = app.listen(PORT, () => {
      console.log('\n🚀================================🚀');
      console.log(`📡 Server ${PORT} portunda işləyir`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
      console.log(`💳 Stripe Test: http://localhost:${PORT}/api/test-stripe`); // 🆕
      console.log(`💰 Payment Config: http://localhost:${PORT}/api/payments/test-config`); // 🆕
      console.log(`⭐ Review System: http://localhost:${PORT}/api/reviews/info/routes`);
      console.log('🚀================================🚀\n');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💡 Development məsləhətləri:');
        console.log('   - Postman və ya Thunder Client istifadə edin');
        console.log('   - .env faylını yoxlayın');
        console.log('   - MongoDB Atlas bağlantısını test edin');
        console.log('   - Stripe konfiqurasiyası: GET /api/test-stripe'); // 🆕
        console.log('   - Payment test: GET /api/payments/test-config'); // 🆕
        console.log('   - Review API: GET /api/reviews/info/routes');
        console.log('   - Review test: GET /api/test/reviews-setup\n');
        
        // 🆕 Stripe environment validation
        console.log('🔑 Stripe Environment Check:');
        console.log('   - Secret Key:', process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing');
        console.log('   - Publishable Key:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Configured' : '❌ Missing');
        console.log('   - Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configured' : '⚠️ Missing (Optional)');
        
        if (!process.env.STRIPE_SECRET_KEY) {
          console.log('❌ STRIPE_SECRET_KEY missing in .env file!');
          console.log('   Add: STRIPE_SECRET_KEY=sk_test_your_key_here');
        }
        
        if (!process.env.STRIPE_PUBLISHABLE_KEY) {
          console.log('❌ STRIPE_PUBLISHABLE_KEY missing in .env file!');
          console.log('   Add: STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here');
        }
        
        console.log('');
      }
    });

    // Server error handling
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} artıq istifadədədir`);
        console.log('💡 Həll yolları:');
        console.log(`   - Başqa port istifadə edin: PORT=5001 npm run dev`);
        console.log(`   - Running olan prosesi dayandırın: lsof -ti:${PORT} | xargs kill`);
      } else {
        console.error('❌ Server xətası:', error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Server başladılmasında xəta:', error.message);
    process.exit(1);
  }
};

// Development environment check
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;