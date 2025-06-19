const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const emailService = require("../utils/emailService");
const mongoose = require("mongoose");

// @desc    Səbətdən sifariş yarat
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(
      res,
      "Məlumat doğrulaması uğursuz",
      400,
      errors.array()
    );
  }

  const {
    shippingAddress,
    billingAddress,
    paymentMethod,
    customerNotes,
    specialInstructions,
    requestedDeliveryDate,
  } = req.body;

  // 🔧 TRANSACTION DISABLE (local development üçün)
  // Production-da MONGODB_REPLICA_SET=true environment variable set edin
  const useTransaction = process.env.MONGODB_REPLICA_SET === 'true' && process.env.NODE_ENV === 'production';
  
  let session = null;
  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    console.log(`🚀 Order creation started - User: ${req.user.email} - Transaction: ${useTransaction}`);

    // 1. Aktiv səbəti tap
    const cartQuery = {
      user: req.user.id,
      status: "active",
    };
    
    const cart = useTransaction 
      ? await Cart.findOne(cartQuery).session(session)
      : await Cart.findOne(cartQuery);

    console.log(`📋 Cart found:`, cart ? `${cart.items.length} items` : 'No cart');

    if (!cart || cart.isEmpty) {
      if (useTransaction && session) await session.abortTransaction();
      console.log('❌ Cart is empty or not found');
      return ApiResponse.error(res, "Səbət boş və ya tapılmadı", 400);
    }

    // 2. Səbət məhsullarını vendor-lərə görə qruplaşdır
    const vendorGroups = {};

    for (const item of cart.items) {
      console.log(`🔍 Processing cart item: ${item.productSnapshot?.name || 'Unknown'}`);
      
      // Məhsul məlumatını manual al
      const product = useTransaction
        ? await Product.findById(item.product).session(session)
        : await Product.findById(item.product);

      // Məhsul mövcudluğunu yoxla
      if (!product || product.status !== "active") {
        if (useTransaction && session) await session.abortTransaction();
        console.log(`❌ Product not found or inactive: ${item.productSnapshot?.name}`);
        return ApiResponse.error(
          res,
          `Məhsul "${item.productSnapshot?.name || 'naməlum'}" artıq mövcud deyil`,
          400
        );
      }

      // Stok yoxlanışı
      if (
        product.inventory &&
        product.inventory.trackQuantity === true &&
        (product.inventory.stock || 0) < item.quantity &&
        product.inventory.allowBackorder !== true
      ) {
        if (useTransaction && session) await session.abortTransaction();
        console.log(`❌ Insufficient stock: ${product.name} - Available: ${product.inventory.stock}, Requested: ${item.quantity}`);
        return ApiResponse.error(
          res,
          `"${product.name}" üçün yetərli stok yoxdur. Mövcud: ${product.inventory.stock || 0}`,
          400
        );
      }

      const vendorId = product.vendor.toString();

      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          vendor: vendorId,
          items: [],
          subtotal: 0,
        };
      }

      const itemData = {
        product: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        currency: item.currency,
        productSnapshot: {
          name: product.name,
          sku: product.sku,
          image:
            product.images && product.images.length > 0
              ? product.images[0].url
              : null,
          brand: product.brand,
          category: product.category,
          description: product.description,
        },
        selectedVariants: item.selectedVariants || [],
        notes: item.notes || "",
        status: "pending",
      };

      vendorGroups[vendorId].items.push(itemData);
      vendorGroups[vendorId].subtotal += item.totalPrice;
    }

    console.log(`🏪 Vendor groups created: ${Object.keys(vendorGroups).length} vendors`);

    // 3. Vendor sifarişlərini hazırla
    const vendorOrders = Object.values(vendorGroups).map((group) => ({
      vendor: group.vendor,
      items: group.items,
      status: "pending",
      subtotal: group.subtotal,
      tax: Math.round(group.subtotal * 0.18 * 100) / 100,
      shipping: group.subtotal >= 100 ? 0 : 10,
      total: 0, // Pre-save middleware-də hesablanacaq
    }));

    // 4. Order number generate
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    
    console.log(`📋 Generated order number: ${orderNumber}`);

    // 5. Sifarişi yarat
    const orderData = {
      customer: req.user.id,
      orderNumber: orderNumber,
      vendorOrders,
      status: "pending",
      payment: {
        method: paymentMethod,
        status: "pending",
      },
      shippingAddress: {
        ...shippingAddress,
        email: shippingAddress.email || req.user.email,
      },
      billingAddress: billingAddress || shippingAddress,
      pricing: {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: "AZN",
      },
      appliedCoupons: cart.appliedCoupons || [],
      customerNotes: customerNotes || "",
      specialInstructions: specialInstructions || {},
      requestedDeliveryDate: requestedDeliveryDate || null,
      source: "web",
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        deviceType: req.get("User-Agent")?.includes("Mobile")
          ? "mobile"
          : "desktop",
      },
      placedAt: new Date(),
    };

    // Vendor order numbers əlavə et
    vendorOrders.forEach((vendorOrder, index) => {
      if (!vendorOrder.vendorOrderNumber) {
        const vendorSuffix = String.fromCharCode(65 + index); // A, B, C...
        vendorOrder.vendorOrderNumber = `${orderNumber}-${vendorSuffix}`;
      }
    });

    console.log(`💾 Creating order with data:`, {
      orderNumber: orderData.orderNumber,
      customer: req.user.email,
      vendorOrdersCount: vendorOrders.length,
      itemsCount: vendorOrders.reduce((sum, vo) => sum + vo.items.length, 0)
    });

    // Order yaratma
    const order = new Order(orderData);
    
    if (useTransaction && session) {
      await order.save({ session });
    } else {
      await order.save();
    }

    console.log(`✅ Order saved to database: ${order.orderNumber} - ID: ${order._id}`);

    // 6. Məhsul stoklarını azalt
    for (const item of cart.items) {
      const updateQuery = {
        $inc: {
          "inventory.stock": -item.quantity,
          "stats.purchases": item.quantity,
        },
      };

      if (useTransaction && session) {
        await Product.findByIdAndUpdate(item.product, updateQuery, { session });
      } else {
        await Product.findByIdAndUpdate(item.product, updateQuery);
      }

      console.log(`📦 Stock updated: ${item.productSnapshot?.name} - Reduced by ${item.quantity}`);
    }

   // 7. 🔥 SƏBƏTI SİL - Yeni alış-veriş üçün təmiz cart
  try {
    if (useTransaction && session) {
      await Cart.findOneAndDelete({ user: req.user.id }, { session });
    } else {
      await Cart.findOneAndDelete({ user: req.user.id });
    }
    console.log(`🗑️ Cart completely cleared for user: ${req.user.email}`);
  } catch (cartDeleteError) {
    console.warn(`⚠️ Cart deletion warning:`, cartDeleteError.message);
    // Order yaradıldı, cart silmə problemi kritik deyil
    // Fallback: status-u converted et
    cart.status = "converted";
    if (useTransaction && session) {
      await cart.save({ session });
    } else {
      await cart.save();
    }
    console.log(`🛒 Cart status updated to converted (fallback)`);
  }

    console.log(`🛒 Cart status updated to: ${cart.status}`);

    // 8. İstifadəçi statistikasını yenilə
    const userUpdateQuery = {
      $inc: {
        "stats.totalOrders": 1,
        "stats.totalSpent": order.pricing.total,
      },
    };

    if (useTransaction && session) {
      await User.findByIdAndUpdate(req.user.id, userUpdateQuery, { session });
      await session.commitTransaction();
      console.log(`✅ Transaction committed successfully`);
    } else {
      await User.findByIdAndUpdate(req.user.id, userUpdateQuery);
      console.log(`✅ User stats updated (no transaction)`);
    }

    // 9. Populate məlumatları
    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "firstName lastName email phone")
      .populate("vendorOrders.vendor", "firstName lastName businessName email")
      .populate("vendorOrders.items.product", "name sku images");

    console.log(`✅ Order creation completed successfully: ${order.orderNumber} - Customer: ${req.user.email} - Total: ${order.pricing.total} AZN`);

    // 10. Email notifications (async - don't block response)
    setTimeout(async () => {
      try {
        await emailService.sendOrderConfirmationEmail(populatedOrder);
        console.log(`📧 Order confirmation email sent: ${populatedOrder.customer.email}`);

        for (const vendorOrder of populatedOrder.vendorOrders) {
          if (vendorOrder.vendor && vendorOrder.vendor.email) {
            await emailService.sendVendorOrderEmail(
              vendorOrder.vendor.email,
              populatedOrder,
              vendorOrder
            );
            console.log(`📧 Vendor notification sent: ${vendorOrder.vendor.email}`);
          }
        }
      } catch (emailError) {
        console.error("📧 Email sending error:", emailError.message);
      }
    }, 100);

    // 11. Response
    return ApiResponse.success(
      res,
      {
        order: {
          id: populatedOrder._id,
          orderNumber: populatedOrder.orderNumber,
          status: populatedOrder.status,
          vendorOrders: populatedOrder.vendorOrders,
          pricing: populatedOrder.pricing,
          shippingAddress: populatedOrder.shippingAddress,
          payment: populatedOrder.payment,
          placedAt: populatedOrder.placedAt,
          estimatedDelivery: populatedOrder.estimatedDelivery,
        },
        meta: {
          totalItems: populatedOrder.totalItems,
          totalQuantity: populatedOrder.totalQuantity,
          vendorCount: populatedOrder.vendorOrders.length,
        },
      },
      "Sifariş uğurla yaradıldı",
      201
    );

  } catch (error) {
    // Session cleanup
    if (useTransaction && session && session.inTransaction()) {
      await session.abortTransaction();
      console.log(`❌ Transaction aborted due to error`);
    }
    
    console.error("❌ Order creation error:", error);
    console.error("❌ Error stack:", error.stack);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return ApiResponse.error(
        res,
        "Məlumat doğrulaması uğursuz",
        400,
        messages
      );
    }

    return ApiResponse.error(res, "Sifariş yaradılarkən xəta baş verdi", 500);
  } finally {
    // Session cleanup
    if (useTransaction && session) {
      session.endSession();
    }
  }
});

// @desc    İstifadəçi sifarişlərini al
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    let filter = { customer: req.user.id };

    // Status filtri
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Tarix filtri
    if (req.query.startDate || req.query.endDate) {
      filter.placedAt = {};
      if (req.query.startDate) {
        filter.placedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.placedAt.$lte = new Date(req.query.endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate("vendorOrders.vendor", "firstName lastName businessName email")
      .populate("vendorOrders.items.product", "name sku images pricing")
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(filter);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    console.log(`✅ ${total} sifariş alındı - İstifadəçi: ${req.user.email}`);

    ApiResponse.paginated(res, orders, pagination, "Sifarişlər uğurla alındı");
  } catch (error) {
    console.error("Sifarişləri alma xətası:", error);
    return ApiResponse.error(res, "Sifarişlər alınarkən xəta baş verdi", 500);
  }
});

// @desc    Sifariş detayı
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "firstName lastName email phone avatar")
      .populate(
        "vendorOrders.vendor",
        "firstName lastName businessName email phone avatar"
      )
      .populate(
        "vendorOrders.items.product",
        "name sku images pricing inventory category brand"
      )
      .lean();

    if (!order) {
      return ApiResponse.error(res, "Sifariş tapılmadı", 404);
    }

    // İcazə yoxlaması - müştəri yalnız öz sifarişini, vendor öz məhsullarını, admin hamısını görə bilər
    if (
      req.user.role === "customer" &&
      order.customer._id.toString() !== req.user.id
    ) {
      return ApiResponse.error(res, "Bu sifarişə çıxış icazəniz yoxdur", 403);
    }

    if (req.user.role === "vendor") {
      const hasVendorOrder = order.vendorOrders.some(
        (vo) => vo.vendor._id.toString() === req.user.id
      );
      if (!hasVendorOrder) {
        return ApiResponse.error(res, "Bu sifarişə çıxış icazəniz yoxdur", 403);
      }
    }

    console.log(
      `✅ Sifariş detayı alındı: ${order.orderNumber} - İstifadəçi: ${req.user.email}`
    );

    ApiResponse.success(res, { order }, "Sifariş detayı alındı");
  } catch (error) {
    console.error("Sifariş detay xətası:", error);

    if (error.kind === "ObjectId") {
      return ApiResponse.error(res, "Yanlış sifariş ID formatı", 400);
    }

    return ApiResponse.error(
      res,
      "Sifariş detayı alınarkən xəta baş verdi",
      500
    );
  }
});

// @desc    Sifarişi ləğv et
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return ApiResponse.error(
      res,
      "Ləğv etmə səbəbi ən azı 5 simvol olmalıdır",
      400
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return ApiResponse.error(res, "Sifariş tapılmadı", 404);
    }

    // İcazə yoxlaması
    if (
      req.user.role === "customer" &&
      order.customer.toString() !== req.user.id
    ) {
      await session.abortTransaction();
      return ApiResponse.error(
        res,
        "Bu sifarişi ləğv etmək icazəniz yoxdur",
        403
      );
    }

    // Ləğv edilə bilərmi yoxla
    if (!order.canBeCancelled) {
      await session.abortTransaction();
      return ApiResponse.error(res, "Bu sifariş ləğv edilə bilməz", 400);
    }

    // Stokları geri qaytar
    for (const vendorOrder of order.vendorOrders) {
      for (const item of vendorOrder.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              "inventory.stock": item.quantity,
              "stats.purchases": -item.quantity,
            },
          },
          { session }
        );
      }
    }

    // Sifarişi ləğv et
    await order.cancelOrder(reason, req.user.id);
    await order.save({ session });

    // İstifadəçi statistikasını yenilə
    await User.findByIdAndUpdate(
      order.customer,
      {
        $inc: {
          "stats.totalOrders": -1,
          "stats.totalSpent": -order.pricing.total,
        },
      },
      { session }
    );

    await session.commitTransaction();

    console.log(
      `✅ Sifariş ləğv edildi: ${order.orderNumber} - Səbəb: ${reason}`
    );

    ApiResponse.success(
      res,
      {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          cancelledAt: order.cancelledAt,
        },
      },
      "Sifariş uğurla ləğv edildi"
    );
  } catch (error) {
    await session.abortTransaction();
    console.error("Sifariş ləğv etmə xətası:", error);
    return ApiResponse.error(res, "Sifariş ləğv edilərkən xəta baş verdi", 500);
  } finally {
    session.endSession();
  }
});

// @desc    Vendor sifarişlərini al
// @route   GET /api/orders/vendor/my-orders
// @access  Private (Vendor)
const getVendorOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    let filter = { "vendorOrders.vendor": req.user.id };

    if (req.query.status) {
      filter["vendorOrders.status"] = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.placedAt = {};
      if (req.query.startDate) {
        filter.placedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.placedAt.$lte = new Date(req.query.endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate("customer", "firstName lastName email phone")
      .populate("vendorOrders.items.product", "name sku images")
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Yalnız vendor-ə aid sifarişləri filtrlə
    const filteredOrders = orders.map((order) => ({
      ...order,
      vendorOrders: order.vendorOrders.filter(
        (vo) => vo.vendor.toString() === req.user.id
      ),
    }));

    const total = await Order.countDocuments(filter);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    console.log(
      `✅ ${total} vendor sifarişi alındı - Vendor: ${req.user.email}`
    );

    ApiResponse.paginated(
      res,
      filteredOrders,
      pagination,
      "Vendor sifarişləri alındı"
    );
  } catch (error) {
    console.error("Vendor sifarişləri alma xətası:", error);
    return ApiResponse.error(
      res,
      "Vendor sifarişləri alınarkən xəta baş verdi",
      500
    );
  }
});

// @desc    Vendor sifariş statusunu yenilə
// @route   PUT /api/orders/:id/vendor-status
// @access  Private (Vendor)
const updateVendorOrderStatus = asyncHandler(async (req, res) => {
  const { status, vendorNotes, trackingInfo } = req.body;

  const validStatuses = ["confirmed", "processing", "shipped", "delivered"];
  if (!validStatuses.includes(status)) {
    return ApiResponse.error(res, "Yanlış status dəyəri", 400);
  }

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return ApiResponse.error(res, "Sifariş tapılmadı", 404);
    }

    // Vendor-ə aid sifariş tapın
    const vendorOrderIndex = order.vendorOrders.findIndex(
      (vo) => vo.vendor.toString() === req.user.id
    );

    if (vendorOrderIndex === -1) {
      return ApiResponse.error(res, "Bu sifarişə çıxış icazəniz yoxdur", 403);
    }

    const vendorOrder = order.vendorOrders[vendorOrderIndex];

    // Status dəyişikliyini yoxla
    const statusFlow = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const currentIndex = statusFlow.indexOf(vendorOrder.status);
    const newIndex = statusFlow.indexOf(status);

    if (newIndex <= currentIndex && vendorOrder.status !== "pending") {
      return ApiResponse.error(res, "Status geriyə dəyişdirilə bilməz", 400);
    }

    // Status və məlumatları yenilə
    vendorOrder.status = status;
    if (vendorNotes) vendorOrder.vendorNotes = vendorNotes;

    // Status-a görə tarixləri təyin et
    const now = new Date();
    switch (status) {
      case "confirmed":
        vendorOrder.confirmedAt = now;
        break;
      case "shipped":
        vendorOrder.shippedAt = now;
        if (trackingInfo) {
          vendorOrder.tracking = {
            ...vendorOrder.tracking,
            ...trackingInfo,
          };
        }
        break;
      case "delivered":
        vendorOrder.deliveredAt = now;
        break;
    }

    // Ümumi sifariş statusunu yenilə
    const allVendorStatuses = order.vendorOrders.map((vo) => vo.status);
    if (allVendorStatuses.every((s) => s === "delivered")) {
      order.status = "delivered";
      order.deliveredAt = now;
    } else if (
      allVendorStatuses.some((s) => ["shipped", "delivered"].includes(s))
    ) {
      order.status = "shipped";
    } else if (allVendorStatuses.every((s) => s === "confirmed")) {
      order.status = "confirmed";
    }

    // Tarixçəyə əlavə et
    order.orderHistory.push({
      status: status,
      note: `Vendor sifarişi yeniləndi: ${status}${vendorNotes ? ` - ${vendorNotes}` : ""}`,
      updatedBy: req.user.id,
      timestamp: now,
    });

    await order.save();

    try {
      const populatedOrder = await Order.findById(order._id).populate(
        "customer",
        "firstName lastName email phone"
      );

      await emailService.sendOrderStatusEmail(populatedOrder, status);
      console.log(
        `📧 Status update email göndərildi: ${populatedOrder.customer.email} - Status: ${status}`
      );
    } catch (emailError) {
      console.error("📧 Status update email xətası:", emailError.message);
    }

    console.log(
      `✅ Vendor sifariş statusu yeniləndi: ${order.orderNumber} - ${status}`
    );

    ApiResponse.success(
      res,
      {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          vendorOrder: vendorOrder,
          emailSent: true
        },
      },
      "Sifariş statusu yeniləndi"
    );
  } catch (error) {
    console.error("Vendor status yeniləmə xətası:", error);
    return ApiResponse.error(res, "Status yenilənərkən xəta baş verdi", 500);
  }
});

// @desc    Tracking məlumatı əlavə et
// @route   PUT /api/orders/:id/tracking
// @access  Private (Vendor)
const addTracking = asyncHandler(async (req, res) => {
  const { trackingNumber, carrier, estimatedDelivery, trackingUrl } = req.body;

  if (!trackingNumber || !carrier) {
    return ApiResponse.error(
      res,
      "Tracking nömrəsi və daşıyıcı məlumatı tələb olunur",
      400
    );
  }

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return ApiResponse.error(res, "Sifariş tapılmadı", 404);
    }

    // Tracking məlumatını əlavə et
    await order.addTracking(req.user.id, {
      trackingNumber,
      carrier,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      trackingUrl,
    });

    console.log(
      `✅ Tracking məlumatı əlavə edildi: ${order.orderNumber} - ${trackingNumber}`
    );

    ApiResponse.success(
      res,
      {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          trackingInfo: {
            trackingNumber,
            carrier,
            estimatedDelivery,
            trackingUrl,
          },
        },
      },
      "Tracking məlumatı əlavə edildi"
    );
  } catch (error) {
    console.error("Tracking əlavə etmə xətası:", error);
    return ApiResponse.error(
      res,
      "Tracking məlumatı əlavə edilərkən xəta baş verdi",
      500
    );
  }
});

// @desc    Admin - bütün sifarişlər
// @route   GET /api/orders/admin/all
// @access  Private (Admin)
const getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    let filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.customer) {
      filter.customer = req.query.customer;
    }

    if (req.query.vendor) {
      filter["vendorOrders.vendor"] = req.query.vendor;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.placedAt = {};
      if (req.query.startDate) {
        filter.placedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.placedAt.$lte = new Date(req.query.endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate("customer", "firstName lastName email phone")
      .populate("vendorOrders.vendor", "firstName lastName businessName email")
      .populate("vendorOrders.items.product", "name sku images")
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(filter);

    // Statistikalar
    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$pricing.total" },
        },
      },
    ]);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    console.log(`✅ ${total} admin sifarişi alındı`);

    ApiResponse.paginated(res, orders, pagination, "Bütün sifarişlər alındı", {
      stats,
      summary: {
        totalOrders: total,
        totalRevenue: stats.reduce((sum, stat) => sum + stat.totalAmount, 0),
      },
    });
  } catch (error) {
    console.error("Admin sifarişləri alma xətası:", error);
    return ApiResponse.error(res, "Sifarişlər alınarkən xəta baş verdi", 500);
  }
});

// @desc    Sifariş statistikası
// @route   GET /api/orders/stats
// @access  Private
const getOrderTracking = asyncHandler(async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('vendorOrders.vendor', 'firstName lastName businessName')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // İcazə yoxlaması
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu sifarişə çıxış icazəniz yoxdur'
      });
    }

    if (req.user.role === 'vendor') {
      const hasVendorOrder = order.vendorOrders.some(
        vo => vo.vendor._id.toString() === req.user.id
      );
      if (!hasVendorOrder) {
        return res.status(403).json({
          success: false,
          message: 'Bu sifarişə çıxış icazəniz yoxdur'
        });
      }
    }

    const trackingInfo = {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt
      },
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      tracking: order.tracking,
      vendorOrders: order.vendorOrders.map(vo => ({
        id: vo._id,
        vendor: vo.vendor,
        status: vo.status,
        vendorOrderNumber: vo.vendorOrderNumber,
        tracking: vo.tracking,
        items: vo.items
      }))
    };

    console.log(`✅ Tracking məlumatı alındı: ${order.orderNumber} - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Tracking məlumatı alındı',
      data: trackingInfo
    });

  } catch (error) {
    console.error('Tracking məlumatı alma xətası:', error);
    res.status(500).json({
      success: false,
      message: 'Tracking məlumatı alınarkən xəta baş verdi'
    });
  }
});
const getOrderStats = asyncHandler(async (req, res) => {
  try {
    let matchStage = {};

    // Role-a görə filtrlə
    if (req.user.role === "customer") {
      matchStage.customer = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === "vendor") {
      matchStage["vendorOrders.vendor"] = new mongoose.Types.ObjectId(
        req.user.id
      );
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$pricing.total" },
          avgAmount: { $avg: "$pricing.total" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments(matchStage);
    const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);

    // Son 30 günün trendini al
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await Order.aggregate([
      {
        $match: {
          ...matchStage,
          placedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log(
      `✅ Sifariş statistikası alındı - İstifadəçi: ${req.user.email}`
    );

    ApiResponse.success(
      res,
      {
        overview: {
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgOrderValue:
            totalOrders > 0
              ? Math.round((totalRevenue / totalOrders) * 100) / 100
              : 0,
        },
        statusBreakdown: stats,
        dailyTrend: dailyStats,
      },
      "Sifariş statistikası alındı"
    );
  } catch (error) {
    console.error("Statistika xətası:", error);
    return ApiResponse.error(res, "Statistika alınarkən xəta baş verdi", 500);
  }
});


// @desc    Tracking nömrəsi ilə sifariş tap
// @route   GET /api/orders/track/:trackingNumber  
// @access  Public
const trackByNumber = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;

  try {
    const order = await Order.findOne({
      $or: [
        { 'tracking.trackingNumber': trackingNumber.toUpperCase() },
        { 'vendorOrders.tracking.trackingNumber': trackingNumber.toUpperCase() }
      ]
    })
    .populate('customer', 'firstName lastName')
    .populate('vendorOrders.vendor', 'businessName')
    .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bu tracking nömrəsi ilə sifariş tapılmadı'
      });
    }

    // Public məlumat (məhdud)
    const publicTrackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,
      tracking: order.tracking ? {
        trackingNumber: order.tracking.trackingNumber,
        carrier: order.tracking.carrier,
        currentStatus: order.tracking.currentStatus,
        trackingHistory: order.tracking.trackingHistory.map(h => ({
          status: h.status,
          description: h.description,
          timestamp: h.timestamp,
          location: h.location
        }))
      } : null,
      vendorOrders: order.vendorOrders
        .filter(vo => vo.tracking?.trackingNumber === trackingNumber.toUpperCase())
        .map(vo => ({
          vendor: vo.vendor?.businessName,
          status: vo.status,
          tracking: {
            trackingNumber: vo.tracking.trackingNumber,
            carrier: vo.tracking.carrier,
            currentStatus: vo.tracking.currentStatus,
            trackingHistory: vo.tracking.trackingHistory.map(h => ({
              status: h.status,
              description: h.description,
              timestamp: h.timestamp,
              location: h.location
            }))
          }
        }))
    };

    console.log(`✅ Tracking tapıldı: ${trackingNumber} - Sifariş: ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Tracking məlumatı tapıldı',
      data: publicTrackingInfo
    });

  } catch (error) {
    console.error('Tracking tapma xətası:', error);
    res.status(500).json({
      success: false,
      message: 'Tracking məlumatı axtarılarkən xəta baş verdi'
    });
  }
});

// @desc    Tracking məlumatı əlavə et/yenilə
// @route   PUT /api/orders/:id/tracking
// @access  Private (Vendor/Admin)
const updateTracking = asyncHandler(async (req, res) => {
  const { 
    trackingNumber, 
    carrier, 
    carrierName,
    trackingUrl, 
    estimatedDelivery,
    deliveryInstructions,
    vendorOrderId 
  } = req.body;

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // İcazə yoxlaması
    if (req.user.role === 'vendor') {
      const hasVendorOrder = order.vendorOrders.some(
        vo => vo.vendor.toString() === req.user.id
      );
      if (!hasVendorOrder) {
        return res.status(403).json({
          success: false,
          message: 'Bu sifarişə çıxış icazəniz yoxdur'
        });
      }
    }

    const trackingData = {
      trackingNumber,
      carrier,
      carrierName: carrierName || carrier,
      trackingUrl,
      currentStatus: 'shipped',
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      lastUpdated: new Date(),
      deliveryInstructions,
      trackingHistory: [{
        status: 'shipped',
        description: 'Məhsul göndərildi',
        timestamp: new Date(),
        updatedBy: req.user.role
      }]
    };

    if (vendorOrderId) {
      // Vendor order tracking
      const vendorOrder = order.vendorOrders.find(
        vo => vo._id.toString() === vendorOrderId
      );
      
      if (!vendorOrder) {
        return res.status(404).json({
          success: false,
          message: 'Vendor sifarişi tapılmadı'
        });
      }

      vendorOrder.tracking = trackingData;
      vendorOrder.status = 'shipped';
      vendorOrder.shippedAt = new Date();

    } else {
      // Ümumi order tracking
      order.tracking = trackingData;
      order.status = 'shipped';
      order.shippedAt = new Date();
    }

    await order.save();

    console.log(`✅ Tracking əlavə edildi: ${order.orderNumber} - ${trackingNumber}`);

    res.status(200).json({
      success: true,
      message: 'Tracking məlumatı əlavə edildi',
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          tracking: order.tracking,
          status: order.status
        }
      }
    });

  } catch (error) {
    console.error('Tracking əlavə etmə xətası:', error);
    res.status(500).json({
      success: false,
      message: 'Tracking məlumatı əlavə edilərkən xəta baş verdi'
    });
  }
});

// @desc    Tracking status yenilə
// @route   PUT /api/orders/:id/tracking/status
// @access  Private (Vendor/Admin)
const updateTrackingStatus = asyncHandler(async (req, res) => {
  const { 
    status, 
    location, 
    description, 
    vendorOrderId 
  } = req.body;

  const validStatuses = [
    'shipped', 'in_transit', 'out_for_delivery', 
    'delivered', 'failed_delivery', 'returned'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Yanlış tracking status'
    });
  }

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    let trackingObj = order.tracking;

    if (vendorOrderId) {
      const vendorOrder = order.vendorOrders.find(
        vo => vo._id.toString() === vendorOrderId
      );
      trackingObj = vendorOrder?.tracking;
    }

    if (!trackingObj) {
      return res.status(400).json({
        success: false,
        message: 'Tracking məlumatı tapılmadı'
      });
    }

    // Status yenilə
    trackingObj.currentStatus = status;
    trackingObj.lastUpdated = new Date();

    if (status === 'delivered') {
      trackingObj.actualDelivery = new Date();
      order.status = 'delivered';
      order.deliveredAt = new Date();
    }

    // Tracking tarixçəsinə əlavə et
    const historyEntry = {
      status,
      timestamp: new Date(),
      description: description || getStatusDescription(status),
      updatedBy: req.user.role
    };

    if (location) {
      historyEntry.location = location;
    }

    trackingObj.trackingHistory.push(historyEntry);

    await order.save();

    console.log(`✅ Tracking status yeniləndi: ${order.orderNumber} - ${status}`);

    res.status(200).json({
      success: true,
      message: 'Tracking status yeniləndi',
      data: {
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          tracking: trackingObj,
          status: order.status
        }
      }
    });

  } catch (error) {
    console.error('Tracking status yeniləmə xətası:', error);
    res.status(500).json({
      success: false,
      message: 'Tracking status yenilənərkən xəta baş verdi'
    });
  }
});

// Helper function
function getStatusDescription(status) {
  const descriptions = {
    'shipped': 'Məhsul göndərildi',
    'in_transit': 'Yolda',
    'out_for_delivery': 'Çatdırılma üçün yolda',
    'delivered': 'Çatdırıldı',
    'failed_delivery': 'Çatdırılma uğursuz',
    'returned': 'Geri qaytarıldı'
  };
  return descriptions[status] || status;
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getVendorOrders,
  updateVendorOrderStatus,
  addTracking,
  getAllOrders,
  getOrderStats,
  trackByNumber,
  updateTracking,
  updateTrackingStatus,
  getOrderTracking

};
