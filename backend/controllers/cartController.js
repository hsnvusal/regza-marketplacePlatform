const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    İstifadəçi səbətini al
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOrCreateCart(req.user.id);
    
    // Populate product details
    await cart.populate({
      path: 'items.product',
      select: 'name sku pricing.sellingPrice pricing.discountPrice images inventory.stock status visibility',
      populate: {
        path: 'vendor',
        select: 'firstName lastName businessName'
      }
    });

    // Check for expired or unavailable items
    const expiredItems = [];
    const validItems = [];

    cart.items.forEach(item => {
      if (!item.product || 
          item.product.status !== 'active' || 
          item.product.visibility !== 'public' ||
          (!item.product.isInStock && !item.product.inventory.allowBackorder)) {
        expiredItems.push(item);
      } else {
        validItems.push(item);
      }
    });

    // Remove expired items if any
    if (expiredItems.length > 0) {
      cart.items = validItems;
      await cart.save();
    }

    console.log(`✅ Səbət alındı: ${cart.summary.totalItems} məhsul - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Səbət uğurla alındı',
      data: {
        cart: {
          id: cart._id,
          items: cart.items,
          summary: cart.summary,
          appliedCoupons: cart.appliedCoupons,
          shippingInfo: cart.shippingInfo,
          status: cart.status,
          lastActivity: cart.lastActivity,
          expiresAt: cart.expiresAt
        },
        meta: {
          isEmpty: cart.isEmpty,
          itemCount: cart.itemCount,
          hasExpiredItems: expiredItems.length > 0,
          expiredItemsCount: expiredItems.length,
          uniqueVendors: cart.uniqueVendors.length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbət alma xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Səbət alınarkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbətə məhsul əlavə et
// @route   POST /api/cart/add
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  // Validation check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Məlumat doğrulaması uğursuz',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }

  const { productId, quantity = 1, variants = [], notes = '' } = req.body;

  try {
    // Product validation
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul hazırda satışda deyil',
        productStatus: product.status,
        timestamp: new Date().toISOString()
      });
    }

    if (product.visibility !== 'public') {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul əlçatan deyil',
        timestamp: new Date().toISOString()
      });
    }

    // Stock validation
    if (product.inventory.trackQuantity && 
        product.inventory.stock < quantity && 
        !product.inventory.allowBackorder) {
      return res.status(400).json({
        success: false,
        message: `Yetərli stok yoxdur. Mövcud: ${product.inventory.stock}`,
        availableStock: product.inventory.stock,
        requestedQuantity: quantity,
        timestamp: new Date().toISOString()
      });
    }

    // Get or create cart
    const cart = await Cart.findOrCreateCart(req.user.id);

    // Add item to cart
    await cart.addItem(productId, quantity, variants, notes);

    // Populate for response
    await cart.populate({
      path: 'items.product',
      select: 'name sku pricing.sellingPrice pricing.discountPrice images',
      populate: {
        path: 'vendor',
        select: 'firstName lastName businessName'
      }
    });

    const addedItem = cart.items[cart.items.length - 1];

    console.log(`✅ Məhsul səbətə əlavə edildi: ${product.name} (${quantity}x) - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `"${product.name}" səbətə əlavə edildi`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          totalItems: cart.summary.totalItems,
          totalQuantity: cart.summary.totalQuantity,
          total: cart.summary.total
        },
        addedItem: {
          id: addedItem._id,
          product: addedItem.product,
          quantity: addedItem.quantity,
          unitPrice: addedItem.unitPrice,
          totalPrice: addedItem.totalPrice,
          selectedVariants: addedItem.selectedVariants,
          addedAt: addedItem.addedAt
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbətə əlavə etmə xətası:', error);
    
    if (error.message.includes('tapılmadı') || 
        error.message.includes('aktiv deyil') || 
        error.message.includes('stokda yoxdur')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Məhsul səbətə əlavə edilərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbətdən məhsul sil
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    const item = cart.items.find(item => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul səbətdə tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    const removedItemName = item.productSnapshot.name;

    // Remove item
    await cart.removeItem(itemId);

    console.log(`✅ Məhsul səbətdən silindi: ${removedItemName} - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `"${removedItemName}" səbətdən silindi`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          totalItems: cart.summary.totalItems,
          totalQuantity: cart.summary.totalQuantity,
          total: cart.summary.total
        },
        removedItemId: itemId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbətdən silmə xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Məhsul səbətdən silinərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbətdə miqdarı yenilə
// @route   PUT /api/cart/update/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  // Validation
  if (!quantity || quantity < 0 || quantity > 100) {
    return res.status(400).json({
      success: false,
      message: 'Miqdar 1-100 arası olmalıdır',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    const item = cart.items.find(item => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul səbətdə tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    // Check stock if increasing quantity
    if (quantity > item.quantity) {
      const product = await Product.findById(item.product);
      if (product && product.inventory.trackQuantity) {
        const availableStock = product.inventory.stock;
        if (availableStock < quantity && !product.inventory.allowBackorder) {
          return res.status(400).json({
            success: false,
            message: `Yetərli stok yoxdur. Mövcud: ${availableStock}`,
            availableStock,
            requestedQuantity: quantity,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const oldQuantity = item.quantity;

    // Update quantity
    if (quantity === 0) {
      await cart.removeItem(itemId);
    } else {
      await cart.updateQuantity(itemId, quantity);
    }

    const action = quantity === 0 ? 'silindi' : 
                  quantity > oldQuantity ? 'artırıldı' : 'azaldıldı';

    console.log(`✅ Səbət məhsulu yeniləndi: ${item.productSnapshot.name} (${oldQuantity} → ${quantity}) - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Məhsul miqdarı ${action}`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          totalItems: cart.summary.totalItems,
          totalQuantity: cart.summary.totalQuantity,
          total: cart.summary.total
        },
        updatedItem: quantity > 0 ? {
          id: itemId,
          quantity: quantity,
          oldQuantity: oldQuantity,
          totalPrice: item.unitPrice * quantity
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbət yeniləmə xətası:', error);
    
    if (error.message.includes('tapılmadı')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Səbət yenilənərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbəti təmizlə
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    const itemCount = cart.summary.totalItems;
    
    await cart.clearCart();

    console.log(`✅ Səbət təmizləndi: ${itemCount} məhsul silindi - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Səbət təmizləndi (${itemCount} məhsul silindi)`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          totalItems: 0,
          totalQuantity: 0,
          total: 0
        },
        clearedItemsCount: itemCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbət təmizləmə xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Səbət təmizlənərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Kupon tətbiq et
// @route   POST /api/cart/apply-coupon
// @access  Private
const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    return res.status(400).json({
      success: false,
      message: 'Kupon kodu daxil edilməlidir',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    
    if (!cart || cart.isEmpty) {
      return res.status(400).json({
        success: false,
        message: 'Səbət boşdur və ya tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    // Simple coupon validation (sonra Coupon model əlavə edəcəyik)
    const validCoupons = {
      'WELCOME10': { discountType: 'percentage', discountAmount: 10 },
      'SAVE20': { discountType: 'fixed_amount', discountAmount: 20 },
      'FREESHIP': { discountType: 'fixed_amount', discountAmount: 10 }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Etibarsız kupon kodu',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((cart.summary.subtotal * coupon.discountAmount / 100) * 100) / 100;
    } else {
      discountAmount = coupon.discountAmount;
    }

    // Apply coupon
    await cart.applyCoupon(couponCode.toUpperCase(), discountAmount, coupon.discountType);

    console.log(`✅ Kupon tətbiq edildi: ${couponCode} (-${discountAmount} AZN) - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Kupon "${couponCode}" uğurla tətbiq edildi`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          appliedCoupons: cart.appliedCoupons
        },
        appliedCoupon: {
          code: couponCode.toUpperCase(),
          discountType: coupon.discountType,
          discountAmount: discountAmount,
          savings: discountAmount
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kupon tətbiq etmə xətası:', error);
    
    if (error.message.includes('artıq tətbiq edilib')) {
      return res.status(400).json({
        success: false,
        message: 'Bu kupon artıq tətbiq edilib',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Kupon tətbiq edilərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Kupon sil
// @route   DELETE /api/cart/remove-coupon/:couponCode
// @access  Private
const removeCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.params;

  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    const existingCoupon = cart.appliedCoupons.find(c => c.code === couponCode.toUpperCase());
    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Bu kupon səbətdə tapılmadı',
        timestamp: new Date().toISOString()
      });
    }

    await cart.removeCoupon(couponCode.toUpperCase());

    console.log(`✅ Kupon silindi: ${couponCode} - İstifadəçi: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Kupon "${couponCode}" silindi`,
      data: {
        cart: {
          id: cart._id,
          summary: cart.summary,
          appliedCoupons: cart.appliedCoupons
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kupon silmə xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Kupon silinərkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbət məlumatları (summary only)
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' })
      .select('summary appliedCoupons status lastActivity');
    
    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'Səbət boşdur',
        data: {
          summary: {
            totalItems: 0,
            totalQuantity: 0,
            subtotal: 0,
            tax: 0,
            shipping: 0,
            discount: 0,
            total: 0,
            currency: 'AZN'
          },
          appliedCoupons: [],
          isEmpty: true
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Səbət məlumatları alındı',
      data: {
        summary: cart.summary,
        appliedCoupons: cart.appliedCoupons,
        isEmpty: cart.isEmpty,
        lastActivity: cart.lastActivity
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbət məlumatları alma xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Səbət məlumatları alınarkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Səbət statistikası (admin üçün)
// @route   GET /api/cart/stats
// @access  Private (Admin)
const getCartStats = asyncHandler(async (req, res) => {
  try {
    const stats = await Cart.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgTotal: { $avg: '$summary.total' },
          avgItems: { $avg: '$summary.totalItems' }
        }
      }
    ]);

    const totalCarts = await Cart.countDocuments();
    const activeCarts = await Cart.countDocuments({ status: 'active' });
    const abandonedCarts = await Cart.countDocuments({ status: 'abandoned' });
    
    const recentActivity = await Cart.find({ status: 'active' })
      .sort({ lastActivity: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email')
      .select('summary.total summary.totalItems lastActivity');

    console.log(`✅ Səbət statistikası alındı - Admin: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Səbət statistikası alındı',
      data: {
        overview: {
          totalCarts,
          activeCarts,
          abandonedCarts,
          abandonmentRate: totalCarts > 0 ? Math.round((abandonedCarts / totalCarts) * 100) : 0
        },
        statusBreakdown: stats,
        recentActivity: recentActivity
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Səbət statistikası xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Səbət statistikası alınarkən xəta baş verdi',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  getCartStats
};