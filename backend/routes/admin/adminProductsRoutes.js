// routes/admin/adminProductsRoutes.js - Düzəldilmiş versiya
const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock, // DÜZƏLTMƏ: Stock update method əlavə edildi
  toggleFeatured,
  bulkOperations,
  getProductStats
} = require('../../controllers/admin/adminProductsController');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Bütün route-lar admin yetkisi tələb edir
router.use(protect);
router.use(authorize('admin'));

// Validation rules for product
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Məhsul adı 2-200 simvol arası olmalıdır'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Təsvir 10-2000 simvol arası olmalıdır'),

  body('pricing.sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Satış qiyməti 0-dan böyük olmalıdır'),

  body('price') // DÜZƏLTMƏ: Alternativ price field-i də dəstəklə
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Qiymət 0-dan böyük olmalıdır'),

  body('pricing.costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maya dəyəri 0-dan böyük olmalıdır'),

  body('sku')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU 1-50 simvol arası olmalıdır'),

  body('inventory.stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stok sayı 0 və ya böyük olmalıdır'),

  body('stock') // DÜZƏLTMƏ: Alternativ stock field-i də dəstəklə
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stok sayı 0 və ya böyük olmalıdır'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Düzgün kategoriya ID-si daxil edin'),

  body('vendor')
    .optional()
    .isMongoId()
    .withMessage('Düzgün satıcı ID-si daxil edin'),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'pending', 'rejected', 'out_of_stock', 'discontinued'])
    .withMessage('Keçərsiz status'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Marka adı 100 simvoldan çox ola bilməz'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured boolean olmalıdır')
];

// ===========================================
// STATISTICS AND DASHBOARD
// ===========================================

// @route   GET /api/admin/products/stats
// @desc    Məhsul statistikaları və dashboard məlumatları
// @access  Private/Admin
router.get('/stats', getProductStats);

// ===========================================
// BULK OPERATIONS
// ===========================================

// @route   POST /api/admin/products/bulk
// @desc    Bulk əməliyyatlar (delete, updateStatus, toggleFeatured)
// @access  Private/Admin
router.post('/bulk', [
  body('action')
    .isIn(['delete', 'updateStatus', 'toggleFeatured'])
    .withMessage('Keçərsiz bulk əməliyyat'),
  
  body('productIds')
    .isArray({ min: 1 })
    .withMessage('Ən azı 1 məhsul ID-si tələb olunur'),
    
  body('productIds.*')
    .isMongoId()
    .withMessage('Düzgün məhsul ID-si tələb olunur'),

  body('data.status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'pending', 'rejected', 'out_of_stock', 'discontinued'])
    .withMessage('Keçərsiz status')
], bulkOperations);

// ===========================================
// PRODUCT CRUD OPERATIONS
// ===========================================

// @route   GET /api/admin/products
// @desc    Bütün məhsulları gətir (filtered, paginated)
// @access  Private/Admin
router.get('/', getProducts);

// @route   POST /api/admin/products
// @desc    Yeni məhsul yarat
// @access  Private/Admin
router.post('/', productValidation, createProduct);

// @route   GET /api/admin/products/:id
// @desc    Məhsul məlumatını gətir
// @access  Private/Admin
router.get('/:id', getProduct);

// @route   PUT /api/admin/products/:id
// @desc    Məhsul yenilə
// @access  Private/Admin
router.put('/:id', productValidation, updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Məhsul sil
// @access  Private/Admin
router.delete('/:id', deleteProduct);

// ===========================================
// PRODUCT STATUS OPERATIONS
// ===========================================

// @route   PATCH /api/admin/products/:id/status
// @desc    Məhsul statusunu dəyiş
// @access  Private/Admin
router.patch('/:id/status', [
  body('status')
    .isIn(['draft', 'active', 'inactive', 'pending', 'rejected', 'out_of_stock', 'discontinued'])
    .withMessage('Keçərsiz status')
], updateProductStatus);

// @route   PATCH /api/admin/products/:id/stock
// @desc    Məhsul stokunu yenilə
// @access  Private/Admin
router.patch('/:id/stock', [
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stok sayı 0 və ya böyük rəqəm olmalıdır')
], updateProductStock);

// @route   PATCH /api/admin/products/:id/featured
// @desc    Featured statusunu toggle et
// @access  Private/Admin
router.patch('/:id/featured', toggleFeatured);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Admin Products API Routes',
      routes: {
        statistics: {
          'GET /api/admin/products/stats': 'Məhsul statistikaları və dashboard'
        },
        bulk: {
          'POST /api/admin/products/bulk': 'Bulk əməliyyatlar (delete, updateStatus, toggleFeatured)'
        },
        crud: {
          'GET /api/admin/products': 'Bütün məhsullar (filtered, paginated)',
          'POST /api/admin/products': 'Yeni məhsul yarat',
          'GET /api/admin/products/:id': 'Məhsul məlumatı',
          'PUT /api/admin/products/:id': 'Məhsul yenilə',
          'DELETE /api/admin/products/:id': 'Məhsul sil'
        },
        status: {
          'PATCH /api/admin/products/:id/status': 'Status dəyiş',
          'PATCH /api/admin/products/:id/stock': 'Stok yenilə',
          'PATCH /api/admin/products/:id/featured': 'Featured toggle'
        }
      },
      authentication: {
        required: true,
        role: 'admin',
        header: 'Authorization: Bearer TOKEN_HERE'
      },
      queryParameters: {
        getProducts: {
          page: 'Səhifə nömrəsi (default: 1)',
          limit: 'Səhifə başına limit (default: 20)',
          search: 'Axtarış sorğusu (name, description, sku, brand)',
          category: 'Kategoriya ID-si',
          vendor: 'Vendor ID-si',
          status: 'Məhsul statusu (draft, active, inactive, pending, rejected, out_of_stock, discontinued)',
          featured: 'Featured status (true/false)',
          priceMin: 'Minimum qiymət',
          priceMax: 'Maximum qiymət',
          sortBy: 'Sıralama sahəsi (default: createdAt)',
          sortOrder: 'Sıralama istiqaməti (asc/desc, default: desc)'
        }
      },
      bulkOperations: {
        delete: {
          description: 'Seçilmiş məhsulları sil',
          requiredFields: ['action: "delete"', 'productIds: Array']
        },
        updateStatus: {
          description: 'Seçilmiş məhsulların statusunu dəyiş',
          requiredFields: ['action: "updateStatus"', 'productIds: Array', 'data.status: String']
        },
        toggleFeatured: {
          description: 'Seçilmiş məhsulların featured statusunu toggle et',
          requiredFields: ['action: "toggleFeatured"', 'productIds: Array']
        }
      },
      validation: {
        createProduct: {
          required: [
            'name', 'description', 'sku'
          ],
          optional: [
            'pricing.sellingPrice', 'pricing.costPrice', 'price',
            'inventory.stock', 'stock', 'category', 'vendor', 
            'brand', 'model', 'images', 'attributes', 'variants', 
            'status', 'featured', 'tags'
          ]
        },
        updateStock: {
          required: ['stock: Number (>= 0)']
        },
        updateStatus: {
          required: ['status: String (draft|active|inactive|pending|rejected|out_of_stock|discontinued)']
        }
      },
      examples: {
        createProduct: {
          name: 'iPhone 14 Pro',
          description: 'Apple iPhone 14 Pro 128GB Deep Purple',
          pricing: {
            costPrice: 800,
            sellingPrice: 1200,
            discountPrice: 1100,
            currency: 'AZN'
          },
          inventory: {
            stock: 50,
            lowStockThreshold: 5,
            trackQuantity: true
          },
          sku: 'IPH14PRO128DP',
          brand: 'Apple',
          category: '64f8b5c8e1234567890abcde',
          status: 'active',
          featured: true,
          images: [
            {
              url: 'https://example.com/iphone14pro.jpg',
              alt: 'iPhone 14 Pro Deep Purple',
              isMain: true
            }
          ]
        },
        updateStock: {
          stock: 25
        },
        updateStatus: {
          status: 'active'
        },
        bulkDelete: {
          action: 'delete',
          productIds: ['64f8b5c8e1234567890abcde', '64f8b5c8e1234567890abcdf']
        },
        bulkUpdateStatus: {
          action: 'updateStatus',
          productIds: ['64f8b5c8e1234567890abcde', '64f8b5c8e1234567890abcdf'],
          data: {
            status: 'active'
          }
        }
      }
    });
  });
}

module.exports = router;