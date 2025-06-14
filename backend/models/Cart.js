const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'İstifadəçi məlumatı tələb olunur'],
    unique: true // Hər istifadəçinin yalnız bir səbəti
  },
  
  items: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Məhsul seçilməlidir']
    },
    quantity: {
      type: Number,
      required: [true, 'Miqdar daxil edilməlidir'],
      min: [1, 'Miqdar ən azı 1 olmalıdır'],
      max: [100, 'Miqdar maksimum 100 ola bilər'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: [true, 'Vahid qiymət tələb olunur'],
      min: [0, 'Qiymət mənfi ola bilməz']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Ümumi qiymət tələb olunur'],
      min: [0, 'Ümumi qiymət mənfi ola bilməz']
    },
    currency: {
      type: String,
      enum: ['AZN', 'USD', 'EUR', 'TRY'],
      default: 'AZN'
    },
    
    // Məhsul snapshot (qiymət dəyişə bilər)
    productSnapshot: {
      name: {
        type: String,
        required: true
      },
      sku: String,
      image: String,
      brand: String,
      category: String,
      status: String,
      inStock: Boolean
    },
    
    // Seçilmiş variantlar (rəng, ölçü və s.)
    selectedVariants: [{
      name: {
        type: String,
        required: true
      },
      value: {
        type: String,
        required: true
      },
      priceAdjustment: {
        type: Number,
        default: 0
      }
    }],
    
    // Əlavə məlumatlar
    notes: {
      type: String,
      maxlength: [500, 'Qeyd 500 simvoldan çox ola bilməz']
    },
    
    // Tarix məlumatları
    addedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Səbət ümumi məlumatları
  summary: {
    totalItems: {
      type: Number,
      default: 0,
      min: [0, 'Ümumi item sayı mənfi ola bilməz']
    },
    totalQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Ümumi miqdar mənfi ola bilməz']
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Alt məbləğ mənfi ola bilməz']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Vergi mənfi ola bilməz']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Çatdırılma məbləği mənfi ola bilməz']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Endirim mənfi ola bilməz']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Ümumi məbləğ mənfi ola bilməz']
    },
    currency: {
      type: String,
      enum: ['AZN', 'USD', 'EUR', 'TRY'],
      default: 'AZN'
    }
  },
  
  // Kupon və endirim
  appliedCoupons: [{
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    discountAmount: {
      type: Number,
      required: true,
      min: [0, 'Endirim mənfi ola bilməz']
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Çatdırılma məlumatları
  shippingInfo: {
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'pickup'],
      default: 'standard'
    },
    estimatedDelivery: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'Azerbaijan'
      }
    }
  },
  
  // Səbət statusu
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'expired'],
    default: 'active'
  },
  
  // Session və tracking
  sessionId: String,
  userAgent: String,
  ipAddress: String,
  
  // Vaxt məhdudiyyəti (24 saat)
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
    },
    index: { expireAfterSeconds: 0 }
  },
  
  // Son fəaliyyət
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual fields
cartSchema.virtual('isEmpty').get(function() {
  return this.items.length === 0;
});

cartSchema.virtual('itemCount').get(function() {
  return this.items.length;
});

cartSchema.virtual('totalWeight').get(function() {
  return this.items.reduce((total, item) => {
    const weight = item.productSnapshot?.weight || 0;
    return total + (weight * item.quantity);
  }, 0);
});

cartSchema.virtual('hasExpiredItems').get(function() {
  return this.items.some(item => 
    item.productSnapshot?.status !== 'active' || 
    !item.productSnapshot?.inStock
  );
});

cartSchema.virtual('uniqueVendors').get(function() {
  const vendorIds = this.items.map(item => item.product?.vendor).filter(Boolean);
  return [...new Set(vendorIds.map(id => id.toString()))];
});

// Indexes for performance
cartSchema.index({ user: 1 });
cartSchema.index({ status: 1 });
cartSchema.index({ lastActivity: -1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ 'items.product': 1 });

// Compound indexes
cartSchema.index({ user: 1, status: 1 });

// Pre-save middleware - summary hesablama
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate totals
    this.summary.totalItems = this.items.length;
    this.summary.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.summary.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Tax calculation (18% default)
    this.summary.tax = Math.round(this.summary.subtotal * 0.18 * 100) / 100;
    
    // Shipping calculation (free over 100 AZN)
    this.summary.shipping = this.summary.subtotal >= 100 ? 0 : 10;
    
    // Apply discounts
    this.summary.discount = this.appliedCoupons.reduce((sum, coupon) => {
      return sum + coupon.discountAmount;
    }, 0);
    
    // Final total
    this.summary.total = this.summary.subtotal + this.summary.tax + this.summary.shipping - this.summary.discount;
    this.summary.total = Math.max(0, Math.round(this.summary.total * 100) / 100);
  } else {
    // Empty cart
    this.summary = {
      totalItems: 0,
      totalQuantity: 0,
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      currency: 'AZN'
    };
  }
  
  // Update last activity
  this.lastActivity = new Date();
  
  next();
});

// Pre-save middleware - item total price hesablama
cartSchema.pre('save', function(next) {
  this.items.forEach(item => {
    // Variant adjustments
    const variantAdjustment = item.selectedVariants.reduce((sum, variant) => {
      return sum + (variant.priceAdjustment || 0);
    }, 0);
    
    const finalUnitPrice = item.unitPrice + variantAdjustment;
    item.totalPrice = Math.round(finalUnitPrice * item.quantity * 100) / 100;
    item.updatedAt = new Date();
  });
  
  next();
});

// Static method - istifadəçi səbətini tap və ya yarat
cartSchema.statics.findOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId, status: 'active' })
    .populate('items.product', 'name sku pricing.sellingPrice pricing.discountPrice images inventory.stock status');
  
  if (!cart) {
    cart = await this.create({
      user: userId,
      items: [],
      status: 'active'
    });
  }
  
  return cart;
};

// Static method - expired carts təmizlə
cartSchema.statics.cleanupExpiredCarts = async function() {
  const result = await this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      status: 'active'
    },
    { 
      status: 'expired'
    }
  );
  
  console.log(`🧹 ${result.modifiedCount} expired cart cleaned up`);
  return result;
};

// Instance method - məhsul əlavə et
cartSchema.methods.addItem = async function(productId, quantity = 1, variants = [], notes = '') {
  const Product = require('./Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Məhsul tapılmadı');
  }
  
  if (product.status !== 'active') {
    throw new Error('Məhsul aktiv deyil');
  }
  
  if (!product.isInStock && !product.inventory.allowBackorder) {
    throw new Error('Məhsul stokda yoxdur');
  }
  
  // Existing item check
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId &&
    JSON.stringify(item.selectedVariants) === JSON.stringify(variants)
  );
  
  const finalPrice = product.finalPrice;
  
  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = 
      this.items[existingItemIndex].quantity * finalPrice;
    this.items[existingItemIndex].updatedAt = new Date();
  } else {
    // Add new item
    const newItem = {
      product: productId,
      quantity,
      unitPrice: finalPrice,
      totalPrice: quantity * finalPrice,
      currency: product.pricing.currency,
      productSnapshot: {
        name: product.name,
        sku: product.sku,
        image: product.mainImage,
        brand: product.brand,
        category: product.category,
        status: product.status,
        inStock: product.isInStock
      },
      selectedVariants: variants,
      notes,
      addedAt: new Date(),
      updatedAt: new Date()
    };
    
    this.items.push(newItem);
  }
  
  return this.save();
};

// Instance method - məhsul sil
cartSchema.methods.removeItem = function(itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId);
  return this.save();
};

// Instance method - miqdar yenilə
cartSchema.methods.updateQuantity = function(itemId, quantity) {
  const item = this.items.find(item => item._id.toString() === itemId);
  
  if (!item) {
    throw new Error('Məhsul səbətdə tapılmadı');
  }
  
  if (quantity <= 0) {
    return this.removeItem(itemId);
  }
  
  item.quantity = quantity;
  item.totalPrice = item.unitPrice * quantity;
  item.updatedAt = new Date();
  
  return this.save();
};

// Instance method - səbəti təmizlə
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupons = [];
  return this.save();
};

// Instance method - kupon tətbiq et
cartSchema.methods.applyCoupon = function(couponCode, discountAmount, discountType) {
  // Existing coupon check
  const existingCoupon = this.appliedCoupons.find(c => c.code === couponCode);
  if (existingCoupon) {
    throw new Error('Bu kupon artıq tətbiq edilib');
  }
  
  this.appliedCoupons.push({
    code: couponCode,
    discountAmount,
    discountType,
    appliedAt: new Date()
  });
  
  return this.save();
};

// Instance method - kupon sil
cartSchema.methods.removeCoupon = function(couponCode) {
  this.appliedCoupons = this.appliedCoupons.filter(c => c.code !== couponCode);
  return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);