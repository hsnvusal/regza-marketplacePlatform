const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { validationResult } = require('express-validator');
const emailService = require('../utils/emailService');

// @desc    Qeydiyyat
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Validation yoxlanışı
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumatlar düzgün deyil', 400, errors.array());
  }

  const { firstName, lastName, email, password, role } = req.body;

  // İstifadəçi mövcudluğunu yoxla
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return ApiResponse.error(res, 'Bu email artıq qeydiyyatdan keçib', 400);
  }

  try {
    // Yeni istifadəçi yarat
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password,
      role: role || 'customer'
    });

    // Token yarat və göndər
    const token = user.getSignedJwtToken();

    // Terms accepted məlumatı əlavə et
    user.termsAccepted = {
      version: '1.0',
      acceptedAt: new Date()
    };
    user.privacyPolicyAccepted = {
      version: '1.0',
      acceptedAt: new Date()
    };
    await user.save();

    // ✅ WELCOME EMAIL GÖNDƏR
    try {
      await emailService.sendWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
      console.log(`📧 Welcome email göndərildi: ${user.email}`);
    } catch (emailError) {
      console.error('📧 Welcome email xətası:', emailError.message);
      // Email xətası olsa da qeydiyyat davam etsin
    }

    console.log(`✅ Yeni istifadəçi qeydiyyatdan keçdi: ${user.email}`);

    ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    }, 'Qeydiyyat uğurla tamamlandı! Xoş gəlmisiniz. Email göndərildi.', 201);

  } catch (error) {
    console.error('Qeydiyyat xətası:', error);
    return ApiResponse.error(res, 'Qeydiyyat zamanı xəta baş verdi', 500);
  }
});

// @desc    Giriş
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumatlar düzgün deyil', 400, errors.array());
  }

  const { email, password } = req.body;

  try {
    // İstifadəçini tap və şifrəni daxil et
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return ApiResponse.error(res, 'Yanlış email və ya şifrə', 401);
    }

    // Hesab kilidlənib yoxla
    if (user.isLocked) {
      return ApiResponse.error(res, 'Hesab müvəqqəti olaraq kilidlənib. Sonra yenidən cəhd edin.', 423);
    }

    // Hesab aktiv olub-olmadığını yoxla
    if (!user.isActive) {
      return ApiResponse.error(res, 'Hesabınız deaktiv edilib. Dəstək ilə əlaqə saxlayın.', 401);
    }

    // Şifrəni yoxla
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      // Login cəhdini artır
      await user.incLoginAttempts();
      
      return ApiResponse.error(res, 'Yanlış email və ya şifrə', 401);
    }

    // Uğurlu giriş - məlumatları yenilə
    user.lastLogin = Date.now();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Token yarat
    const token = user.getSignedJwtToken();

    console.log(`✅ İstifadəçi daxil oldu: ${user.email}`);

    ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      }
    }, 'Uğurla daxil oldunuz');

  } catch (error) {
    console.error('Giriş xətası:', error);
    return ApiResponse.error(res, 'Giriş zamanı xəta baş verdi', 500);
  }
});

// @desc    Profil məlumatı
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('stats')
      .select('-password -passwordResetToken -emailVerificationToken');
    
    if (!user) {
      return ApiResponse.error(res, 'İstifadəçi tapılmadı', 404);
    }

    ApiResponse.success(res, { 
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        address: user.address,
        preferences: user.preferences,
        stats: user.stats,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }, 'Profil məlumatı alındı');

  } catch (error) {
    console.error('Profil məlumatı xətası:', error);
    return ApiResponse.error(res, 'Profil məlumatı alınarkən xəta baş verdi', 500);
  }
});

// @desc    Profil yenilə
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 
      'lastName', 
      'phone', 
      'address', 
      'preferences'
    ];

    const fieldsToUpdate = {};
    
    // Yalnız icazə verilən sahələri götür
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    // Boş obyekt yoxla
    if (Object.keys(fieldsToUpdate).length === 0) {
      return ApiResponse.error(res, 'Yenilənəcək məlumat tapılmadı', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      fieldsToUpdate, 
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return ApiResponse.error(res, 'İstifadəçi tapılmadı', 404);
    }

    console.log(`✅ Profil yeniləndi: ${user.email}`);

    ApiResponse.success(res, { 
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        address: user.address,
        preferences: user.preferences,
        updatedAt: user.updatedAt
      }
    }, 'Profil uğurla yeniləndi');

  } catch (error) {
    console.error('Profil yeniləmə xətası:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat yoxlanması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Profil yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Şifrə dəyiş
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Basic validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return ApiResponse.error(res, 'Bütün sahələr doldurulmalıdır', 400);
  }

  if (newPassword !== confirmPassword) {
    return ApiResponse.error(res, 'Yeni şifrələr uyğun gəlmir', 400);
  }

  if (newPassword.length < 6) {
    return ApiResponse.error(res, 'Yeni şifrə ən azı 6 simvol olmalıdır', 400);
  }

  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return ApiResponse.error(res, 'İstifadəçi tapılmadı', 404);
    }

    // Cari şifrəni yoxla
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return ApiResponse.error(res, 'Cari şifrə yanlışdır', 400);
    }

    // Yeni şifrəni təyin et
    user.password = newPassword;
    await user.save();

    // Yeni token yarat
    const token = user.getSignedJwtToken();

    console.log(`✅ Şifrə dəyişdirildi: ${user.email}`);

    ApiResponse.success(res, { 
      token,
      message: 'Şifrəniz uğurla dəyişdirildi'
    }, 'Şifrə uğurla dəyişdirildi');

  } catch (error) {
    console.error('Şifrə dəyişdirmə xətası:', error);
    return ApiResponse.error(res, 'Şifrə dəyişdirilərkən xəta baş verdi', 500);
  }
});

// @desc    Çıxış
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  try {
    console.log(`✅ İstifadəçi çıxış etdi: ${req.user.email}`);
    
    // Client-side token-i silməli
    ApiResponse.success(res, {
      message: 'Token-i client tərəfdə silin'
    }, 'Uğurla çıxış etdiniz');

  } catch (error) {
    console.error('Çıxış xətası:', error);
    return ApiResponse.error(res, 'Çıxış zamanı xəta baş verdi', 500);
  }
});

// @desc    İstifadəçi statistikası
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return ApiResponse.error(res, 'İstifadəçi tapılmadı', 404);
    }

    // Statistika məlumatları (sonra Order, Cart modellərindən alacağıq)
    const stats = {
      totalOrders: user.stats.totalOrders,
      totalSpent: user.stats.totalSpent,
      totalReviews: user.stats.totalReviews,
      wishlistItems: user.stats.wishlistItems,
      accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // gün
      lastLogin: user.lastLogin,
      emailVerified: user.isEmailVerified
    };

    ApiResponse.success(res, { stats }, 'İstifadəçi statistikası alındı');

  } catch (error) {
    console.error('Statistika xətası:', error);
    return ApiResponse.error(res, 'Statistika alınarkən xəta baş verdi', 500);
  }
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getUserStats
};