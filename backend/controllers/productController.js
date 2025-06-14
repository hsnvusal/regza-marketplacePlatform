const Product = require('../models/Product');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Bütün məhsulları al (filterlə)
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Base filter - yalnız aktiv və görünən məhsullar
  let filter = { 
    status: 'active', 
    visibility: 'public' 
  };
  
  // Category filter
  if (req.query.category) {
    filter.category = req.query.category;
  }
  
  // Vendor filter
  if (req.query.vendor) {
    filter.vendor = req.query.vendor;
  }
  
  // Brand filter
  if (req.query.brand) {
    filter.brand = new RegExp(req.query.brand, 'i');
  }
  
  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    filter['pricing.sellingPrice'] = {};
    if (req.query.minPrice) {
      filter['pricing.sellingPrice'].$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filter['pricing.sellingPrice'].$lte = parseFloat(req.query.maxPrice);
    }
  }
  
  // Search filter
  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }
  
  // Featured filter
  if (req.query.featured === 'true') {
    filter.featured = true;
  }
  
  // New arrivals filter (son 30 gün)
  if (req.query.newArrivals === 'true') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.createdAt = { $gte: thirtyDaysAgo };
  }
  
  // In stock filter
  if (req.query.inStock === 'true') {
    filter.$or = [
      { 'inventory.stock': { $gt: 0 } },
      { 'inventory.allowBackorder': true },
      { 'inventory.trackQuantity': false }
    ];
  }

  // Sort options
  let sort = {};
  switch (req.query.sortBy) {
    case 'price_low':
      sort = { 'pricing.sellingPrice': 1 };
      break;
    case 'price_high':
      sort = { 'pricing.sellingPrice': -1 };
      break;
    case 'rating':
      sort = { 'ratings.average': -1, 'ratings.count': -1 };
      break;
    case 'popular':
      sort = { 'stats.purchases': -1, 'stats.views': -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'name_az':
      sort = { name: 1 };
      break;
    case 'name_za':
      sort = { name: -1 };
      break;
    case 'relevance':
      if (req.query.search) {
        sort = { score: { $meta: 'textScore' } };
      } else {
        sort = { featured: -1, 'ratings.average': -1 };
      }
      break;
    default:
      sort = { featured: -1, createdAt: -1 };
  }

  try {
    // Execute query
    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName businessName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Total count for pagination
    const total = await Product.countDocuments(filter);

    // Pagination info
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      productsPerPage: limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
      nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };

    // Filter summary
    const filterSummary = {
      category: req.query.category || null,
      vendor: req.query.vendor || null,
      brand: req.query.brand || null,
      priceRange: {
        min: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
        max: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null
      },
      search: req.query.search || null,
      sortBy: req.query.sortBy || 'default'
    };

    console.log(`✅ ${total} məhsul tapıldı, səhifə ${page}/${pagination.totalPages}`);

    ApiResponse.paginated(res, products, pagination, 'Məhsullar uğurla alındı', {
      filters: filterSummary,
      availableFilters: {
        categories: ['electronics', 'clothing', 'home-garden', 'books', 'gaming', 'beauty', 'sports'],
        sortOptions: ['price_low', 'price_high', 'rating', 'popular', 'newest', 'relevance']
      }
    });

  } catch (error) {
    console.error('Məhsul axtarış xətası:', error);
    return ApiResponse.error(res, 'Məhsullar alınarkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul detayı
// @route   GET /api/products/:id
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      status: 'active',
      visibility: 'public'
    })
    .populate('vendor', 'firstName lastName businessName email phone avatar')
    .lean();

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // Baxış sayını artır (async, response-u gözləmir)
    Product.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.views': 1 }
    }).exec();

    // Oxşar məhsulları tap (eyni kateqoriya, fərqli məhsul)
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: 'active',
      visibility: 'public'
    })
    .select('name pricing.sellingPrice pricing.discountPrice images ratings')
    .limit(6)
    .lean();

    console.log(`✅ Məhsul detalları alındı: ${product.name}`);

    ApiResponse.success(res, {
      product,
      relatedProducts,
      meta: {
        viewsIncremented: true,
        relatedCount: relatedProducts.length
      }
    }, 'Məhsul detalları uğurla alındı');

  } catch (error) {
    console.error('Məhsul detay xətası:', error);
    
    if (error.kind === 'ObjectId') {
      return ApiResponse.error(res, 'Yanlış məhsul ID formatı', 400);
    }
    
    return ApiResponse.error(res, 'Məhsul detalları alınarkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul yarat (Vendor/Admin üçün)
// @route   POST /api/products
// @access  Private (Vendor/Admin)
// Professional createProduct function - controllers/productController.js

const createProduct = asyncHandler(async (req, res) => {
  // 1. INPUT VALIDATION
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`❌ Validation xətaları: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({
      success: false,
      message: 'Məlumat doğrulaması uğursuz',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      })),
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 2. BUSINESS LOGIC VALIDATION
    let vendorId = req.user.id;
    
    // Admin fərqli vendor təyin edə bilər
    if (req.user.role === 'admin' && req.body.vendor) {
      const vendorExists = await User.findById(req.body.vendor);
      if (!vendorExists) {
        return res.status(404).json({
          success: false,
          message: 'Təyin edilən vendor tapılmadı',
          timestamp: new Date().toISOString()
        });
      }
      vendorId = req.body.vendor;
    }

    // 3. SKU UNIQUENESS CHECK
    if (req.body.sku) {
      const existingSKU = await Product.findOne({ 
        sku: req.body.sku.toUpperCase() 
      });
      if (existingSKU) {
        return res.status(409).json({
          success: false,
          message: 'Bu SKU artıq mövcuddur',
          conflictField: 'sku',
          conflictValue: req.body.sku,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 4. DATA PREPARATION
    const productData = {
      name: req.body.name?.trim(),
      description: req.body.description?.trim(),
      shortDescription: req.body.shortDescription?.trim(),
      category: req.body.category,
      subcategory: req.body.subcategory?.trim(),
      brand: req.body.brand?.trim(),
      model: req.body.model?.trim(),
      sku: req.body.sku?.toUpperCase().trim(),
      barcode: req.body.barcode?.trim(),
      vendor: vendorId,
      
      // Pricing with validation
      pricing: {
        costPrice: parseFloat(req.body.pricing?.costPrice || 0),
        sellingPrice: parseFloat(req.body.pricing?.sellingPrice || 0),
        discountPrice: req.body.pricing?.discountPrice ? 
          parseFloat(req.body.pricing.discountPrice) : undefined,
        currency: req.body.pricing?.currency || 'AZN',
        taxRate: parseFloat(req.body.pricing?.taxRate || 0)
      },
      
      // Inventory with defaults
      inventory: {
        stock: parseInt(req.body.inventory?.stock || 0),
        lowStockThreshold: parseInt(req.body.inventory?.lowStockThreshold || 10),
        trackQuantity: req.body.inventory?.trackQuantity !== false,
        allowBackorder: req.body.inventory?.allowBackorder === true,
        reservedQuantity: 0
      },
      
      // Images with validation
      images: req.body.images?.map((img, index) => ({
        url: img.url,
        alt: img.alt || req.body.name,
        isMain: index === 0 || img.isMain === true,
        order: img.order || index
      })) || [],
      
      // Optional fields
      shipping: req.body.shipping || {},
      attributes: req.body.attributes || [],
      variants: req.body.variants || [],
      seo: req.body.seo || {},
      
      // Status and visibility
      status: req.body.status || 'draft',
      visibility: req.body.visibility || 'public',
      featured: req.body.featured === true,
      newArrival: req.body.newArrival === true,
      bestSeller: req.body.bestSeller === false,
      
      // Digital product
      digitalProduct: req.body.digitalProduct || { isDigital: false },
      
      // Tags with cleanup
      tags: req.body.tags?.map(tag => tag.toLowerCase().trim()) || [],
      
      // Policies
      policies: req.body.policies || {},
      
      // Timestamps
      publishedAt: req.body.status === 'active' ? new Date() : undefined
    };

    // 5. BUSINESS RULES VALIDATION
    if (productData.pricing.discountPrice && 
        productData.pricing.discountPrice >= productData.pricing.sellingPrice) {
      return res.status(400).json({
        success: false,
        message: 'Endirim qiyməti satış qiymətindən az olmalıdır',
        timestamp: new Date().toISOString()
      });
    }

    // 6. CREATE PRODUCT
    const product = await Product.create(productData);

    // 7. POPULATE RESPONSE DATA
    const populatedProduct = await Product.findById(product._id)
      .populate('vendor', 'firstName lastName email businessName')
      .select('-__v')
      .lean();

    // 8. ACTIVITY LOGGING
    console.log(`✅ Məhsul yaradıldı: ${product.name} (${product.sku}) - Vendor: ${req.user.email}`);

    // 9. SUCCESS RESPONSE
    res.status(201).json({
      success: true,
      message: `Məhsul "${product.name}" uğurla yaradıldı`,
      data: {
        product: {
          id: populatedProduct._id,
          name: populatedProduct.name,
          slug: populatedProduct.slug,
          sku: populatedProduct.sku,
          category: populatedProduct.category,
          brand: populatedProduct.brand,
          pricing: populatedProduct.pricing,
          inventory: populatedProduct.inventory,
          status: populatedProduct.status,
          visibility: populatedProduct.visibility,
          featured: populatedProduct.featured,
          vendor: populatedProduct.vendor,
          images: populatedProduct.images,
          createdAt: populatedProduct.createdAt,
          updatedAt: populatedProduct.updatedAt
        },
        meta: {
          autoGeneratedSKU: !req.body.sku,
          imageCount: populatedProduct.images?.length || 0,
          hasMainImage: populatedProduct.images?.some(img => img.isMain) || false
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // 10. ERROR HANDLING
    console.error('❌ Məhsul yaratma xətası:', error);
    
    // Database constraint errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(409).json({
        success: false,
        message: `Bu ${field} artıq mövcuddur: ${value}`,
        errorType: 'DUPLICATE_KEY',
        field: field,
        value: value,
        timestamp: new Date().toISOString()
      });
    }
    
    // Validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
        kind: err.kind
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Məlumat doğrulaması uğursuz',
        errorType: 'VALIDATION_ERROR',
        errors: validationErrors,
        timestamp: new Date().toISOString()
      });
    }
    
    // Cast errors (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Yanlış ${error.path} formatı: ${error.value}`,
        errorType: 'INVALID_FORMAT',
        field: error.path,
        value: error.value,
        timestamp: new Date().toISOString()
      });
    }
    
    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Məhsul yaradılarkən server xətası baş verdi',
      errorType: 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.message 
      }),
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Məhsul yenilə
// @route   PUT /api/products/:id
// @access  Private (Vendor/Admin)
const updateProduct = asyncHandler(async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // Vendor yalnız öz məhsulunu yeniləyə bilər
    if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu məhsulu yeniləmək icazəniz yoxdur', 403);
    }

    // SKU dəyişdirilməyə çalışılırsa yoxla
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingSKU = await Product.findOne({ 
        sku: req.body.sku.toUpperCase(),
        _id: { $ne: product._id }
      });
      if (existingSKU) {
        return ApiResponse.error(res, 'Bu SKU artıq mövcuddur', 400);
      }
    }

    // Update fields
    const allowedFields = [
      'name', 'description', 'shortDescription', 'category', 'subcategory',
      'brand', 'model', 'sku', 'barcode', 'images', 'pricing', 'inventory',
      'shipping', 'attributes', 'variants', 'seo', 'status', 'visibility',
      'featured', 'newArrival', 'bestSeller', 'digitalProduct', 'tags',
      'expiresAt', 'policies'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('vendor', 'firstName lastName businessName email');

    console.log(`✅ Məhsul yeniləndi: ${product.name} (${product.sku})`);

    ApiResponse.success(res, {
      product,
      message: `Məhsul "${product.name}" uğurla yeniləndi`
    }, 'Məhsul uğurla yeniləndi');

  } catch (error) {
    console.error('Məhsul yeniləmə xətası:', error);
    
    if (error.kind === 'ObjectId') {
      return ApiResponse.error(res, 'Yanlış məhsul ID formatı', 400);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat doğrulaması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Məhsul yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul sil
// @route   DELETE /api/products/:id
// @access  Private (Vendor/Admin)
const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // Vendor yalnız öz məhsulunu silə bilər
    if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu məhsulu silmək icazəniz yoxdur', 403);
    }

    // Soft delete - statusu inactive et
    product.status = 'discontinued';
    product.visibility = 'hidden';
    await product.save();

    console.log(`✅ Məhsul silindi: ${product.name} (${product.sku})`);

    ApiResponse.success(res, {
      message: `Məhsul "${product.name}" uğurla silindi`
    }, 'Məhsul uğurla silindi');

  } catch (error) {
    console.error('Məhsul silmə xətası:', error);
    
    if (error.kind === 'ObjectId') {
      return ApiResponse.error(res, 'Yanlış məhsul ID formatı', 400);
    }
    
    return ApiResponse.error(res, 'Məhsul silinərkən xəta baş verdi', 500);
  }
});

// @desc    Vendor məhsulları
// @route   GET /api/products/vendor/my-products
// @access  Private (Vendor/Admin)
const getVendorProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    let vendorId = req.user.id;
    
    // Admin fərqli vendor məhsullarını görə bilər
    if (req.user.role === 'admin' && req.query.vendorId) {
      vendorId = req.query.vendorId;
    }

    // Filter
    let filter = { vendor: vendorId };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Sort
    let sort = { createdAt: -1 };
    if (req.query.sortBy === 'name') sort = { name: 1 };
    if (req.query.sortBy === 'price') sort = { 'pricing.sellingPrice': -1 };
    if (req.query.sortBy === 'stock') sort = { 'inventory.stock': -1 };

    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName businessName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);

    // Statistika
    const stats = await Product.aggregate([
      { $match: { vendor: mongoose.Types.ObjectId(vendorId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.sellingPrice' }
        }
      }
    ]);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    console.log(`✅ Vendor məhsulları alındı: ${total} məhsul`);

    ApiResponse.paginated(res, products, pagination, 'Vendor məhsulları alındı', {
      stats: stats,
      summary: {
        totalProducts: total,
        vendor: vendorId
      }
    });

  } catch (error) {
    console.error('Vendor məhsulları xətası:', error);
    return ApiResponse.error(res, 'Vendor məhsulları alınarkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul axtarış təklifləri
// @route   GET /api/products/search/suggestions
// @access  Public
const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return ApiResponse.error(res, 'Axtarış sorğusu ən azı 2 simvol olmalıdır', 400);
  }

  try {
    // Məhsul adları
    const productSuggestions = await Product.find({
      name: { $regex: q, $options: 'i' },
      status: 'active',
      visibility: 'public'
    })
    .select('name')
    .limit(5)
    .lean();

    // Brendlər
    const brandSuggestions = await Product.distinct('brand', {
      brand: { $regex: q, $options: 'i' },
      status: 'active',
      visibility: 'public'
    }).limit(3);

    // Kateqoriyalar
    const categorySuggestions = await Product.distinct('category', {
      category: { $regex: q, $options: 'i' },
      status: 'active',
      visibility: 'public'
    }).limit(3);

    const suggestions = {
      products: productSuggestions.map(p => p.name),
      brands: brandSuggestions,
      categories: categorySuggestions,
      query: q
    };

    ApiResponse.success(res, suggestions, 'Axtarış təklifləri alındı');

  } catch (error) {
    console.error('Axtarış təklifləri xətası:', error);
    return ApiResponse.error(res, 'Axtarış təklifləri alınarkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul stokunu yenilə
// @route   PATCH /api/products/:id/stock
// @access  Private (Vendor/Admin)
const updateStock = asyncHandler(async (req, res) => {
  const { action, quantity } = req.body;

  if (!action || !quantity || quantity <= 0) {
    return ApiResponse.error(res, 'Action və müsbət quantity tələb olunur', 400);
  }

  if (!['increase', 'decrease', 'set'].includes(action)) {
    return ApiResponse.error(res, 'Action increase, decrease və ya set ola bilər', 400);
  }

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // Vendor yalnız öz məhsulunun stokunu dəyişə bilər
    if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu məhsulun stokunu dəyişmək icazəniz yoxdur', 403);
    }

    const oldStock = product.inventory.stock;

    switch (action) {
      case 'increase':
        await product.increaseStock(quantity);
        break;
      case 'decrease':
        await product.decreaseStock(quantity);
        break;
      case 'set':
        product.inventory.stock = quantity;
        if (quantity === 0 && !product.inventory.allowBackorder) {
          product.status = 'out_of_stock';
        } else if (quantity > 0 && product.status === 'out_of_stock') {
          product.status = 'active';
        }
        await product.save();
        break;
    }

    console.log(`✅ Stok yeniləndi: ${product.name} (${oldStock} → ${product.inventory.stock})`);

    ApiResponse.success(res, {
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        oldStock,
        newStock: product.inventory.stock,
        status: product.status
      },
      action,
      quantity
    }, 'Stok uğurla yeniləndi');

  } catch (error) {
    console.error('Stok yeniləmə xətası:', error);
    return ApiResponse.error(res, 'Stok yenilənərkən xəta baş verdi', 500);
  }
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorProducts,
  getSearchSuggestions,
  updateStock
};