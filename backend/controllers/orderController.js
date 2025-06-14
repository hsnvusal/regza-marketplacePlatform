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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Aktiv səbəti tap (populate olmadan)
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    }).session(session);

    if (!cart || cart.isEmpty) {
      await session.abortTransaction();
      return ApiResponse.error(res, "Səbət boş və ya tapılmadı", 400);
    }

    // 2. Səbət məhsullarını vendor-lərə görə qruplaşdır
    const vendorGroups = {};

    for (const item of cart.items) {
      // Məhsul məlumatını manual al
      const product = await Product.findById(item.product).session(session);

      // Məhsul mövcudluğunu yoxla
      if (!product || product.status !== "active") {
        await session.abortTransaction();
        return ApiResponse.error(
          res,
          `Məhsul "${item.productSnapshot.name}" artıq mövcud deyil`,
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
        await session.abortTransaction();
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

    // 4. Sifarişi yarat
    const orderData = {
      customer: req.user.id,

      // ORDER NUMBER ƏLAVƏ EDİN:
      orderNumber: `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}${Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, "0")}`,

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
        const tempOrderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        vendorOrder.vendorOrderNumber = `${tempOrderNumber}-${vendorSuffix}`;
      }
    });

    const order = new Order(orderData);
    await order.save({ session });

    // 5. Məhsul stoklarını azalt
    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);

      if (
        product &&
        product.inventory &&
        product.inventory.trackQuantity === true
      ) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              "inventory.stock": -item.quantity,
              "stats.purchases": item.quantity,
            },
          },
          { session }
        );

        console.log(
          `📦 Stok azaldıldı: ${product.name} - ${item.quantity} ədəd`
        );
      }
    }

    // 6. Səbəti converted et
    cart.status = "converted";
    await cart.save({ session });

    // 7. İstifadəçi statistikasını yenilə
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $inc: {
          "stats.totalOrders": 1,
          "stats.totalSpent": order.pricing.total,
        },
      },
      { session }
    );

    await session.commitTransaction();

    // 8. Populate məlumatları
    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "firstName lastName email phone")
      .populate("vendorOrders.vendor", "firstName lastName businessName email")
      .populate("vendorOrders.items.product", "name sku images");

    console.log(
      `✅ Sifariş yaradıldı: ${order.orderNumber} - Müştəri: ${req.user.email} - Məbləğ: ${order.pricing.total} AZN`
    );

    try {
      // 1. Müştəriyə order confirmation email
      await emailService.sendOrderConfirmationEmail(populatedOrder);
      console.log(
        `📧 Order confirmation email göndərildi: ${populatedOrder.customer.email}`
      );

      // 2. Vendor-lərə new order notification
      for (const vendorOrder of populatedOrder.vendorOrders) {
        if (vendorOrder.vendor && vendorOrder.vendor.email) {
          await emailService.sendVendorOrderEmail(
            vendorOrder.vendor.email,
            populatedOrder,
            vendorOrder
          );
          console.log(
            `📧 Vendor notification email göndərildi: ${vendorOrder.vendor.email}`
          );
        }
      }
    } catch (emailError) {
      console.error("📧 Order email xətası:", emailError.message);
      // Email xətası olsa da order yaradılmasına təsir etməsin
    }

    // 9. Response
    ApiResponse.success(
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
    // Session hələ də açıqdırsa abort et
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Sifariş yaratma xətası:", error);

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
    // Session hələ də açıqdırsa bağla
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
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
};
