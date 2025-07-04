const mongoose = require('mongoose');

// Enhanced tracking schema
const trackingSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  carrier: {
    type: String,
    enum: ['azerpost', 'bravo', 'express', 'pickup', 'other'],
    default: 'azerpost'
  },
  carrierName: {
    type: String,
    trim: true
  },
  trackingUrl: {
    type: String,
    trim: true
  },
  currentStatus: {
    type: String,
    enum: ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned'],
    default: 'shipped'
  },
  estimatedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  trackingHistory: [{
    status: {
      type: String,
      required: true
    },
    location: {
      city: String,
      address: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      trim: true
    },
    updatedBy: {
      type: String,
      enum: ['system', 'vendor', 'carrier', 'admin']
    }
  }],
  deliveryAttempts: [{
    attemptDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['failed', 'successful', 'rescheduled'],
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    nextAttempt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  deliveryInstructions: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

const orderSchema = new mongoose.Schema({
  // Order məlumatları
  orderNumber: {
    type: String,
    required: [true, 'Sifariş nömrəsi tələb olunur'],
    unique: true,
    uppercase: true
  },
  
  // Müştəri məlumatları
  customer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Müştəri məlumatı tələb olunur']
  },
  
  // Sifariş məhsulları (vendor-lərə görə qruplaşdırılır)
  vendorOrders: [{
    vendor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Vendor məlumatı tələb olunur']
    },
    vendorOrderNumber: {
      type: String,
      required: true
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
        min: [1, 'Miqdar ən azı 1 olmalıdır']
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
      
      // Məhsul snapshot (sifariş zamanı məhsul məlumatları)
      productSnapshot: {
        name: {
          type: String,
          required: true
        },
        sku: String,
        image: String,
        brand: String,
        category: String,
        description: String
      },
      
      // Seçilmiş variantlar
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
      
      // Item statusu
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
      },
      
      notes: {
        type: String,
        maxlength: [500, 'Qeyd 500 simvoldan çox ola bilməz']
      }
    }],
    
    // Vendor sifariş statusu
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending'
    },
    
    // Vendor sifariş məbləği
    subtotal: {
      type: Number,
      required: true,
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
    total: {
      type: Number,
      required: true,
      min: [0, 'Ümumi məbləğ mənfi ola bilməz']
    },
    
    // Enhanced vendor tracking
    tracking: trackingSchema,
    
    // Vendor qeydləri
    vendorNotes: {
      type: String,
      maxlength: [1000, 'Vendor qeydi 1000 simvoldan çox ola bilməz']
    },
    
    // Tarixlər
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date
  }],
  
  // Ümumi sifariş statusu
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'completed'],
    default: 'pending'
  },
  
  // Main order tracking (when there's a single package for all vendors)
  tracking: trackingSchema,
  
  // Ödəniş məlumatları
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery', 'crypto'],
      required: [true, 'Ödəniş metodu seçilməlidir']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Geri ödəmə məbləği mənfi ola bilməz']
    }
  },
  
  // Çatdırılma ünvanı
  shippingAddress: {
    firstName: {
      type: String,
      required: [true, 'Ad daxil edilməlidir'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Soyad daxil edilməlidir'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Telefon nömrəsi daxil edilməlidir']
    },
    email: {
      type: String,
      required: [true, 'Email daxil edilməlidir']
    },
    street: {
      type: String,
      required: [true, 'Küçə ünvanı daxil edilməlidir'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Şəhər daxil edilməlidir'],
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Ölkə daxil edilməlidir'],
      default: 'Azerbaijan'
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    deliveryInstructions: {
      type: String,
      maxlength: [500, 'Çatdırılma təlimatı 500 simvoldan çox ola bilməz']
    }
  },
  
  // Fatura ünvanı (şəxsi və ya şirkət)
  billingAddress: {
    type: {
      type: String,
      enum: ['personal', 'company'],
      default: 'personal'
    },
    // Şəxsi fatura üçün
    firstName: String,
    lastName: String,
    // Şirkət fatura üçün
    companyName: String,
    taxNumber: String,
    // Ümumi sahələr
    phone: String,
    email: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Azerbaijan'
    }
  },
  
  // Sifariş məbləği
  pricing: {
    subtotal: {
      type: Number,
      required: true,
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
      required: true,
      min: [0, 'Ümumi məbləğ mənfi ola bilməz']
    },
    currency: {
      type: String,
      enum: ['AZN', 'USD', 'EUR', 'TRY'],
      default: 'AZN'
    }
  },
  
  // Tətbiq edilmiş kuponlar
  appliedCoupons: [{
    code: {
      type: String,
      required: true,
      uppercase: true
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
    }
  }],
  
  // Sifariş qeydləri və tarixçə
  orderHistory: [{
    status: {
      type: String,
      required: true
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Müştəri qeydləri
  customerNotes: {
    type: String,
    maxlength: [1000, 'Müştəri qeydi 1000 simvoldan çox ola bilməz']
  },
  
  // Admin qeydləri
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin qeydi 1000 simvoldan çox ola bilməz']
  },
  
  // Xüsusi təlimatlar
  specialInstructions: {
    giftWrap: {
      type: Boolean,
      default: false
    },
    giftMessage: {
      type: String,
      maxlength: [500, 'Hədiyyə mesajı 500 simvoldan çox ola bilməz']
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal'
    }
  },
  
  // Təhvil tarixi istəyi
  requestedDeliveryDate: Date,
  
  // Sifariş mənbəyi
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'admin_panel', 'api'],
    default: 'web'
  },
  
  // IP və browser məlumatları
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    browserInfo: String
  },
  
  // Tarixlər
  placedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  refundedAt: Date
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
orderSchema.virtual('totalItems').get(function() {
  // Safety check - vendorOrders array-i mövcud olub-olmadığını yoxlayırıq
  if (!this.vendorOrders || !Array.isArray(this.vendorOrders)) {
    return 0;
  }
  
  return this.vendorOrders.reduce((total, vendorOrder) => {
    // Hər vendorOrder üçün də items array-i yoxlayırıq
    if (!vendorOrder.items || !Array.isArray(vendorOrder.items)) {
      return total;
    }
    return total + vendorOrder.items.length;
  }, 0);
});


orderSchema.virtual('totalQuantity').get(function() {
  // Safety check - vendorOrders array-i mövcud olub-olmadığını yoxlayırıq
  if (!this.vendorOrders || !Array.isArray(this.vendorOrders)) {
    return 0;
  }
  
  return this.vendorOrders.reduce((total, vendorOrder) => {
    // Hər vendorOrder üçün də items array-i yoxlayırıq
    if (!vendorOrder.items || !Array.isArray(vendorOrder.items)) {
      return total;
    }
    return total + vendorOrder.items.reduce((itemTotal, item) => {
      // Hər item üçün quantity yoxlaması
      const quantity = item?.quantity || 0;
      return itemTotal + quantity;
    }, 0);
  }, 0);
});

orderSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' || this.status === 'delivered';
});

orderSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'confirmed'].includes(this.status);
});

orderSchema.virtual('daysSinceOrdered').get(function() {
  const placedAt = this.placedAt || new Date();
  return Math.floor((Date.now() - placedAt) / (1000 * 60 * 60 * 24));
});

orderSchema.virtual('estimatedDelivery').get(function() {
  // En geç təhvil tarixini qaytarır - safety check ilə
  const deliveryDates = [];
  
  // VendorOrders-dan delivery dates topla
  if (this.vendorOrders && Array.isArray(this.vendorOrders)) {
    this.vendorOrders.forEach(vo => {
      if (vo.tracking && vo.tracking.estimatedDelivery) {
        deliveryDates.push(vo.tracking.estimatedDelivery);
      }
    });
  }
  
  // Main tracking-dən delivery date əlavə et
  if (this.tracking && this.tracking.estimatedDelivery) {
    deliveryDates.push(this.tracking.estimatedDelivery);
  }
  
  return deliveryDates.length > 0 ? new Date(Math.max(...deliveryDates)) : null;
});

// Əlavə virtual field - total amount hesablaması
orderSchema.virtual('totalAmount').get(function() {
  // Pricing object-indən total götür
  if (this.pricing && typeof this.pricing.total === 'number') {
    return this.pricing.total;
  }
  
  // Əgər pricing yoxdursa vendor orders-dan hesabla
  if (!this.vendorOrders || !Array.isArray(this.vendorOrders)) {
    return 0;
  }
  
  return this.vendorOrders.reduce((total, vendorOrder) => {
    const vendorTotal = vendorOrder?.total || 0;
    return total + vendorTotal;
  }, 0);
});

// Virtual field - vendor sayı
orderSchema.virtual('vendorCount').get(function() {
  if (!this.vendorOrders || !Array.isArray(this.vendorOrders)) {
    return 0;
  }
  return this.vendorOrders.length;
});

orderSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Safety checks
    if (!ret.vendorOrders) {
      ret.vendorOrders = [];
    }
    
    // Hər vendorOrder üçün items yoxlaması
    if (Array.isArray(ret.vendorOrders)) {
      ret.vendorOrders.forEach(vo => {
        if (!vo.items) {
          vo.items = [];
        }
      });
    }
    
    // Pricing object yoxlaması
    if (!ret.pricing) {
      ret.pricing = {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: 'AZN'
      };
    }
    
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

orderSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Safety checks
    if (!ret.vendorOrders) {
      ret.vendorOrders = [];
    }
    
    // Hər vendorOrder üçün items yoxlaması
    if (Array.isArray(ret.vendorOrders)) {
      ret.vendorOrders.forEach(vo => {
        if (!vo.items) {
          vo.items = [];
        }
      });
    }
    
    // Pricing object yoxlaması
    if (!ret.pricing) {
      ret.pricing = {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: 'AZN'
      };
    }
    
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ placedAt: -1 });
orderSchema.index({ 'vendorOrders.vendor': 1 });
orderSchema.index({ 'vendorOrders.status': 1 });

// Tracking indexes
orderSchema.index({ 'tracking.trackingNumber': 1 });
orderSchema.index({ 'vendorOrders.tracking.trackingNumber': 1 });
orderSchema.index({ 'tracking.currentStatus': 1 });
orderSchema.index({ 'vendorOrders.tracking.currentStatus': 1 });

// Compound indexes
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ 'vendorOrders.vendor': 1, 'vendorOrders.status': 1 });

// Pre-save middleware - order number yaratma
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${year}${month}-${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware - vendor order numbers yaratma
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.vendorOrders.forEach((vendorOrder, index) => {
      if (!vendorOrder.vendorOrderNumber) {
        const vendorSuffix = String.fromCharCode(65 + index); // A, B, C...
        vendorOrder.vendorOrderNumber = `${this.orderNumber}-${vendorSuffix}`;
      }
    });
  }
  next();
});

// Pre-save middleware - pricing hesablama
orderSchema.pre('save', function(next) {
  if (this.vendorOrders && this.vendorOrders.length > 0) {
    // Vendor orders məbləğlərini hesabla
    this.vendorOrders.forEach(vendorOrder => {
      vendorOrder.subtotal = vendorOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
      vendorOrder.tax = Math.round(vendorOrder.subtotal * 0.18 * 100) / 100;
      vendorOrder.shipping = vendorOrder.subtotal >= 100 ? 0 : 10;
      vendorOrder.total = vendorOrder.subtotal + vendorOrder.tax + vendorOrder.shipping;
    });
    
    // Ümumi məbləğləri hesabla
    this.pricing.subtotal = this.vendorOrders.reduce((sum, vo) => sum + vo.subtotal, 0);
    this.pricing.tax = this.vendorOrders.reduce((sum, vo) => sum + vo.tax, 0);
    this.pricing.shipping = this.vendorOrders.reduce((sum, vo) => sum + vo.shipping, 0);
    
    // Kupon endirimlərini tətbiq et
    this.pricing.discount = this.appliedCoupons.reduce((sum, coupon) => {
      return sum + coupon.discountAmount;
    }, 0);
    
    this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;
    this.pricing.total = Math.max(0, Math.round(this.pricing.total * 100) / 100);
  }
  
  next();
});

// Pre-save middleware - status dəyişikliyi zamanı tarix yeniləmə
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case 'shipped':
        if (!this.shippedAt) this.shippedAt = now;
        break;
      case 'delivered':
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
      case 'refunded':
        if (!this.refundedAt) this.refundedAt = now;
        break;
    }
    
    // Status tarixçəsini yenilə
    this.orderHistory.push({
      status: this.status,
      note: `Status dəyişdirildi: ${this.status}`,
      timestamp: now
    });
  }
  
  next();
});

// Static method - customer sifarişləri
orderSchema.statics.findByCustomer = function(customerId, options = {}) {
  const query = { customer: customerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('vendorOrders.vendor', 'firstName lastName businessName')
    .populate('vendorOrders.items.product', 'name sku images')
    .sort({ placedAt: -1 });
};

// Static method - vendor sifarişləri
orderSchema.statics.findByVendor = function(vendorId, options = {}) {
  const query = { 'vendorOrders.vendor': vendorId };
  
  if (options.status) {
    query['vendorOrders.status'] = options.status;
  }
  
  return this.find(query)
    .populate('customer', 'firstName lastName email phone')
    .populate('vendorOrders.items.product', 'name sku images')
    .sort({ placedAt: -1 });
};

// Instance method - sifarişi təsdiqlə
orderSchema.methods.confirmOrder = function() {
  this.status = 'confirmed';
  this.confirmedAt = new Date();
  
  // Vendor sifarişlərini də təsdiqlə
  this.vendorOrders.forEach(vendorOrder => {
    if (vendorOrder.status === 'pending') {
      vendorOrder.status = 'confirmed';
      vendorOrder.confirmedAt = new Date();
    }
  });
  
  return this.save();
};

// Instance method - sifarişi ləğv et
orderSchema.methods.cancelOrder = function(reason, cancelledBy) {
  if (!this.canBeCancelled) {
    throw new Error('Bu sifariş ləğv edilə bilməz');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  
  // Vendor sifarişlərini də ləğv et
  this.vendorOrders.forEach(vendorOrder => {
    if (['pending', 'confirmed'].includes(vendorOrder.status)) {
      vendorOrder.status = 'cancelled';
    }
  });
  
  this.orderHistory.push({
    status: 'cancelled',
    note: `Sifariş ləğv edildi. Səbəb: ${reason}`,
    updatedBy: cancelledBy,
    timestamp: new Date()
  });
  
  return this.save();
};

// Instance method - tracking məlumatı əlavə et
orderSchema.methods.addTracking = function(vendorId, trackingData) {
  const vendorOrder = this.vendorOrders.find(vo => vo.vendor.toString() === vendorId);
  
  if (!vendorOrder) {
    throw new Error('Vendor sifarişi tapılmadı');
  }
  
  vendorOrder.tracking = {
    ...vendorOrder.tracking,
    ...trackingData
  };
  
  if (trackingData.trackingNumber && vendorOrder.status === 'confirmed') {
    vendorOrder.status = 'shipped';
    vendorOrder.shippedAt = new Date();
  }
  
  return this.save();
};

// Instance method - tracking status yenilə
orderSchema.methods.updateTrackingStatus = function(trackingNumber, newStatus, location, description, updatedBy) {
  let updated = false;
  
  // Əsas order tracking yoxla
  if (this.tracking && this.tracking.trackingNumber === trackingNumber.toUpperCase()) {
    this.tracking.currentStatus = newStatus;
    this.tracking.lastUpdated = new Date();
    
    if (newStatus === 'delivered') {
      this.tracking.actualDelivery = new Date();
      this.status = 'delivered';
      this.deliveredAt = new Date();
    }
    
    this.tracking.trackingHistory.push({
      status: newStatus,
      location,
      description,
      timestamp: new Date(),
      updatedBy
    });
    
    updated = true;
  }
  
  // Vendor orders tracking yoxla
  this.vendorOrders.forEach(vendorOrder => {
    if (vendorOrder.tracking && vendorOrder.tracking.trackingNumber === trackingNumber.toUpperCase()) {
      vendorOrder.tracking.currentStatus = newStatus;
      vendorOrder.tracking.lastUpdated = new Date();
      
      if (newStatus === 'delivered') {
        vendorOrder.tracking.actualDelivery = new Date();
        vendorOrder.status = 'delivered';
        vendorOrder.deliveredAt = new Date();
      }
      
      vendorOrder.tracking.trackingHistory.push({
        status: newStatus,
        location,
        description,
        timestamp: new Date(),
        updatedBy
      });
      
      updated = true;
    }
  });
  
  if (updated) {
    return this.save();
  } else {
    throw new Error('Tracking nömrəsi tapılmadı');
  }
};

// Instance method - tracking nömrəsi axtarışı
orderSchema.methods.findTrackingByNumber = function(trackingNumber) {
  const upperTrackingNumber = trackingNumber.toUpperCase();
  
  // Əsas order tracking-də axtarış
  if (this.tracking && this.tracking.trackingNumber === upperTrackingNumber) {
    return {
      type: 'main',
      tracking: this.tracking
    };
  }
  
  // Vendor orders tracking-də axtarış
  for (let vendorOrder of this.vendorOrders) {
    if (vendorOrder.tracking && vendorOrder.tracking.trackingNumber === upperTrackingNumber) {
      return {
        type: 'vendor',
        vendorOrderId: vendorOrder._id,
        tracking: vendorOrder.tracking
      };
    }
  }
  
  return null;
};

module.exports = mongoose.model('Order', orderSchema);