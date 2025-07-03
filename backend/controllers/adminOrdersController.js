const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Filter obyekti
    const filter = {};

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Search filter (orderNumber və customer email-ə görə)
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Sort obyekti
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Orders tap
    const orders = await Order.find(filter)
      .populate('customer', 'firstName lastName email avatar')
      .populate('vendorOrders.items.product', 'name sku images')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Total count
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Orders format et
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customer: {
        id: order.customer?._id,
        name: order.customer ? 
          `${order.customer.firstName} ${order.customer.lastName}` : 
          order.customerInfo?.firstName + ' ' + order.customerInfo?.lastName,
        email: order.customer?.email || order.customerInfo?.email,
        avatar: order.customer?.avatar
      },
      items: order.vendorOrders?.reduce((sum, vo) => sum + (vo.items?.length || 0), 0) || 0,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shippingAddress: order.shippingAddress
    }));

    res.status(200).json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Sifarişlər alınarkən xəta baş verdi'
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/admin/orders/:id
// @access  Private (Admin)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('customer', 'firstName lastName email phone avatar address')
      .populate('vendorOrders.items.product', 'name sku images category brand')
      .populate('vendorOrders.vendor', 'businessName firstName lastName')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // Format order data
    const formattedOrder = {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      
      // Customer info
      customer: order.customer ? {
        id: order.customer._id,
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        email: order.customer.email,
        phone: order.customer.phone,
        avatar: order.customer.avatar
      } : {
        name: `${order.customerInfo?.firstName} ${order.customerInfo?.lastName}`,
        email: order.customerInfo?.email,
        phone: order.customerInfo?.phone
      },

      // Order totals
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      tax: order.tax,
      discount: order.discount,
      total: order.total,

      // Vendor Orders (yeni modelə uyğun, təhlükəsizlik yoxlaması ilə)
      vendorOrders: Array.isArray(order.vendorOrders) ? order.vendorOrders.map(vo => ({
        vendor: vo.vendor ? {
          id: vo.vendor._id,
          name: vo.vendor.businessName || `${vo.vendor.firstName} ${vo.vendor.lastName}`
        } : null,
        vendorOrderNumber: vo.vendorOrderNumber,
        status: vo.status,
        subtotal: vo.subtotal,
        tax: vo.tax,
        shipping: vo.shipping,
        total: vo.total,
        items: Array.isArray(vo.items) ? vo.items.map(item => ({
          id: item._id,
          product: item.product ? {
            id: item.product._id,
            name: item.product.name,
            sku: item.product.sku,
            image: item.product.images?.[0]?.url,
            brand: item.product.brand,
            category: item.product.category
          } : (item.productSnapshot || {}),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedVariants: item.selectedVariants,
          status: item.status,
          notes: item.notes
        })) : []
      })) : [],

      // Addresses
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,

      // Tracking
      trackingInfo: order.trackingInfo,

      // Dates
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      
      // Notes
      customerNotes: order.customerNotes,
      adminNotes: order.adminNotes
    };

    res.status(200).json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    console.error('Get order by ID error:', error, error?.stack, order);
    res.status(500).json({
      success: false,
      message: 'Sifariş məlumatları alınarkən xəta baş verdi'
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber, trackingUrl } = req.body;

    // Valid status-ları yoxla
    const validStatuses = [
      'pending', 'confirmed', 'processing', 
      'shipped', 'delivered', 'completed', 'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Yanlış status dəyəri'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // Update order
    order.status = status;
    
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    // Tracking info update
    if (trackingNumber || trackingUrl) {
      order.trackingInfo = {
        ...order.trackingInfo,
        ...(trackingNumber && { trackingNumber }),
        ...(trackingUrl && { trackingUrl }),
        updatedAt: new Date()
      };
    }

    // Status-specific updates
    if (status === 'shipped' && trackingNumber) {
      order.shippedAt = new Date();
    }
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    
    if (status === 'completed') {
      order.completedAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Sifariş statusu "${status}" olaraq yeniləndi`,
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Sifariş statusu yenilənərkən xəta baş verdi'
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus
};