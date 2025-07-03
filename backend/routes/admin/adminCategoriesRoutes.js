// routes/admin/adminCategoriesRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  reorderCategories,
  getCategoryStats
} = require('../../controllers/admin/adminCategoriesController');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Bütün route-lar admin yetkisi tələb edir
router.use(protect);
router.use(authorize('admin'));

// Validation rules for category
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Kategoriya adı 2-100 simvol arası olmalıdır'),

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
    .withMessage('Slug yalnız kiçik hərflər, rəqəmlər və tire istifadə edə bilər'),

  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Düzgün parent ID-si daxil edin'),

  body('image')
    .optional()
    .isURL()
    .withMessage('Düzgün şəkil URL-si daxil edin'),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('İkon class 50 simvoldan çox ola bilməz'),

  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Düzgün hex rəng kodu daxil edin'),

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
    .withMessage('Sort order 0 və ya böyük rəqəm olmalıdır'),

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
// STATISTICS AND DASHBOARD
// ===========================================

// @route   GET /api/admin/categories/stats
// @desc    Kategoriya statistikaları və dashboard məlumatları
// @access  Private/Admin
router.get('/stats', getCategoryStats);

// ===========================================
// SPECIAL ENDPOINTS
// ===========================================

// @route   GET /api/admin/categories/tree
// @desc    Kategoriya ağacı (hierarchical structure)
// @access  Private/Admin
router.get('/tree', getCategoryTree);

// @route   PATCH /api/admin/categories/reorder
// @desc    Kategoriya sıralamasını yenilə
// @access  Private/Admin
router.patch('/reorder', [
  body('categories')
    .isArray({ min: 1 })
    .withMessage('Ən azı 1 kategoriya tələb olunur'),
    
  body('categories.*.id')
    .isMongoId()
    .withMessage('Düzgün kategoriya ID-si tələb olunur'),
    
  body('categories.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('Sort order 0 və ya böyük rəqəm olmalıdır')
], reorderCategories);

// ===========================================
// CATEGORY CRUD OPERATIONS
// ===========================================

// @route   GET /api/admin/categories
// @desc    Bütün kategoriyaları gətir (filtered, paginated)
// @access  Private/Admin
router.get('/', getCategories);

// @route   POST /api/admin/categories
// @desc    Yeni kategoriya yarat
// @access  Private/Admin
router.post('/', categoryValidation, createCategory);

// @route   GET /api/admin/categories/:id
// @desc    Kategoriya məlumatını gətir
// @access  Private/Admin
router.get('/:id', getCategory);

// @route   PUT /api/admin/categories/:id
// @desc    Kategoriya yenilə
// @access  Private/Admin
router.put('/:id', categoryValidation, updateCategory);

// @route   DELETE /api/admin/categories/:id
// @desc    Kategoriya sil
// @access  Private/Admin
router.delete('/:id', deleteCategory);

// ===========================================
// CATEGORY STATUS OPERATIONS
// ===========================================

// @route   PATCH /api/admin/categories/:id/status
// @desc    Kategoriya statusunu dəyiş
// @access  Private/Admin
router.patch('/:id/status', [
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
], updateCategoryStatus);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Admin Categories API Routes',
      routes: {
        statistics: {
          'GET /api/admin/categories/stats': 'Kategoriya statistikaları və dashboard'
        },
        special: {
          'GET /api/admin/categories/tree': 'Kategoriya ağacı (hierarchical)',
          'PATCH /api/admin/categories/reorder': 'Kategoriya sıralamasını yenilə'
        },
        crud: {
          'GET /api/admin/categories': 'Bütün kategoriyalar (filtered, paginated)',
          'POST /api/admin/categories': 'Yeni kategoriya yarat',
          'GET /api/admin/categories/:id': 'Kategoriya məlumatı',
          'PUT /api/admin/categories/:id': 'Kategoriya yenilə',
          'DELETE /api/admin/categories/:id': 'Kategoriya sil'
        },
        status: {
          'PATCH /api/admin/categories/:id/status': 'Status dəyiş (isActive, isFeatured, showInMenu)'
        }
      },
      authentication: {
        required: true,
        role: 'admin',
        header: 'Authorization: Bearer TOKEN_HERE'
      },
      queryParameters: {
        getCategories: {
          page: 'Səhifə nömrəsi (default: 1)',
          limit: 'Səhifə başına limit (default: 50)',
          search: 'Axtarış sorğusu (name, description, slug)',
          parent: 'Parent kategoriya ID-si (null for root categories)',
          isActive: 'Aktiv status filter (true/false)',
          isFeatured: 'Featured status filter (true/false)',
          sortBy: 'Sıralama sahəsi (default: sortOrder)',
          sortOrder: 'Sıralama istiqaməti (asc/desc, default: asc)'
        },
        getCategoryTree: {
          includeInactive: 'Deaktiv kategoriyaları da daxil et (true/false, default: false)'
        },
        deleteCategory: {
          forceDelete: 'Məcburi silmə (məhsul və alt kategoriyalarla, default: false)',
          moveProductsTo: 'Məhsulları köçürüləcək kategoriya ID-si'
        }
      },
      validation: {
        createCategory: {
          required: [
            'name'
          ],
          optional: [
            'description', 'slug', 'parent', 'image', 'icon', 'color',
            'metaTitle', 'metaDescription', 'sortOrder', 'isActive', 
            'isFeatured', 'showInMenu'
          ]
        },
        updateStatus: {
          optional: ['isActive: Boolean', 'isFeatured: Boolean', 'showInMenu: Boolean']
        },
        reorder: {
          required: ['categories: Array<{id: ObjectId, sortOrder: Number}>']
        }
      },
      examples: {
        createCategory: {
          name: 'Elektronika',
          description: 'Elektronik cihazlar və aksessuarlar',
          parent: null,
          image: 'https://example.com/electronics.jpg',
          icon: 'fas fa-laptop',
          color: '#3182ce',
          metaTitle: 'Elektronika məhsulları',
          metaDescription: 'Ən yaxşı elektronik cihazlar burada',
          sortOrder: 1,
          isActive: true,
          isFeatured: true,
          showInMenu: true
        },
        updateStatus: {
          isActive: true,
          isFeatured: false,
          showInMenu: true
        },
        reorder: {
          categories: [
            { id: '64f8b5c8e1234567890abcde', sortOrder: 1 },
            { id: '64f8b5c8e1234567890abcdf', sortOrder: 2 },
            { id: '64f8b5c8e1234567890abce0', sortOrder: 3 }
          ]
        }
      },
      hierarchyRules: {
        maxLevels: 5,
        restrictions: [
          'Kategoriya özünü parent edə bilməz',
          'Alt kategoriya parent ola bilməz',
          'Maksimum 5 səviyyə dərinlik'
        ]
      },
      notes: {
        slug: 'Avtomatik yaradılır (name-dən), manual təyin edə bilərsiniz',
        hierarchy: 'Parent dəyişdirildikdə bütün alt ağac yenidən hesablanır',
        deletion: 'Məhsulu olan kategoriya silinərkən məhsulları köçürün',
        productCount: 'Hər kategoriya üçün aktiv məhsul sayı hesablanır'
      }
    });
  });
}

module.exports = router;