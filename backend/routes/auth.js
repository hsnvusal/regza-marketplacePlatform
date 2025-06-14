const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getUserStats
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 simvol arası olmalıdır')
    .matches(/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/)
    .withMessage('Ad yalnız hərflərdən ibarət ola bilər'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 simvol arası olmalıdır')
    .matches(/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/)
    .withMessage('Soyad yalnız hərflərdən ibarət ola bilər'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Düzgün email formatı daxil edin')
    .isLength({ max: 100 })
    .withMessage('Email 100 simvoldan çox ola bilməz'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Şifrə 6-100 simvol arası olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifrə ən azı bir kiçik hərf, bir böyük hərf və bir rəqəm daxil etməlidir'),
  
  body('role')
    .optional()
    .isIn(['customer', 'vendor'])
    .withMessage('Role yalnız customer və ya vendor ola bilər')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Düzgün email formatı daxil edin'),
  
  body('password')
    .notEmpty()
    .withMessage('Şifrə daxil edilməlidir')
    .isLength({ min: 1, max: 100 })
    .withMessage('Şifrə çox uzundur')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 simvol arası olmalıdır')
    .matches(/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/)
    .withMessage('Ad yalnız hərflərdən ibarət ola bilər'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 simvol arası olmalıdır')
    .matches(/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/)
    .withMessage('Soyad yalnız hərflərdən ibarət ola bilər'),
  
  body('phone')
    .optional()
    .isMobilePhone(['az-AZ', 'tr-TR', 'en-US'])
    .withMessage('Düzgün telefon nömrəsi daxil edin'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Küçə ünvanı 200 simvoldan çox ola bilməz'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Şəhər adı 100 simvoldan çox ola bilməz'),
  
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Poçt kodu 20 simvoldan çox ola bilməz'),
  
  body('preferences.currency')
    .optional()
    .isIn(['AZN', 'USD', 'EUR', 'TRY'])
    .withMessage('Currency AZN, USD, EUR və ya TRY ola bilər'),
  
  body('preferences.language')
    .optional()
    .isIn(['az', 'en', 'ru', 'tr'])
    .withMessage('Dil az, en, ru və ya tr ola bilər')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Cari şifrə daxil edilməlidir'),
  
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('Yeni şifrə 6-100 simvol arası olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifrə ən azı bir kiçik hərf, bir böyük hərf və bir rəqəm daxil etməlidir'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Şifrə təsdiqi daxil edilməlidir')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Şifrə təsdiqi yeni şifrə ilə uyğun gəlmir');
      }
      return true;
    })
];

// ===========================================
// PUBLIC ROUTES - Authentication tələb olunmur
// ===========================================

// @route   POST /api/auth/register
// @desc    Yeni istifadəçi qeydiyyatı
// @access  Public
router.post('/register', registerValidation, register);

// @route   POST /api/auth/login
// @desc    İstifadəçi girişi
// @access  Public
router.post('/login', loginValidation, login);

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bundan sonrakı bütün route-lar authentication tələb edir
router.use(protect);

// @route   GET /api/auth/me
// @desc    Cari istifadəçi məlumatları
// @access  Private
router.get('/me', getMe);

// @route   PUT /api/auth/me
// @desc    Profil məlumatlarını yenilə
// @access  Private
router.put('/me', updateProfileValidation, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Şifrə dəyişdir
// @access  Private
router.put('/change-password', changePasswordValidation, changePassword);

// @route   POST /api/auth/logout
// @desc    İstifadəçi çıxışı
// @access  Private
router.post('/logout', logout);

// @route   GET /api/auth/stats
// @desc    İstifadəçi statistikası
// @access  Private
router.get('/stats', getUserStats);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/auth/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Public
if (process.env.NODE_ENV === 'development') {
  router.get('/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Auth API Routes',
      routes: {
        public: {
          'POST /api/auth/register': 'Qeydiyyat',
          'POST /api/auth/login': 'Giriş',
          'GET /api/auth/routes': 'Route siyahısı (dev only)'
        },
        protected: {
          'GET /api/auth/me': 'Profil məlumatı',
          'PUT /api/auth/me': 'Profil yeniləmə',
          'PUT /api/auth/change-password': 'Şifrə dəyişdirmə',
          'POST /api/auth/logout': 'Çıxış',
          'GET /api/auth/stats': 'İstifadəçi statistikası'
        },
        authentication: {
          header: 'Authorization: Bearer TOKEN_HERE',
          example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        validation: {
          register: {
            required: ['firstName', 'lastName', 'email', 'password'],
            optional: ['role']
          },
          login: {
            required: ['email', 'password']
          },
          updateProfile: {
            optional: ['firstName', 'lastName', 'phone', 'address', 'preferences']
          },
          changePassword: {
            required: ['currentPassword', 'newPassword', 'confirmPassword']
          }
        }
      }
    });
  });
}

module.exports = router;