const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email və şifrə tələb olunur'
      });
    }

    // Admin olan istifadəçini tap
    const admin = await User.findOne({ 
      email: email.toLowerCase(),
      role: 'admin',
      isActive: true 
    }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin hesabı tapılmadı'
      });
    }

    // Şifrəni yoxla
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Yanlış şifrə'
      });
    }

    // JWT token yarat
    const token = jwt.sign(
      { 
        id: admin._id,
        role: admin.role,
        email: admin.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Admin məlumatlarını geri qaytar (şifrə olmadan)
    const adminData = {
      id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      lastLogin: new Date()
    };

    // Last login update
    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin giriş uğurlu',
      token,
      admin: adminData
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xətası'
    });
  }
};

// @desc    Verify admin token
// @route   GET /api/admin/auth/verify
// @access  Private (Admin)
const verifyAdminToken = async (req, res) => {
  try {
    // protect middleware-dan gələn user məlumatı
    const admin = await User.findById(req.user.id)
      .select('-password')
      .lean();

    if (!admin || admin.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Admin icazəsi yoxdur'
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Admin token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token yoxlanması xətası'
    });
  }
};

// @desc    Admin logout
// @route   POST /api/admin/auth/logout
// @access  Private (Admin)
const adminLogout = async (req, res) => {
  try {
    // Burada token blacklist-ə əlavə edilə bilər
    // İndi sadəcə uğurlu cavab qaytar
    
    res.status(200).json({
      success: true,
      message: 'Admin çıxışı uğurlu'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıxış xətası'
    });
  }
};

module.exports = {
  adminLogin,
  verifyAdminToken,
  adminLogout
};