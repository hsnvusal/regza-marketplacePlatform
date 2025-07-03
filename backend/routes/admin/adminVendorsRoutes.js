// routes/admin/adminVendorsRoutes.js - YENİ FAYL
const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Bütün route-lar admin yetkisi tələb edir
router.use(protect);
router.use(authorize('admin'));

// @desc    Admin - Bütün vendor-ları gətir
// @route   GET /api/admin/vendors
// @access  Private/Admin
const getVendors = async (req, res) => {
  try {
    const User = require('../../models/User');
    const { status = 'all', page = 1, limit = 20 } = req.query;
    
    const filter = { role: 'vendor' };
    if (status !== 'all') {
      if (status === 'approved') {
        filter['vendorInfo.isVerified'] = true;
        filter.isActive = true;
      } else if (status === 'pending') {
        filter['vendorInfo.isVerified'] = false;
      } else if (status === 'inactive') {
        filter.isActive = false;
      }
    }

    const vendors = await User.find(filter)
      .select('firstName lastName email businessName vendorInfo isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      vendors: vendors.map(vendor => ({
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        businessName: vendor.vendorInfo?.businessName || vendor.businessName,
        isVerified: vendor.vendorInfo?.isVerified || false,
        isActive: vendor.isActive,
        createdAt: vendor.createdAt
      })),
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        current: parseInt(page),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Vendor-lar alınarkən xəta baş verdi'
    });
  }
};

// @desc    Admin - Vendor məlumatını gətir
// @route   GET /api/admin/vendors/:id
// @access  Private/Admin
const getVendor = async (req, res) => {
  try {
    const User = require('../../models/User');
    const vendor = await User.findById(req.params.id)
      .select('-password')
      .populate('vendorInfo.documents');

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor tapılmadı'
      });
    }

    res.json({
      success: true,
      vendor
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Vendor məlumatları alınarkən xəta baş verdi'
    });
  }
};

// @desc    Admin - Vendor statusunu yenilə
// @route   PATCH /api/admin/vendors/:id/status
// @access  Private/Admin
const updateVendorStatus = async (req, res) => {
  try {
    const User = require('../../models/User');
    const { isVerified, isActive } = req.body;

    const vendor = await User.findById(req.params.id);

    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor tapılmadı'
      });
    }

    if (typeof isVerified !== 'undefined') {
      vendor.vendorInfo.isVerified = isVerified;
    }
    
    if (typeof isActive !== 'undefined') {
      vendor.isActive = isActive;
    }

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor statusu yeniləndi',
      vendor: {
        _id: vendor._id,
        isVerified: vendor.vendorInfo?.isVerified,
        isActive: vendor.isActive
      }
    });

  } catch (error) {
    console.error('Update vendor status error:', error);
    res.status(500).json({
      success: false,
      message: 'Vendor statusu yenilənərkən xəta baş verdi'
    });
  }
};

// Routes
router.get('/', getVendors);
router.get('/:id', getVendor);
router.patch('/:id/status', [
  body('isVerified').optional().isBoolean(),
  body('isActive').optional().isBoolean()
], updateVendorStatus);

module.exports = router;