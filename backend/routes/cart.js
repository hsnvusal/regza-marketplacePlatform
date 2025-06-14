const express = require('express');
const { body, param } = require('express-validator');
const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  getCartStats
} = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const addToCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Düzgün məhsul ID daxil edin'),
  
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Miqdar 1-100 arası olmalıdır'),
  
  body('variants')
    .optional()
    .isArray()
    .withMessage('Variantlar array formatında olmalıdır'),
  
  body('variants.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Variant adı 1-50 simvol arası olmalıdır'),
  
  body('variants.*.value')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant dəyəri 1-100 simvol arası olmalıdır'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Qeyd 500 simvoldan çox ola bilməz')
];

const updateCartValidation = [
  param('itemId')
    .isMongoId()
    .withMessage('Düzgün item ID daxil edin'),
  
  body('quantity')
    .isInt({ min: 0, max: 100 })
    .withMessage('Miqdar 0-100 arası olmalıdır')
];

const couponValidation = [
  body('couponCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Kupon kodu 3-20 simvol arası olmalıdır')
    .isAlphanumeric()
    .withMessage('Kupon kodu yalnız hərf və rəqəmlərdən ibarət ola bilər')
];

const itemIdValidation = [
  param('itemId')
    .isMongoId()
    .withMessage('Düzgün item ID daxil edin')
];

const couponCodeValidation = [
  param('couponCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Kupon kodu 3-20 simvol arası olmalıdır')
    .isAlphanumeric()
    .withMessage('Kupon kodu yalnız hərf və rəqəmlərdən ibarət ola bilər')
];

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bütün cart route-ları authentication tələb edir
router.use(protect);

// @route   GET /api/cart
// @desc    İstifadəçi səbətini al
// @access  Private
router.get('/', getCart);

// @route   GET /api/cart/summary
// @desc    Səbət məlumatları (yalnız summary)
// @access  Private
router.get('/summary', getCartSummary);

// @route   POST /api/cart/add
// @desc    Səbətə məhsul əlavə et
// @access  Private
router.post('/add', addToCartValidation, addToCart);

// @route   PUT /api/cart/update/:itemId
// @desc    Səbətdə məhsul miqdarını yenilə
// @access  Private
router.put('/update/:itemId', updateCartValidation, updateCartItem);

// @route   DELETE /api/cart/remove/:itemId
// @desc    Səbətdən məhsul sil
// @access  Private
router.delete('/remove/:itemId', itemIdValidation, removeFromCart);

// @route   DELETE /api/cart/clear
// @desc    Səbəti təmizlə
// @access  Private
router.delete('/clear', clearCart);

// @route   POST /api/cart/apply-coupon
// @desc    Kupon tətbiq et
// @access  Private
router.post('/apply-coupon', couponValidation, applyCoupon);

// @route   DELETE /api/cart/remove-coupon/:couponCode
// @desc    Kupon sil
// @access  Private
router.delete('/remove-coupon/:couponCode', couponCodeValidation, removeCoupon);

// ===========================================
// ADMIN ROUTES
// ===========================================

// @route   GET /api/cart/stats
// @desc    Səbət statistikası (admin üçün)
// @access  Private (Admin)
router.get('/stats', authorize('admin'), getCartStats);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/cart/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Private
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Cart API Routes',
      routes: {
        general: {
          'GET /api/cart': 'Səbəti al (tam məlumat)',
          'GET /api/cart/summary': 'Səbət məlumatları (summary)',
          'GET /api/cart/info/routes': 'Route siyahısı (dev only)'
        },
        cartManagement: {
          'POST /api/cart/add': 'Səbətə məhsul əlavə et',
          'PUT /api/cart/update/:itemId': 'Məhsul miqdarını yenilə',
          'DELETE /api/cart/remove/:itemId': 'Məhsulu səbətdən sil',
          'DELETE /api/cart/clear': 'Səbəti tamamilə təmizlə'
        },
        coupons: {
          'POST /api/cart/apply-coupon': 'Kupon tətbiq et',
          'DELETE /api/cart/remove-coupon/:couponCode': 'Kupon sil'
        },
        admin: {
          'GET /api/cart/stats': 'Səbət statistikası (admin)'
        },
        authentication: {
          header: 'Authorization: Bearer TOKEN_HERE',
          note: 'Bütün route-lar authentication tələb edir'
        },
        validation: {
          addToCart: {
            required: ['productId'],
            optional: ['quantity', 'variants', 'notes'],
            example: {
              productId: '507f1f77bcf86cd799439011',
              quantity: 2,
              variants: [
                { name: 'Rəng', value: 'Qara' },
                { name: 'Ölçü', value: 'L' }
              ],
              notes: 'Xüsusi qeyd'
            }
          },
          updateCart: {
            required: ['quantity'],
            note: 'quantity = 0 olarsa məhsul silinir'
          },
          applyCoupon: {
            required: ['couponCode'],
            availableCoupons: ['WELCOME10', 'SAVE20', 'FREESHIP']
          }
        },
        examples: {
          addToCart: '/api/cart/add',
          updateQuantity: '/api/cart/update/507f1f77bcf86cd799439011',
          removeItem: '/api/cart/remove/507f1f77bcf86cd799439011',
          applyCoupon: '/api/cart/apply-coupon',
          removeCoupon: '/api/cart/remove-coupon/WELCOME10'
        },
        cartSummaryStructure: {
          totalItems: 'Məhsul sayı',
          totalQuantity: 'Ümumi miqdar',
          subtotal: 'Alt məbləğ',
          tax: 'Vergi (18%)',
          shipping: 'Çatdırılma (100 AZN+ pulsuz)',
          discount: 'Endirim',
          total: 'Ümumi məbləğ',
          currency: 'Valyuta (AZN)'
        }
      }
    });
  });
}

module.exports = router;