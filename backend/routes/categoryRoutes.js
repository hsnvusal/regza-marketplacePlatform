// routes/categoryRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  getCategories,
  getCategoryTree,
  getFeaturedCategories,
  getCategory,
  getCategoryProducts,
  searchCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Kategoriya adı 2-100 simvol arası olmalıdır')
    .matches(/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ0-9\s\-&]+$/)
    .withMessage('Kategoriya adı yalnız hərflər, rəqəmlər və - & simvollarından ibarət ola bilər'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Təsvir 500 simvoldan çox ola bilməz'),

  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug 2-100 simvol arası olmalıdır')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug yalnız kiçik hərflər, rəqəmlər və - simvolundan ibarət ola bilər'),

  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Valide olmayan parent ID'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Düzgün şəkil URL-i daxil edin'),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('İkon class 50 simvoldan çox ola bilməz'),

  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Düzgün hex rəng kodu daxil edin (#RRGGBB)'),

  body('metaTitle')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta title 160 simvoldan çox ola bilməz'),

  body('metaDescription')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Meta description 300 simvoldan çox ola bilməz'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sıralama rəqəmi 0 və ya böyük olmalıdır'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive boolean olmalıdır'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured boolean olmalıdır'),

  body('showInMenu')
    .optional()
    .isBoolean()
    .withMessage('showInMenu boolean olmalıdır')
];

// ===========================================
// PUBLIC ROUTES - Authentication tələb olunmur
// ===========================================

// @route   GET /api/categories
// @desc    Bütün kategoriyaları gətir (filtered)
// @access  Public
router.get('/', getCategories);

// @route   GET /api/categories/tree
// @desc    Kategoriya ağacını gətir (hierarchical)
// @access  Public
router.get('/tree', getCategoryTree);

// @route   GET /api/categories/featured
// @desc    Seçilmiş kategoriyaları gətir
// @access  Public
router.get('/featured', getFeaturedCategories);

// @route   GET /api/categories/search
// @desc    Kategoriya axtarışı
// @access  Public
router.get('/search', searchCategories);

// @route   GET /api/categories/:slug
// @desc    Kategoriya məlumatını gətir
// @access  Public
router.get('/:slug', getCategory);

// @route   GET /api/categories/:slug/products
// @desc    Kategoriyaya aid məhsulları gətir
// @access  Public
router.get('/:slug/products', getCategoryProducts);

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bundan sonrakı bütün route-lar authentication tələb edir
router.use(protect);

// ===========================================
// ADMIN ROUTES - Admin authorization tələb olunur
// ===========================================

// Bundan sonrakı route-lar admin yetkisi tələb edir
router.use(authorize('admin'));

// @route   POST /api/categories
// @desc    Yeni kategoriya yarat
// @access  Private/Admin
router.post('/', categoryValidation, createCategory);

// @route   PUT /api/categories/:id
// @desc    Kategoriya yenilə
// @access  Private/Admin
router.put('/:id', categoryValidation, updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Kategoriya sil
// @access  Private/Admin
router.delete('/:id', deleteCategory);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/categories/admin/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Private/Admin
if (process.env.NODE_ENV === 'development') {
  router.get('/admin/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Category API Routes',
      routes: {
        public: {
          'GET /api/categories': 'Bütün kategoriyalar (filtered)',
          'GET /api/categories/tree': 'Kategoriya ağacı (hierarchical)',
          'GET /api/categories/featured': 'Seçilmiş kategoriyalar',
          'GET /api/categories/search?q=query': 'Kategoriya axtarışı',
          'GET /api/categories/:slug': 'Kategoriya məlumatı',
          'GET /api/categories/:slug/products': 'Kategoriya məhsulları'
        },
        admin: {
          'POST /api/categories': 'Yeni kategoriya yarat',
          'PUT /api/categories/:id': 'Kategoriya yenilə',
          'DELETE /api/categories/:id': 'Kategoriya sil',
          'GET /api/categories/admin/routes': 'Route siyahısı (dev only)'
        },
        authentication: {
          header: 'Authorization: Bearer TOKEN_HERE',
          adminRole: 'User role must be "admin"'
        },
        queryParameters: {
          categories: {
            page: 'Səhifə nömrəsi (default: 1)',
            limit: 'Səhifə başına limit (default: 20)',
            parent: 'Parent ID (null üçün "null")',
            featured: 'Seçilmiş kategoriyalar (true/false)',
            search: 'Axtarış sorğusu',
            sortBy: 'Sıralama sahəsi (default: sortOrder)',
            sortOrder: 'Sıralama istiqaməti (1 ascending, -1 descending)'
          },
          products: {
            page: 'Səhifə nömrəsi (default: 1)',
            limit: 'Səhifə başına limit (default: 20)',
            sortBy: 'Sıralama sahəsi (default: createdAt)',
            sortOrder: 'Sıralama istiqaməti (1 ascending, -1 descending)',
            minPrice: 'Minimum qiymət',
            maxPrice: 'Maksimum qiymət',
            brand: 'Marka filtri',
            inStock: 'Stokda olan məhsullar (true/false)'
          }
        },
        validation: {
          create: {
            required: ['name'],
            optional: [
              'description', 'slug', 'parent', 'image', 'icon', 'color',
              'metaTitle', 'metaDescription', 'sortOrder', 'isActive',
              'isFeatured', 'showInMenu'
            ]
          },
          update: {
            optional: [
              'name', 'description', 'slug', 'parent', 'image', 'icon', 'color',
              'metaTitle', 'metaDescription', 'sortOrder', 'isActive',
              'isFeatured', 'showInMenu'
            ]
          }
        },
        examples: {
          createCategory: {
            name: 'Elektronika',
            description: 'Elektron cihazlar və aksesuarlar',
            parent: null,
            image: 'https://example.com/electronics.jpg',
            icon: 'fas fa-laptop',
            color: '#007bff',
            metaTitle: 'Elektronika məhsulları',
            metaDescription: 'Telefon, laptop və digər elektron cihazlar',
            sortOrder: 1,
            isActive: true,
            isFeatured: true,
            showInMenu: true
          }
        }
      }
    });
  });
}

module.exports = router;