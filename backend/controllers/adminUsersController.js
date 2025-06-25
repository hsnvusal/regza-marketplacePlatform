const User = require('../models/User');

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Filter obyekti
    const filter = {};

    // Role filter
    if (role && role !== 'all') {
      filter.role = role;
    }

    // Active status filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'vendorInfo.businessName': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort obyekti
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Users tap
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Total count
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    // Format users
    const formattedUsers = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      // Vendor specific info
      businessName: user.vendorInfo?.businessName,
      businessType: user.vendorInfo?.businessType,
      isVerified: user.vendorInfo?.isVerified,
      // Address info
      address: user.address
    }));

    res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçilər alınarkən xəta baş verdi'
    });
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Valid roles
    const validRoles = ['customer', 'vendor', 'admin'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Yanlış rol dəyəri'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    // Öz rolunu dəyişdirməyin qarşısını al
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Öz rolunuzu dəyişə bilməzsiniz'
      });
    }

    // Role update
    user.role = role;

    // Vendor olacaqsa vendor info əlavə et
    if (role === 'vendor' && !user.vendorInfo) {
      user.vendorInfo = {
        businessName: `${user.firstName} ${user.lastName} Business`,
        businessType: 'individual',
        isVerified: false
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `İstifadəçi rolu "${role}" olaraq yeniləndi`,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçi rolu yenilənərkən xəta baş verdi'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    // Öz hesabını silməyin qarşısını al
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Öz hesabınızı silə bilməzsiniz'
      });
    }

    // Admin hesabını silməyin qarşısını al (son admin olarsa)
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Son admin hesabını silə bilməzsiniz'
        });
      }
    }

    // Soft delete - hesabı deaktiv et
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    // Həqiqi delete istəyirsinizsə:
    // await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'İstifadəçi uğurla silindi'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'İstifadəçi silinərkən xəta baş verdi'
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  deleteUser
};