const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getRecentActivities
} = require('../controllers/adminDashboardController');

// Admin user və order controllers (yeni yaradılacaq)
const {
  getAllUsers,
  updateUserRole,
  deleteUser
} = require('../controllers/adminUsersController');

const {
  getAllOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/adminOrdersController');

const {
  adminLogin,
  verifyAdminToken,
  adminLogout
} = require('../controllers/adminAuthController');

const router = express.Router();

// ===== ADMIN AUTH ROUTES =====
router.post('/auth/login', adminLogin);
router.get('/auth/verify', protect, authorize('admin'), verifyAdminToken);
router.post('/auth/logout', protect, authorize('admin'), adminLogout);

// ===== DASHBOARD ROUTES =====
router.get('/dashboard/stats', protect, authorize('admin'), getDashboardStats);
router.get('/dashboard/activities', protect, authorize('admin'), getRecentActivities);

// ===== ORDERS MANAGEMENT =====
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.get('/orders/:id', protect, authorize('admin'), getOrderById);
router.patch('/orders/:id/status', protect, authorize('admin'), updateOrderStatus);

// ===== USERS MANAGEMENT =====
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// ===== PRODUCTS MANAGEMENT =====
// Bu route-lar artıq products router-də var, amma admin access lazımdır
// Əlavə admin-specific product routes buraya əlavə edilə bilər

module.exports = router;