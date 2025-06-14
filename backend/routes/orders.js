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
  getOrderStats
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
    .withMessage('Düzgün URL formatı daxil edin')
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

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bütün order route-ları authentication tələb edir
router.use(protect);

// @route   GET /api/orders/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Private
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Orders API Routes',
      routes: {
        customer: {
          'POST /api/orders': 'Səbətdən sifariş yarat',
          'GET /api/orders': 'Öz sifarişlərini al',
          'GET /api/orders/stats': 'Öz sifariş statistikası',
          'GET /api/orders/:id': 'Sifariş detayı',
          'PUT /api/orders/:id/cancel': 'Sifarişi ləğv et',
          'GET /api/orders/info/routes': 'Route siyahısı (dev only)'
        },
        vendor: {
          'GET /api/orders/vendor/my-orders': 'Vendor sifarişləri',
          'PUT /api/orders/:id/vendor-status': 'Vendor sifariş statusunu yenilə',
          'PUT /api/orders/:id/tracking': 'Tracking məlumatı əlavə et'
        },
        admin: {
          'GET /api/orders/admin/all': 'Bütün sifarişlər (admin)',
          'All customer/vendor routes': 'Admin bütün əməliyyatları görə bilər'
        },
        authentication: {
          header: 'Authorization: Bearer TOKEN_HERE',
          note: 'Bütün route-lar authentication tələb edir'
        },
        orderStatuses: {
          pending: 'Gözləyir',
          confirmed: 'Təsdiqləndi',
          processing: 'İşlənir',
          shipped: 'Göndərildi',
          delivered: 'Çatdırıldı',
          cancelled: 'Ləğv edildi',
          refunded: 'Geri qaytarıldı',
          completed: 'Tamamlandı'
        },
        paymentMethods: {
          credit_card: 'Kredit kartı',
          debit_card: 'Debit kartı',
          paypal: 'PayPal',
          bank_transfer: 'Bank köçürməsi',
          cash_on_delivery: 'Qapıda ödəniş',
          crypto: 'Kripto valyuta'
        },
        validation: {
          createOrder: {
            required: [
              'shippingAddress.firstName',
              'shippingAddress.lastName', 
              'shippingAddress.phone',
              'shippingAddress.street',
              'shippingAddress.city',
              'paymentMethod'
            ],
            optional: [
              'billingAddress',
              'customerNotes',
              'specialInstructions',
              'requestedDeliveryDate'
            ]
          },
          cancelOrder: {
            required: ['reason'],
            note: 'Yalnız pending və confirmed statusunda olan sifarişlər ləğv edilə bilər'
          },
          vendorStatus: {
            required: ['status'],
            optional: ['vendorNotes', 'trackingInfo'],
            allowedStatuses: ['confirmed', 'processing', 'shipped', 'delivered']
          },
          tracking: {
            required: ['trackingNumber', 'carrier'],
            optional: ['estimatedDelivery', 'trackingUrl']
          }
        },
        examples: {
          createOrder: {
            shippingAddress: {
              firstName: 'Əli',
              lastName: 'Məmmədov',
              phone: '+994501234567',
              email: 'ali@example.com',
              street: 'Nizami küçəsi 123',
              city: 'Bakı',
              country: 'Azerbaijan',
              deliveryInstructions: 'Qapının yanında buraxın'
            },
            billingAddress: {
              type: 'personal',
              firstName: 'Əli',
              lastName: 'Məmmədov',
              phone: '+994501234567',
              email: 'ali@example.com',
              street: 'Nizami küçəsi 123',
              city: 'Bakı',
              country: 'Azerbaijan'
            },
            paymentMethod: 'credit_card',
            customerNotes: 'Xüsusi qeyd',
            specialInstructions: {
              giftWrap: true,
              giftMessage: 'Ad günün mübarək!',
              priority: 'normal'
            },
            requestedDeliveryDate: '2024-12-25T10:00:00.000Z'
          },
          cancelOrder: {
            reason: 'Artıq ehtiyacım yoxdur'
          },
          vendorStatus: {
            status: 'shipped',
            vendorNotes: 'DHL ilə göndərildi',
            trackingInfo: {
              trackingNumber: 'DHL123456789',
              carrier: 'DHL',
              estimatedDelivery: '2024-12-20T15:00:00.000Z'
            }
          },
          tracking: {
            trackingNumber: 'DHL123456789',
            carrier: 'DHL Express',
            estimatedDelivery: '2024-12-20T15:00:00.000Z',
            trackingUrl: 'https://dhl.com/track/DHL123456789'
          }
        },
        queryParameters: {
          orders: {
            page: 'Səhifə nömrəsi (default: 1)',
            limit: 'Səhifə başına sifariş sayı (default: 10, max: 100)',
            status: 'Sifariş statusu',
            startDate: 'Başlanğıc tarixi (ISO format)',
            endDate: 'Bitmə tarixi (ISO format)'
          },
          adminOrders: {
            customer: 'Müştəri ID-si',
            vendor: 'Vendor ID-si',
            'all order filters': 'Yuxarıdakı filtrlər də istifadə edilə bilər'
          }
        },
        orderFlow: {
          customer: [
            '1. Səbətə məhsul əlavə et',
            '2. Səbəti yoxla',
            '3. Sifariş yarat (POST /api/orders)',
            '4. Ödəniş et',
            '5. Sifariş statusunu izlə',
            '6. Lazım gələrsə ləğv et'
          ],
          vendor: [
            '1. Yeni sifarişləri yoxla',
            '2. Sifarişi təsdiqlə',
            '3. Məhsulu hazırla',
            '4. Göndər və tracking əlavə et',
            '5. Çatdırıldığını təsdiqlə'
          ]
        },
        businessRules: {
          orderCreation: [
            'Səbət boş olmamalıdır',
            'Bütün məhsullar aktiv olmalıdır',
            'Stok yetərli olmalıdır',
            'Çatdırılma ünvanı tam olmalıdır'
          ],
          cancellation: [
            'Yalnız pending/confirmed statusunda ləğv edilə bilər',
            'Ləğv səbəbi minimum 5 simvol olmalıdır',
            'Stoklar geri qaytarılır',
            'Ödəniş geri qaytarıla bilər'
          ],
          vendorOperations: [
            'Vendor yalnız öz sifarişlərini görə bilər',
            'Status geriyə dəyişdirilə bilməz',
            'Tracking shipping zamanı əlavə edilir',
            'Delivered status son statusdur'
          ]
        },
        responseStructure: {
          order: {
            id: 'Sifariş ID-si',
            orderNumber: 'Unikal sifariş nömrəsi (ORD-202412-123456)',
            status: 'Sifariş statusu',
            customer: 'Müştəri məlumatları',
            vendorOrders: [
              {
                vendor: 'Vendor məlumatları',
                vendorOrderNumber: 'Vendor sifariş nömrəsi',
                items: 'Məhsul siyahısı',
                status: 'Vendor sifariş statusu',
                tracking: 'Tracking məlumatları',
                pricing: 'Qiymət hesablamaları'
              }
            ],
            pricing: 'Ümumi qiymət hesablamaları',
            shippingAddress: 'Çatdırılma ünvanı',
            payment: 'Ödəniş məlumatları',
            orderHistory: 'Status dəyişiklik tarixçəsi',
            placedAt: 'Sifariş tarixi'
          }
        }
      }
    });
  });
}

module.exports = router;
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
// @desc    Tracking məlumatı əlavə et
// @access  Private (Vendor)
router.put('/:id/tracking', 
  authorize('vendor', 'admin'), 
  [orderIdValidation, ...trackingValidation], 
  addTracking
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

// @route