const express = require('express');
const { body, query } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  getSearchSuggestions,
  updateStock
} = require('../controllers/productController');
const { protect, authorize, vendorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Məhsul adı 2-200 simvol arası olmalıdır'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Təsvir 10-2000 simvol arası olmalıdır'),
  
  body('category')
    .isIn(['electronics', 'clothing', 'home-garden', 'books', 'gaming', 'beauty', 'sports', 'automotive', 'food', 'toys'])
    .withMessage('Düzgün kateqoriya seçin'),
  
  body('pricing.costPrice')
    .isFloat({ min: 0 })
    .withMessage('Maya dəyəri 0-dan böyük olmalıdır'),
  
  body('pricing.sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Satış qiyməti 0-dan böyük olmalıdır'),
  
  body('pricing.discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Endirim qiyməti 0-dan böyük olmalıdır'),
  
  body('inventory.stock')
    .isInt({ min: 0 })
    .withMessage('Stok miqdarı 0-dan böyük olmalıdır'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU 3-50 simvol arası olmalıdır'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Marka adı 100 simvoldan çox ola bilməz'),
  
  body('images')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Ən azı bir şəkil əlavə edilməlidir'),
  
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Düzgün şəkil URL-i daxil edin'),
  
  body('status')
    .optional()
    .isIn(['draft', 'active', 'inactive'])
    .withMessage('Status draft, active və ya inactive ola bilər'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'hidden'])
    .withMessage('Visibility public, private və ya hidden ola bilər')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Məhsul adı 2-200 simvol arası olmalıdır'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Təsvir 10-2000 simvol arası olmalıdır'),
  
  body('category')
    .optional()
    .isIn(['electronics', 'clothing', 'home-garden', 'books', 'gaming', 'beauty', 'sports', 'automotive', 'food', 'toys'])
    .withMessage('Düzgün kateqoriya seçin'),
  
  body('pricing.costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maya dəyəri 0-dan böyük olmalıdır'),
  
  body('pricing.sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Satış qiyməti 0-dan böyük olmalıdır'),
  
  body('pricing.discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Endirim qiyməti 0-dan böyük olmalıdır'),
  
  body('inventory.stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stok miqdarı 0-dan böyük olmalıdır')
];

const stockUpdateValidation = [
  body('action')
    .isIn(['increase', 'decrease', 'set'])
    .withMessage('Action increase, decrease və ya set ola bilər'),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity müsbət tam rəqəm olmalıdır')
];

const searchValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Səhifə nömrəsi müsbət tam rəqəm olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arası olmalıdır'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum qiymət 0-dan böyük olmalıdır'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maksimum qiymət 0-dan böyük olmalıdır'),
  
  query('sortBy')
    .optional()
    .isIn(['price_low', 'price_high', 'rating', 'popular', 'newest', 'oldest', 'name_az', 'name_za', 'relevance'])
    .withMessage('Düzgün sıralama seçin')
];

// ===========================================
// PUBLIC ROUTES - Authentication tələb olunmur
// ===========================================

// @route   GET /api/products
// @desc    Bütün məhsulları al (filterlə)
// @access  Public
router.get('/', searchValidation, getProducts);

// @route   GET /api/products/search/suggestions
// @desc    Axtarış təklifləri
// @access  Public
router.get('/search/suggestions', getSearchSuggestions);

// @route   GET /api/products/:id
// @desc    Məhsul detayları
// @access  Public
router.get('/:id', getProduct);

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bundan sonrakı bütün route-lar authentication tələb edir
router.use(protect);

// @route   GET /api/products/vendor/my-products
// @desc    Vendor məhsulları
// @access  Private (Vendor/Admin)
router.get('/vendor/my-products', authorize('vendor', 'admin'), getVendorProducts);

// @route   POST /api/products
// @desc    Yeni məhsul yarat
// @access  Private (Vendor/Admin)
router.post('/', vendorOrAdmin, createProductValidation, createProduct);

// @route   PUT /api/products/:id
// @desc    Məhsul yenilə
// @access  Private (Vendor/Admin)
router.put('/:id', vendorOrAdmin, updateProductValidation, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Məhsul sil
// @access  Private (Vendor/Admin)
router.delete('/:id', vendorOrAdmin, deleteProduct);

// @route   PATCH /api/products/:id/stock
// @desc    Məhsul stokunu yenilə
// @access  Private (Vendor/Admin)
router.patch('/:id/stock', vendorOrAdmin, stockUpdateValidation, updateStock);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/products/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Public
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Products API Routes',
      routes: {
        public: {
          'GET /api/products': 'Bütün məhsulları al (filterlə)',
          'GET /api/products/search/suggestions': 'Axtarış təklifləri',
          'GET /api/products/:id': 'Məhsul detayları',
          'GET /api/products/info/routes': 'Route siyahısı (dev only)'
        },
        protected: {
          'GET /api/products/vendor/my-products': 'Vendor məhsulları',
          'POST /api/products': 'Yeni məhsul yarat',
          'PUT /api/products/:id': 'Məhsul yenilə',
          'DELETE /api/products/:id': 'Məhsul sil',
          'PATCH /api/products/:id/stock': 'Stok yenilə'
        },
        filters: {
          category: 'electronics, clothing, home-garden, books, gaming, beauty, sports, automotive, food, toys',
          vendor: 'vendor ID',
          brand: 'brand name',
          minPrice: 'minimum price',
          maxPrice: 'maximum price',
          search: 'search term',
          featured: 'true/false',
          newArrivals: 'true/false',
          inStock: 'true/false'
        },
        sorting: {
          price_low: 'Qiymət (aşağıdan yuxarıya)',
          price_high: 'Qiymət (yuxarıdan aşağıya)',
          rating: 'Reytinq (yüksək)',
          popular: 'Məşhurluq',
          newest: 'Ən yeni',
          oldest: 'Ən köhnə',
          name_az: 'Ad (A-Z)',
          name_za: 'Ad (Z-A)',
          relevance: 'Uyğunluq'
        },
        pagination: {
          page: 'Səhifə nömrəsi (default: 1)',
          limit: 'Səhifə başına məhsul sayı (default: 20, max: 100)'
        },
        authentication: {
          header: 'Authorization: Bearer TOKEN_HERE',
          roles: 'vendor, admin'
        },
        validation: {
          createProduct: {
            required: ['name', 'description', 'category', 'pricing.costPrice', 'pricing.sellingPrice', 'inventory.stock'],
            optional: ['sku', 'brand', 'images', 'status', 'visibility', 'shortDescription', 'subcategory', 'model', 'barcode', 'shipping', 'attributes', 'variants', 'seo', 'featured', 'digitalProduct', 'tags', 'policies']
          },
          updateProduct: {
            optional: ['name', 'description', 'category', 'pricing', 'inventory', 'status', 'visibility', '...']
          },
          stockUpdate: {
            required: ['action', 'quantity'],
            actions: ['increase', 'decrease', 'set']
          }
        },
        examples: {
          createProduct: {
            name: 'iPhone 15 Pro Max',
            description: 'Ən yeni iPhone modeli...',
            category: 'electronics',
            brand: 'Apple',
            pricing: {
              costPrice: 2000,
              sellingPrice: 2500,
              discountPrice: 2300,
              currency: 'AZN'
            },
            inventory: {
              stock: 50,
              lowStockThreshold: 10
            },
            images: [
              {
                url: 'https://example.com/image1.jpg',
                alt: 'iPhone 15 Pro Max front',
                isMain: true
              }
            ],
            status: 'active',
            visibility: 'public'
          },
          filterProducts: '/api/products?category=electronics&minPrice=100&maxPrice=3000&sortBy=price_low&page=1&limit=20',
          searchProducts: '/api/products?search=iphone&category=electronics&featured=true'
        }
      }
    });
  });
}

module.exports = router;