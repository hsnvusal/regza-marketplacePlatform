const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getVendorOrders,
  updateVendorOrderStatus,
  addTracking,
  getAllOrders,
  getOrderStats,
  // ← Bu tracking metodlarını import edin
  trackByNumber,
  updateTracking,
  updateTrackingStatus,
  getOrderTracking
} = require('../controllers/orderController');
const { protect, authorize, vendorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createOrderValidation = [
  body('shippingAddress.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 simvol arası olmalıdır'),
  
  body('shippingAddress.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 simvol arası olmalıdır'),
  
  body('shippingAddress.phone')
    .isMobilePhone(['az-AZ', 'tr-TR', 'en-US'])
    .withMessage('Düzgün telefon nömrəsi daxil edin'),
  
  body('shippingAddress.email')
    .optional()
    .isEmail()
    .withMessage('Düzgün email formatı daxil edin'),
  
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Küçə ünvanı 5-200 simvol arası olmalıdır'),
  
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Şəhər adı 2-100 simvol arası olmalıdır'),
  
  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ölkə adı 100 simvoldan çox ola bilməz'),
  
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery', 'crypto'])
    .withMessage('Düzgün ödəniş metodu seçin'),
  
  body('customerNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Müştəri qeydi 1000 simvoldan çox ola bilməz'),
  
  body('requestedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Düzgün tarix formatı daxil edin'),
  
  body('specialInstructions.giftWrap')
    .optional()
    .isBoolean()
    .withMessage('Hədiyyə qablaşdırması true/false olmalıdır'),
  
  body('specialInstructions.giftMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Hədiyyə mesajı 500 simvoldan çox ola bilməz')
];

const cancelOrderValidation = [
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Ləğv etmə səbəbi 5-500 simvol arası olmalıdır')
];

const vendorStatusValidation = [
  body('status')
    .isIn(['confirmed', 'processing', 'shipped', 'delivered'])
    .withMessage('Status confirmed, processing, shipped və ya delivered ola bilər'),
  
  body('vendorNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Vendor qeydi 1000 simvoldan çox ola bilməz'),
  
  body('trackingInfo.trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking nömrəsi 3-50 simvol arası olmalıdır'),
  
  body('trackingInfo.carrier')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Daşıyıcı adı 2-100 simvol arası olmalıdır')
];

const trackingValidation = [
  body('trackingNumber')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking nömrəsi 3-50 simvol arası olmalıdır'),
  
  body('carrier')
    .isIn(['azerpost', 'bravo', 'express', 'pickup', 'other'])
    .withMessage('Düzgün daşıyıcı seçin'),
  
  body('carrierName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Daşıyıcı adı 2-100 simvol arası olmalıdır'),
  
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Düzgün tarix formatı daxil edin'),
  
  body('trackingUrl')
    .optional()
    .isURL()
    .withMessage('Düzgün URL formatı daxil edin'),
  
  body('deliveryInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Çatdırılma təlimatı 500 simvoldan çox ola bilməz'),
  
  body('vendorOrderId')
    .optional()
    .isMongoId()
    .withMessage('Düzgün vendor order ID formatı')
];

const trackingStatusValidation = [
  body('status')
    .isIn(['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned'])
    .withMessage('Düzgün tracking status seçin'),
  
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Şəhər adı 2-100 simvol arası olmalıdır'),
  
  body('location.address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Ünvan 200 simvoldan çox ola bilməz'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Təsvir 500 simvoldan çox ola bilməz'),
  
  body('vendorOrderId')
    .optional()
    .isMongoId()
    .withMessage('Düzgün vendor order ID formatı'),
  
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Düzgün tarix formatı daxil edin'),
  
  body('deliveryAttempt.status')
    .optional()
    .isIn(['failed', 'successful', 'rescheduled'])
    .withMessage('Çatdırılma cəhdi statusu failed, successful və ya rescheduled ola bilər'),
  
  body('deliveryAttempt.reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Çatdırılma cəhdi səbəbi 200 simvoldan çox ola bilməz'),
  
  body('deliveryAttempt.nextAttempt')
    .optional()
    .isISO8601()
    .withMessage('Növbəti cəhd tarixi düzgün formatda olmalıdır'),
  
  body('deliveryAttempt.notes')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Çatdırılma cəhdi qeydi 300 simvoldan çox ola bilməz')
];

const orderQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Səhifə nömrəsi müsbət tam rəqəm olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arası olmalıdır'),
  
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'completed'])
    .withMessage('Düzgün status seçin'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Başlanğıc tarixi düzgün formatda daxil edin'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Bitmə tarixi düzgün formatda daxil edin')
];

const orderIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Düzgün sifariş ID formatı daxil edin')
];

const trackingNumberValidation = [
  param('trackingNumber')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tracking nömrəsi 3-50 simvol arası olmalıdır')
    .isAlphanumeric()
    .withMessage('Tracking nömrəsi yalnız hərf və rəqəmlərdən ibarət ola bilər')
];

// ===========================================
// PUBLIC ROUTES - Authentication tələb olunmur
// ===========================================

// @route   GET /api/orders/track/:trackingNumber
// @desc    Public tracking by tracking number
// @access  Public
router.get('/track/:trackingNumber', trackingNumberValidation, trackByNumber);

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Qalan route-lar authentication tələb edir
router.use(protect);

// @route   POST /api/orders
// @desc    Səbətdən sifariş yarat
// @access  Private
router.post('/', createOrderValidation, createOrder);

// @route   GET /api/orders
// @desc    İstifadəçi sifarişlərini al
// @access  Private
router.get('/', orderQueryValidation, getMyOrders);

// @route   GET /api/orders/stats
// @desc    Sifariş statistikası
// @access  Private
router.get('/stats', getOrderStats);

// @route   GET /api/orders/:id
// @desc    Sifariş detayı
// @access  Private
router.get('/:id', orderIdValidation, getOrder);

// @route   GET /api/orders/:id/tracking
// @desc    Order tracking məlumatı al
// @access  Private
router.get('/:id/tracking', orderIdValidation, getOrderTracking);

// @route   PUT /api/orders/:id/cancel
// @desc    Sifarişi ləğv et
// @access  Private
router.put('/:id/cancel', [orderIdValidation, ...cancelOrderValidation], cancelOrder);

// ===========================================
// VENDOR ROUTES
// ===========================================

// @route   GET /api/orders/vendor/my-orders
// @desc    Vendor sifarişlərini al
// @access  Private (Vendor)
router.get('/vendor/my-orders', authorize('vendor', 'admin'), orderQueryValidation, getVendorOrders);

// @route   PUT /api/orders/:id/vendor-status
// @desc    Vendor sifariş statusunu yenilə
// @access  Private (Vendor)
router.put('/:id/vendor-status', 
  authorize('vendor', 'admin'), 
  [orderIdValidation, ...vendorStatusValidation], 
  updateVendorOrderStatus
);

// @route   PUT /api/orders/:id/tracking
// @desc    Tracking məlumatı əlavə et/yenilə (Enhanced)
// @access  Private (Vendor/Admin)
router.put('/:id/tracking', 
  authorize('vendor', 'admin'), 
  [orderIdValidation, ...trackingValidation], 
  updateTracking
);

// @route   PUT /api/orders/:id/tracking/status
// @desc    Tracking status yenilə
// @access  Private (Vendor/Admin)
router.put('/:id/tracking/status', 
  authorize('vendor', 'admin'), 
  [orderIdValidation, ...trackingStatusValidation], 
  updateTrackingStatus
);

// ===========================================
// ADMIN ROUTES
// ===========================================

// @route   GET /api/orders/admin/all
// @desc    Admin - bütün sifarişlər
// @access  Private (Admin)
router.get('/admin/all', authorize('admin'), orderQueryValidation, getAllOrders);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/orders/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Private
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Orders API Routes',
      routes: {
        public: {
          'GET /api/orders/track/:trackingNumber': 'Public tracking by tracking number'
        },
        customer: {
          'POST /api/orders': 'Səbətdən sifariş yarat',
          'GET /api/orders': 'Öz sifarişlərini al',
          'GET /api/orders/stats': 'Öz sifariş statistikası',
          'GET /api/orders/:id': 'Sifariş detayı',
          'GET /api/orders/:id/tracking': 'Sifariş tracking məlumatı',
          'PUT /api/orders/:id/cancel': 'Sifarişi ləğv et',
          'GET /api/orders/info/routes': 'Route siyahısı (dev only)'
        },
        vendor: {
          'GET /api/orders/vendor/my-orders': 'Vendor sifarişləri',
          'PUT /api/orders/:id/vendor-status': 'Vendor sifariş statusunu yenilə',
          'PUT /api/orders/:id/tracking': 'Tracking məlumatı əlavə et/yenilə',
          'PUT /api/orders/:id/tracking/status': 'Tracking status yenilə'
        },
        admin: {
          'GET /api/orders/admin/all': 'Bütün sifarişlər (admin)',
          'All customer/vendor routes': 'Admin bütün əməliyyatları görə bilər'
        },
        tracking: {
          publicTracking: {
            'GET /api/orders/track/:trackingNumber': 'Hər kəs tracking nömrəsi ilə yoxlaya bilər',
            example: '/api/orders/track/TR123456789AZ',
            note: 'Authentication tələb olunmur'
          },
          vendorTracking: {
            'PUT /api/orders/:orderId/tracking': 'Tracking məlumatı əlavə et',
            'PUT /api/orders/:orderId/tracking/status': 'Tracking status yenilə',
            note: 'Vendor və ya admin icazəsi lazımdır'
          },
          customerTracking: {
            'GET /api/orders/:orderId/tracking': 'Öz sifarişinin tracking məlumatı',
            note: 'Sifariş sahibi və ya admin görmə icazəsi'
          }
        },
        trackingStatuses: {
          shipped: 'Göndərildi',
          in_transit: 'Yoldadır',
          out_for_delivery: 'Çatdırılma üçün yolda',
          delivered: 'Çatdırıldı',
          failed_delivery: 'Çatdırılma uğursuz',
          returned: 'Geri qaytarıldı'
        },
        carriers: {
          azerpost: 'Azərpoçt',
          bravo: 'Bravo Express',
          express: 'Express Post',
          pickup: 'Özü götürmə',
          other: 'Digər'
        },
        validation: {
          trackingCreation: {
            required: ['trackingNumber', 'carrier'],
            optional: ['carrierName', 'estimatedDelivery', 'trackingUrl', 'deliveryInstructions', 'vendorOrderId'],
            example: {
              trackingNumber: 'TR123456789AZ',
              carrier: 'azerpost',
              carrierName: 'Azərpoçt Express',
              estimatedDelivery: '2024-12-25T15:00:00.000Z',
              trackingUrl: 'https://azerpost.az/track/TR123456789AZ',
              deliveryInstructions: 'Qapının yanında buraxın'
            }
          },
          trackingStatusUpdate: {
            required: ['status'],
            optional: ['location', 'description', 'vendorOrderId', 'estimatedDelivery', 'deliveryAttempt'],
            example: {
              status: 'in_transit',
              location: {
                city: 'Gəncə',
                address: 'Gəncə Poçt Müdiriyyəti'
              },
              description: 'Məhsul Gəncə şəhərinə çatdı',
              deliveryAttempt: {
                status: 'failed',
                reason: 'Müştəri evdə yox idi',
                nextAttempt: '2024-12-21T10:00:00.000Z',
                notes: 'Səhər saatları üçün təyin edildi'
              }
            }
          }
        },
        examples: {
          trackingFlow: [
            '1. Vendor məhsulu göndərir və tracking yaradır',
            '2. Kargo şirkəti status yeniliklərini göndərir',
            '3. Müştəri tracking nömrəsi ilə izləyir',
            '4. Çatdırılma zamanı delivered status əlavə edilir'
          ],
          apiCalls: {
            createTracking: 'PUT /api/orders/673abc123def456/tracking',
            updateStatus: 'PUT /api/orders/673abc123def456/tracking/status',
            publicTrack: 'GET /api/orders/track/TR123456789AZ',
            customerTrack: 'GET /api/orders/673abc123def456/tracking'
          }
        }
      }
    });
  });
}

module.exports = router;