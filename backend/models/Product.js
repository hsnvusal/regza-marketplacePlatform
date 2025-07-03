// models/Product.js - Vendor field optional edildi
const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Məhsul adı daxil edilməlidir'],
    trim: true,
    maxlength: [200, 'Məhsul adı 200 simvoldan çox ola bilməz'],
    minlength: [2, 'Məhsul adı ən azı 2 simvol olmalıdır']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Məhsul təsviri daxil edilməlidir'],
    maxlength: [2000, 'Təsvir 2000 simvoldan çox ola bilməz'],
    minlength: [10, 'Təsvir ən azı 10 simvol olmalıdır']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Qısa təsvir 500 simvoldan çox ola bilməz']
  },
  
  // UPDATED: Vendor məlumatı - Optional edildi
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false // DƏYIŞDI: artıq required deyil
  },
  
  // UPDATED: Kateqoriya məlumatı - Category model ilə əlaqə
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: false // Admin məhsul yaradarkən optional
  },
  // Köhnə category field-ini compatibility üçün saxlayırıq
  categoryLegacy: {
    type: String,
    enum: [
      'electronics',
      'clothing', 
      'home-garden',
      'books',
      'gaming',
      'beauty',
      'sports',
      'automotive',
      'food',
      'toys'
    ]
  },
  subcategories: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Category'
  }],
  
  // Marka və model
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Marka adı 100 simvoldan çox ola bilməz']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model 100 simvoldan çox ola bilməz']
  },
  
  // Unikal identifikatorlar
  sku: {
    type: String,
    required: [true, 'SKU daxil edilməlidir'],
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  
  // Şəkillər
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isMain: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Qiymət məlumatları
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Maya dəyəri daxil edilməlidir'],
      min: [0, 'Maya dəyəri mənfi ola bilməz']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Satış qiyməti daxil edilməlidir'],
      min: [0, 'Satış qiyməti mənfi ola bilməz']
    },
    discountPrice: {
      type: Number,
      min: [0, 'Endirim qiyməti mənfi ola bilməz'],
      validate: {
        validator: function(value) {
          return !value || value < this.pricing.sellingPrice;
        },
        message: 'Endirim qiyməti satış qiymətindən az olmalıdır'
      }
    },
    currency: {
      type: String,
      enum: ['AZN', 'USD', 'EUR', 'TRY'],
      default: 'AZN'
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Vergi dərəcəsi mənfi ola bilməz'],
      max: [100, 'Vergi dərəcəsi 100%-dən çox ola bilməz']
    }
  },
  
  // Anbar məlumatları
  inventory: {
    stock: {
      type: Number,
      required: [true, 'Stok miqdarı daxil edilməlidir'],
      min: [0, 'Stok miqdarı mənfi ola bilməz'],
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Az stok hədd mənfi ola bilməz']
    },
    trackQuantity: {
      type: Boolean,
      default: true
    },
    allowBackorder: {
      type: Boolean,
      default: false
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Rezerv miqdar mənfi ola bilməz']
    }
  },
  
  // Çatdırılma məlumatları
  shipping: {
    weight: {
      type: Number,
      min: [0, 'Çəki mənfi ola bilməz']
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, 'Uzunluq mənfi ola bilməz']
      },
      width: {
        type: Number,
        min: [0, 'En mənfi ola bilməz']
      },
      height: {
        type: Number,
        min: [0, 'Hündürlük mənfi ola bilməz']
      },
      unit: {
        type: String,
        enum: ['cm', 'inch'],
        default: 'cm'
      }
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'heavy', 'fragile', 'digital'],
      default: 'standard'
    }
  },
  
  // Məhsul xüsusiyyətləri
  attributes: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      trim: true
    }
  }],
  
  // Məhsul variantları (rəng, ölçü və s.)
  variants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      value: {
        type: String,
        required: true,
        trim: true
      },
      priceAdjustment: {
        type: Number,
        default: 0
      },
      stockAdjustment: {
        type: Number,
        default: 0
      },
      image: String
    }]
  }],
  
  // SEO məlumatları
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta başlıq 60 simvoldan çox ola bilməz']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta təsvir 160 simvoldan çox ola bilməz']
    },
    metaKeywords: [{
      type: String,
      trim: true
    }],
    canonicalUrl: String
  },
  
  // Məhsul statusu
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'out_of_stock', 'discontinued'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },
  
  // Xüsusi işarələmələr
  featured: {
    type: Boolean,
    default: false
  },
  newArrival: {
    type: Boolean,
    default: false
  },
  bestSeller: {
    type: Boolean,
    default: false
  },
  
  // Rəqəmsal məhsul
  digitalProduct: {
    isDigital: {
      type: Boolean,
      default: false
    },
    downloadUrl: String,
    downloadLimit: {
      type: Number,
      default: null
    },
    downloadExpiry: {
      type: Number,
      default: null
    }
  },
  
  // Reytinq və rəylər
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Reytinq 0-dan az ola bilməz'],
      max: [5, 'Reytinq 5-dən çox ola bilməz'],
      set: function(val) {
        return Math.round(val * 10) / 10; // 1 onluq dəqiqliyində
      }
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rəy sayı mənfi ola bilməz']
    },
    distribution: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },
  
  // Statistika
  stats: {
    views: {
      type: Number,
      default: 0,
      min: [0, 'Baxış sayı mənfi ola bilməz']
    },
    purchases: {
      type: Number,
      default: 0,
      min: [0, 'Alış sayı mənfi ola bilməz']
    },
    wishlistCount: {
      type: Number,
      default: 0,
      min: [0, 'Sevimlilər sayı mənfi ola bilməz']
    },
    cartAdditions: {
      type: Number,
      default: 0,
      min: [0, 'Səbət əlavələri mənfi ola bilməz']
    }
  },
  
  // Etiketlər və axtarış
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Tarix məlumatları
  publishedAt: Date,
  expiresAt: Date,
  
  // Məhsul qaydaları
  policies: {
    returnPolicy: {
      type: String,
      maxlength: [500, 'Qaytarma siyasəti 500 simvoldan çox ola bilməz']
    },
    warrantyPeriod: {
      type: Number,
      default: 0 // ay
    },
    ageRestriction: {
      type: Number,
      default: 0 // yaş
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual fields
productSchema.virtual('discountPercentage').get(function() {
  if (this.pricing.discountPrice && this.pricing.sellingPrice > 0) {
    return Math.round(((this.pricing.sellingPrice - this.pricing.discountPrice) / this.pricing.sellingPrice) * 100);
  }
  return 0;
});

productSchema.virtual('finalPrice').get(function() {
  return this.pricing.discountPrice || this.pricing.sellingPrice;
});

productSchema.virtual('isInStock').get(function() {
  if (!this.inventory.trackQuantity) return true;
  return this.inventory.stock > this.inventory.reservedQuantity || this.inventory.allowBackorder;
});

productSchema.virtual('isLowStock').get(function() {
  if (!this.inventory.trackQuantity) return false;
  return this.inventory.stock <= this.inventory.lowStockThreshold;
});

productSchema.virtual('profitMargin').get(function() {
  const finalPrice = this.finalPrice;
  if (finalPrice > 0 && this.pricing.costPrice >= 0) {
    return Math.round(((finalPrice - this.pricing.costPrice) / finalPrice) * 100);
  }
  return 0;
});

productSchema.virtual('mainImage').get(function() {
  const mainImg = this.images.find(img => img.isMain);
  return mainImg ? mainImg.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual - category populate
productSchema.virtual('categoryInfo', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

// Virtual - subcategories populate
productSchema.virtual('subcategoryInfo', {
  ref: 'Category',
  localField: 'subcategories',
  foreignField: '_id',
  justOne: false
});

// Virtual - vendor info (optional)
productSchema.virtual('vendorInfo', {
  ref: 'User',
  localField: 'vendor',
  foreignField: '_id',
  justOne: true
});

// Indexes for better performance
productSchema.index({ slug: 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ category: 1 });
productSchema.index({ categoryLegacy: 1 });
productSchema.index({ subcategories: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ status: 1 });
productSchema.index({ visibility: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ 'pricing.sellingPrice': 1 });
productSchema.index({ 'pricing.discountPrice': 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ 'stats.purchases': -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ publishedAt: -1 });
productSchema.index({ brand: 1 });
productSchema.index({ tags: 1 });

// Compound indexes
productSchema.index({ status: 1, visibility: 1 });
productSchema.index({ category: 1, 'pricing.sellingPrice': 1 });
productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ category: 1, status: 1, visibility: 1 });

// Text search index
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text',
  brand: 'text',
  'seo.metaKeywords': 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    brand: 3,
    description: 1
  }
});

// Pre-save middleware - slug yaratma
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }) + '-' + Date.now();
  }
  next();
});

// Pre-save middleware - SKU avtomatik yaratma (UPDATED for Category)
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.sku) {
    let prefix = 'PRD';
    
    // Yeni Category sistemi ilə
    if (this.category) {
      try {
        const Category = require('./Category');
        const categoryDoc = await Category.findById(this.category);
        if (categoryDoc) {
          prefix = categoryDoc.name.toUpperCase().slice(0, 3);
        }
      } catch (error) {
        console.log('Category prefix alma xətası:', error);
      }
    }
    // Köhnə sistem ilə
    else if (this.categoryLegacy) {
      prefix = this.categoryLegacy.toUpperCase().slice(0, 3);
    }
    
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.sku = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware - publishedAt tarixi
productSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Pre-save middleware - ana şəkil yoxlanması
productSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    const hasMainImage = this.images.some(img => img.isMain);
    if (!hasMainImage) {
      this.images[0].isMain = true;
    }
  }
  next();
});

// Static method - aktiv məhsulları tap
productSchema.statics.findActiveProducts = function(filter = {}) {
  return this.find({
    ...filter,
    status: 'active',
    visibility: 'public'
  });
};

// Static method - vendor məhsulları (optional vendor support)
productSchema.statics.findByVendor = function(vendorId, includeInactive = false) {
  const filter = { vendor: vendorId };
  if (!includeInactive) {
    filter.status = { $in: ['active', 'out_of_stock'] };
  }
  return this.find(filter);
};

// Static method - kateqoriya məhsulları
productSchema.statics.findByCategory = function(categoryId) {
  return this.findActiveProducts({ category: categoryId });
};

// Static method - legacy category support
productSchema.statics.findByCategoryLegacy = function(categoryLegacy) {
  return this.findActiveProducts({ categoryLegacy });
};

// Instance method - stok azalt
productSchema.methods.decreaseStock = function(quantity = 1) {
  if (this.inventory.trackQuantity) {
    this.inventory.stock = Math.max(0, this.inventory.stock - quantity);
    this.stats.purchases += quantity;
    
    if (this.inventory.stock === 0 && !this.inventory.allowBackorder) {
      this.status = 'out_of_stock';
    }
  }
  return this.save();
};

// Instance method - stok artır
productSchema.methods.increaseStock = function(quantity = 1) {
  if (this.inventory.trackQuantity) {
    this.inventory.stock += quantity;
    
    if (this.status === 'out_of_stock' && this.inventory.stock > 0) {
      this.status = 'active';
    }
  }
  return this.save();
};

// Instance method - baxış sayını artır
productSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);