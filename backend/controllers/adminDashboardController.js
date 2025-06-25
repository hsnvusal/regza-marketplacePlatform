// 1. controllers/adminDashboardController.js - Dashboard statistikaları
const Order = require('../models/Order'); // Mövcud Order modeliniz
const User = require('../models/User');   // Mövcud User modeliniz
const Product = require('../models/Product'); // Mövcud Product modeliniz

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    // Parallel olaraq bütün statistikaları al
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalVendors,
      pendingOrders,
      completedOrders,
      todayOrders,
      monthlyRevenue
    ] = await Promise.all([
      // Ümumi sifarişlər
      Order.countDocuments(),
      
      // Ümumi gəlir (completed orders)
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Ümumi müştərilər
      User.countDocuments({ role: 'customer' }),
      
      // Ümumi vendorlar
      User.countDocuments({ role: 'vendor' }),
      
      // Gözləyən sifarişlər
      Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      
      // Tamamlanmış sifarişlər
      Order.countDocuments({ status: 'completed' }),
      
      // Bu gün sifarişlər
      Order.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      
      // Bu ay gəlir
      Order.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    // Son sifarişlər (son 10)
    const recentOrders = await Order.find()
      .populate('customer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber total status createdAt customer');

    // Aylıq trend (son 6 ay)
    const monthlyTrend = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$total', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top products (ən çox satılan)
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          totalCustomers,
          totalVendors,
          pendingOrders,
          completedOrders,
          todayOrders,
          monthlyRevenue: monthlyRevenue[0]?.total || 0
        },
        recentOrders,
        monthlyTrend,
        topProducts
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikalar yüklənərkən xəta baş verdi'
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/admin/dashboard/activities
// @access  Private (Admin)
const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Son aktivliklər
    const activities = await Promise.all([
      // Yeni sifarişlər
      Order.find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .populate('customer', 'firstName lastName')
        .select('orderNumber total createdAt customer')
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Yeni müştərilər
      User.find({ 
        role: 'customer',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
        .select('firstName lastName email createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Yeni vendorlar
      User.find({ 
        role: 'vendor',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
        .select('firstName lastName email businessName createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Aktivlikləri birləşdir və sort et
    const allActivities = [
      ...activities[0].map(order => ({
        type: 'new_order',
        message: `Yeni sifariş: #${order.orderNumber}`,
        data: order,
        timestamp: order.createdAt
      })),
      ...activities[1].map(customer => ({
        type: 'new_customer',
        message: `Yeni müştəri: ${customer.firstName} ${customer.lastName}`,
        data: customer,
        timestamp: customer.createdAt
      })),
      ...activities[2].map(vendor => ({
        type: 'new_vendor',
        message: `Yeni vendor: ${vendor.businessName || vendor.firstName + ' ' + vendor.lastName}`,
        data: vendor,
        timestamp: vendor.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json({
      success: true,
      activities: allActivities
    });

  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivliklər yüklənərkən xəta baş verdi'
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities
};