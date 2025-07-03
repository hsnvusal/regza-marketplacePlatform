// models/Category.js - Slug validation problemi həlli
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategoriya adı tələb olunur'],
    trim: true,
    maxlength: [100, 'Kategoriya adı 100 simvoldan çox ola bilməz'],
    minlength: [2, 'Kategoriya adı ən azı 2 simvol olmalıdır']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
    // required: true - SILINDI, pre-save middleware-də yaradacağıq
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Təsvir 500 simvoldan çox ola bilməz']
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=Kategoriya'
  },
  icon: {
    type: String, // FontAwesome icon class
    default: 'fas fa-folder'
  },
  
  // Hierarchical structure
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  path: {
    type: String,
    default: ''
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  // SEO fields
  metaTitle: {
    type: String,
    maxlength: [160, 'Meta title 160 simvoldan çox ola bilməz']
  },
  metaDescription: {
    type: String,
    maxlength: [300, 'Meta description 300 simvoldan çox ola bilməz']
  },
  
  // Display options
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  showInMenu: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Color theme for UI
  color: {
    type: String,
    default: '#667eea'
  },
  
  // Statistics
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for child categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for products in this category
categorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category'
});

// Virtual for full path display
categorySchema.virtual('fullPath').get(function() {
  return this.path || this.slug;
});

// Indexes
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, showInMenu: 1 });
categorySchema.index({ isFeatured: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ ancestors: 1 });

// Text search index
categorySchema.index({ 
  name: 'text', 
  description: 'text',
  metaTitle: 'text',
  metaDescription: 'text'
});

// Helper function for slug creation
function createSlug(name) {
  if (!name) return '';
  
  return name
    .toString()
    .toLowerCase()
    .trim()
    // Azərbaycan hərflərini ingilis hərflərinə çevir
    .replace(/ə/g, 'e')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    // Xüsusi simvolları sil
    .replace(/[^a-z0-9\s-]/g, '')
    // Boşluqları tire ilə əvəz et
    .replace(/\s+/g, '-')
    // Çoxlu tireləri tək tirə et
    .replace(/-+/g, '-')
    // Başlanğıc və son tireləri sil
    .replace(/^-|-$/g, '');
}

// Pre-save middleware - create slug
categorySchema.pre('save', async function(next) {
  try {
    // Əgər yeni document-dirsə və ya name dəyişibsə
    if (this.isNew || this.isModified('name')) {
      if (!this.name) {
        return next(new Error('Kategoriya adı tələb olunur'));
      }
      
      let baseSlug = createSlug(this.name);
      
      if (!baseSlug) {
        return next(new Error('Kategoriya adından slug yaradıla bilmədi'));
      }
      
      let finalSlug = baseSlug;
      let counter = 1;
      
      // Unikal slug yaradın
      while (true) {
        const existingCategory = await this.constructor.findOne({ 
          slug: finalSlug,
          _id: { $ne: this._id } // Öz ID-sini istisna et (update zamanı)
        });
        
        if (!existingCategory) {
          break;
        }
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        
        // Sonsuz döngüdən qorunma
        if (counter > 100) {
          finalSlug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
      
      this.slug = finalSlug;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware - handle hierarchy
categorySchema.pre('save', async function(next) {
  try {
    if (this.isModified('parent') || this.isNew) {
      if (this.parent) {
        const parentCategory = await this.constructor.findById(this.parent);
        if (parentCategory) {
          this.level = parentCategory.level + 1;
          this.ancestors = [...parentCategory.ancestors, parentCategory._id];
          this.path = parentCategory.path ? `${parentCategory.path}/${this.slug}` : this.slug;
        } else {
          return next(new Error('Parent kategoriya tapılmadı'));
        }
      } else {
        this.level = 0;
        this.ancestors = [];
        this.path = this.slug;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware - update product count
categorySchema.post('save', async function() {
  try {
    await this.updateProductCount();
  } catch (error) {
    console.error('Product count update xətası:', error);
  }
});

// Instance method - update product count
categorySchema.methods.updateProductCount = async function() {
  try {
    // Bu method sonra Product model yaradıldıqdan sonra işə salınacaq
    // const Product = require('./Product');
    // const count = await Product.countDocuments({ 
    //   category: this._id,
    //   status: 'active' 
    // });
    // await this.constructor.findByIdAndUpdate(this._id, { productCount: count });
    
    console.log('Product count update - məhsul modeli hələ mövcud deyil');
  } catch (error) {
    console.error('updateProductCount xətası:', error);
  }
};

// Instance method - get all descendants
categorySchema.methods.getDescendants = async function() {
  return await this.constructor.find({
    ancestors: this._id,
    isActive: true
  }).sort({ level: 1, sortOrder: 1 });
};

// Instance method - get breadcrumb
categorySchema.methods.getBreadcrumb = async function() {
  if (this.ancestors.length === 0) {
    return [this];
  }
  
  const ancestors = await this.constructor.find({
    _id: { $in: this.ancestors }
  }).sort({ level: 1 });
  
  return [...ancestors, this];
};

// Static method - get category tree
categorySchema.statics.getTree = async function(parentId = null) {
  const categories = await this.find({
    parent: parentId,
    isActive: true,
    showInMenu: true
  })
  .sort({ sortOrder: 1, name: 1 })
  .lean();

  for (let category of categories) {
    category.children = await this.getTree(category._id);
  }

  return categories;
};

// Static method - get featured categories
categorySchema.statics.getFeatured = function(limit = 6) {
  return this.find({
    isFeatured: true,
    isActive: true
  })
  .sort({ sortOrder: 1, name: 1 })
  .limit(limit)
  .lean();
};

// Static method - search categories
categorySchema.statics.search = function(query, options = {}) {
  const {
    limit = 20,
    skip = 0,
    sortBy = 'name',
    sortOrder = 1
  } = options;

  const searchCriteria = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { $text: { $search: query } }
        ]
      }
    ]
  };

  return this.find(searchCriteria)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Validation middleware
categorySchema.pre('validate', function(next) {
  // Slug-ın mövcudluğunu yoxlayın
  if (!this.slug && this.name) {
    this.slug = createSlug(this.name);
  }
  
  if (!this.slug) {
    return next(new Error('Slug yaradıla bilmədi'));
  }
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);