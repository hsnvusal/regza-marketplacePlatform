const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');
const ApiResponse = require('../utils/apiResponse');

// @desc  JWT token yoxla və istifadəçini doğrula
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Header-dən token-i götür
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Bearer token formatı: "Bearer TOKEN_HERE"
      token = req.headers.authorization.split(' ')[1];
    } catch (error) {
      return ApiResponse.error(res, 'Token formatı yanlışdır', 401);
    }
  }

  // Token yoxdursa
  if (!token) {
    return ApiResponse.error(res, 'Bu əməliyyat üçün giriş tələb olunur', 401);
  }

  try {
    // Token-i verify et
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // İstifadəçini tap
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return ApiResponse.error(res, 'Bu token ilə istifadəçi tapılmadı', 401);
    }

    // Hesab aktiv yoxla
    if (!user.isActive) {
      return ApiResponse.error(res, 'Hesabınız deaktiv edilib. Dəstək ilə əlaqə saxlayın', 401);
    }

    // Hesab kilidli yoxla
    if (user.isLocked) {
      return ApiResponse.error(res, 'Hesabınız müvəqqəti kilidlənib', 423);
    }

    // İstifadəçini request obyektinə əlavə et
    req.user = user;
    next();

  } catch (error) {
    console.error('Token doğrulama xətası:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 'Etibarsız token', 401);
    }
    
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token vaxtı bitib. Yenidən daxil olun', 401);
    }
    
    return ApiResponse.error(res, 'Token doğrulanması uğursuz', 401);
  }
});

// @desc  İstifadəçi rolunu yoxla
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication tələb olunur', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 
        `${req.user.role} rolu bu əməliyyat üçün icazə verilməyib. Tələb olunan rollər: ${roles.join(', ')}`, 
        403
      );
    }
    
    next();
  };
};

// @desc  Admin rolunu yoxla
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication tələb olunur', 401);
  }

  if (req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Bu əməliyyat yalnız admin üçündür', 403);
  }
  
  next();
};

// @desc  Vendor və ya Admin rolunu yoxla
const vendorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication tələb olunur', 401);
  }

  if (!['vendor', 'admin'].includes(req.user.role)) {
    return ApiResponse.error(res, 'Bu əməliyyat vendor və ya admin üçündür', 403);
  }
  
  next();
};

// @desc  Vendor hesabını yoxla və doğrula
const checkVendor = asyncHandler(async (req, res, next) => {
  // Admin üçün vendor yoxlanması keçin
  if (req.user.role === 'admin') {
    return next();
  }

  // Vendor rolunu yoxla
  if (req.user.role !== 'vendor') {
    return ApiResponse.error(res, 'Bu əməliyyat vendor hesabı tələb edir', 403);
  }

  try {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ user: req.user.id });
    
    if (!vendor) {
      return ApiResponse.error(res, 'Vendor profili tapılmadı. Əvvəlcə vendor qeydiyyatını tamamlayın', 404);
    }

    if (vendor.status !== 'approved') {
      return ApiResponse.error(res, 
        `Vendor hesabınızın statusu: ${vendor.status}. Təsdiqlənmiş hesab tələb olunur`, 
        403
      );
    }

    // Vendor məlumatını request-ə əlavə et
    req.vendor = vendor;
    next();

  } catch (error) {
    console.error('Vendor yoxlanması xətası:', error);
    return ApiResponse.error(res, 'Vendor məlumatı yoxlanarkən xəta baş verdi', 500);
  }
});

// @desc  Resurs sahibliyini yoxla (məs: istifadəçi öz məlumatını dəyişə bilər)
const checkOwnership = (resourceModel, resourceIdParam = 'id') => {
  return asyncHandler(async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      // Admin bütün resurslara çıxış edə bilər
      if (req.user.role === 'admin') {
        return next();
      }

      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return ApiResponse.error(res, 'Resurs tapılmadı', 404);
      }

      // Resurs sahibliyini yoxla
      const ownerId = resource.user || resource.customer || resource.owner;
      
      if (!ownerId || ownerId.toString() !== req.user.id.toString()) {
        return ApiResponse.error(res, 'Bu resursa çıxış icazəniz yoxdur', 403);
      }

      next();

    } catch (error) {
      console.error('Ownership yoxlanması xətası:', error);
      return ApiResponse.error(res, 'Resurs sahibliyi yoxlanarkən xəta baş verdi', 500);
    }
  });
};

// @desc  Optional authentication - token varsa doğrula, yoxsa davam et
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    } catch (error) {
      // Token xətalı olsa da davam et, req.user undefined olacaq
      console.log('Optional auth - token invalid:', error.message);
    }
  }

  next();
});

module.exports = {
  protect,
  authorize,
  adminOnly,
  vendorOrAdmin,
  checkVendor,
  checkOwnership,
  optionalAuth
};