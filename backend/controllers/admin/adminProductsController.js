// controllers/admin/adminProductsController.js - CastError Problemi Həlli
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const User = require('../../models/User');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Admin - Bütün məhsulları gətir (filtered)
// @route   GET /api/admin/products
// @access  Private/Admin
const getProducts = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      vendor = '',
      status = '',
      featured = '',
      priceMin = '',
      priceMax = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    
    // Filter yaratma
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }
    
    // ✅ DÜZƏLİŞ: Category filtri - həm ObjectId həm string dəstəyi
// Category filter - DÜZƏLTMƏ
if (category && category !== 'all') {
  if (mongoose.Types.ObjectId.isValid(category)) {
    // Yeni Category ObjectId sistemi
    filter.category = category;
  } else {
    // Köhnə string-based category üçün axtarış
    try {
      const foundCategory = await Category.findOne({ 
        $or: [
          { name: { $regex: category, $options: 'i' } },
          { slug: category }
        ]
      });
      
      if (foundCategory) {
        filter.category = foundCategory._id;
      } else {
        // Legacy field-də axtarış
        filter.categoryLegacy = category;
      }
    } catch (err) {
      console.log('Category search error:', err.message);
      filter.categoryLegacy = category;
    }
  }
}
    
    if (vendor && vendor !== 'all') {
      if (mongoose.Types.ObjectId.isValid(vendor)) {
        filter.vendor = vendor;
      }
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (featured !== '' && featured !== 'all') {
      filter.featured = featured === 'true';
    }

    // Price range filter
    if (priceMin || priceMax) {
      filter['pricing.sellingPrice'] = {};
      if (priceMin) {
        filter['pricing.sellingPrice'].$gte = parseFloat(priceMin);
      }
      if (priceMax) {
        filter['pricing.sellingPrice'].$lte = parseFloat(priceMax);
      }
    }

    // Sort object yaratma
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortObject = {};
    
    // Pricing field-ləri üçün düzgün path
    if (sortBy === 'price') {
      sortObject['pricing.sellingPrice'] = sortDirection;
    } else if (sortBy === 'stock') {
      sortObject['inventory.stock'] = sortDirection;
    } else {
      sortObject[sortBy] = sortDirection;
    }

    console.log('✅ Fixed Filter:', JSON.stringify(filter, null, 2));
    console.log('✅ Sort:', JSON.stringify(sortObject, null, 2));

    // Məhsulları tap
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('vendor', 'firstName lastName businessName email')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Total sayı
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Statistics
    const stats = {
      total: await Product.countDocuments(),
      active: await Product.countDocuments({ status: 'active' }),
      draft: await Product.countDocuments({ status: 'draft' }),
      inactive: await Product.countDocuments({ status: 'inactive' }),
      pending: await Product.countDocuments({ status: 'pending' }),
      outOfStock: await Product.countDocuments({ status: 'out_of_stock' }),
      featured: await Product.countDocuments({ featured: true })
    };

    // ✅ DÜZƏLİŞ: Response structure-u frontend ilə uyğunlaşdır
    const response = {
      products,
      pagination: {
        totalProducts: total,
        currentPage: pageNum,
        totalPages: totalPages,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
        // Alternative keys for compatibility
        total: total,
        current: pageNum,
        pages: totalPages,
        hasPrev: pageNum > 1,
        hasNext: pageNum < totalPages
      },
      stats
    };

    console.log(`✅ Admin products fetched: ${products.length} of ${total} total`);

    ApiResponse.success(res, response, 'Məhsullar uğurla alındı');

  } catch (error) {
    console.error('❌ Admin məhsullar alma xətası:', error);
    return ApiResponse.error(res, 'Məhsullar alınarkən xəta baş verdi', 500);
  }
});

// ✅ Helper function - Category adı ilə ObjectId tap
async function getCategoryByName(categoryName) {
  try {
    const categories = await Category.find({
      name: { $regex: categoryName, $options: 'i' }
    }).select('_id');
    
    return categories.length > 0 ? 
      [{ category: { $in: categories.map(cat => cat._id) } }] : 
      [];
  } catch (error) {
    console.error('Category axtarış xətası:', error);
    return [];
  }
}

// @desc    Admin - Məhsul məlumatını gətir
// @route   GET /api/admin/products/:id
// @access  Private/Admin
const getProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('vendor', 'firstName lastName businessName email phone')
      .lean();

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    console.log(`✅ Admin product fetched: ${product.name}`);

    ApiResponse.success(res, { product }, 'Məhsul məlumatı uğurla alındı');

  } catch (error) {
    console.error('❌ Admin məhsul alma xətası:', error);
    return ApiResponse.error(res, 'Məhsul alınarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Məhsul statusunu dəyiş
// @route   PATCH /api/admin/products/:id/status
// @access  Private/Admin
const updateProductStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'inactive', 'pending', 'rejected', 'out_of_stock', 'discontinued'];
    
    if (!validStatuses.includes(status)) {
      return ApiResponse.error(res, 'Keçərsiz status', 400);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
    .populate('category', 'name slug')
    .populate('vendor', 'firstName lastName businessName email');

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    console.log(`✅ Admin tərəfindən məhsul statusu dəyişdi: ${product.name} -> ${status}`);

    ApiResponse.success(res, { product }, 'Məhsul statusu uğurla dəyişdirildi');

  } catch (error) {
    console.error('❌ Admin məhsul status dəyişmə xətası:', error);
    return ApiResponse.error(res, 'Status dəyişdirilərkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Məhsul stoqu yenilə
// @route   PATCH /api/admin/products/:id/stock
// @access  Private/Admin
const updateProductStock = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return ApiResponse.error(res, 'Stok sayı 0 və ya böyük rəqəm olmalıdır', 400);
    }

    const product = await Product.findById(id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // ✅ DÜZƏLİŞ: Stock update - həm yeni həm köhnə structure dəstəyi
    if (product.inventory) {
      product.inventory.stock = stock;
    } else {
      // Köhnə struktur üçün
      product.stock = stock;
    }

    // Auto status update based on stock
    if (stock === 0) {
      product.status = 'out_of_stock';
    } else if (product.status === 'out_of_stock') {
      product.status = 'active';
    }

    await product.save();

    const updatedProduct = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('vendor', 'firstName lastName businessName email');

    console.log(`✅ Admin tərəfindən məhsul stoqu yeniləndi: ${product.name} -> ${stock}`);

    ApiResponse.success(res, { product: updatedProduct }, 'Məhsul stoqu uğurla yeniləndi');

  } catch (error) {
    console.error('❌ Admin məhsul stok yeniləmə xətası:', error);
    return ApiResponse.error(res, 'Stok yenilənərkən xəta baş verdi', 500);
  }
});

// Rest of the methods remain the same...
const createProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumatlar düzgün deyil', 400, errors.array());
  }

  try {
    const productData = req.body;

    // Admin məhsul yaradarkən vendor field-ini manual təyin edə bilər
    if (!productData.vendor) {
      productData.vendor = req.user.id;
    }

    // Category yoxlanışı
    if (productData.category) {
      const categoryExists = await Category.findById(productData.category);
      if (!categoryExists) {
        return ApiResponse.error(res, 'Seçilən kategoriya mövcud deyil', 400);
      }
    }

    // Vendor yoxlanışı
    if (productData.vendor) {
      const vendorExists = await User.findById(productData.vendor);
      if (!vendorExists) {
        return ApiResponse.error(res, 'Seçilən satıcı mövcud deyil', 400);
      }
    }

    const product = await Product.create(productData);

    // Populated məlumatlarla geri qaytar
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('vendor', 'firstName lastName businessName email');

    console.log(`✅ Admin tərəfindən yeni məhsul yaradıldı: ${product.name}`);

    ApiResponse.success(res, { product: populatedProduct }, 'Məhsul uğurla yaradıldı', 201);

  } catch (error) {
    console.error('❌ Admin məhsul yaratma xətası:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return ApiResponse.error(res, `Bu ${field} artıq mövcuddur`, 400);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat yoxlanması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Məhsul yaradılarkən xəta baş verdi', 500);
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Category yoxlanışı
    if (updateData.category) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        return ApiResponse.error(res, 'Seçilən kategoriya mövcud deyil', 400);
      }
    }

    // Vendor yoxlanışı
    if (updateData.vendor) {
      const vendorExists = await User.findById(updateData.vendor);
      if (!vendorExists) {
        return ApiResponse.error(res, 'Seçilən satıcı mövcud deyil', 400);
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      {
        new: true,
        runValidators: true
      }
    )
    .populate('category', 'name slug')
    .populate('vendor', 'firstName lastName businessName email');

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    console.log(`✅ Admin tərəfindən məhsul yeniləndi: ${product.name}`);

    ApiResponse.success(res, { product }, 'Məhsul uğurla yeniləndi');

  } catch (error) {
    console.error('❌ Admin məhsul yeniləmə xətası:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return ApiResponse.error(res, `Bu ${field} artıq mövcuddur`, 400);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat yoxlanması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Məhsul yenilənərkən xəta baş verdi', 500);
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    await Product.findByIdAndDelete(id);

    console.log(`✅ Admin tərəfindən məhsul silindi: ${product.name}`);

    ApiResponse.success(res, {}, 'Məhsul uğurla silindi');

  } catch (error) {
    console.error('❌ Admin məhsul silmə xətası:', error);
    return ApiResponse.error(res, 'Məhsul silinərkən xəta baş verdi', 500);
  }
});

const toggleFeatured = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    product.featured = !product.featured;
    await product.save();

    console.log(`✅ Admin tərəfindən məhsul featured statusu dəyişdi: ${product.name} -> ${product.featured}`);

    ApiResponse.success(res, { 
      product: {
        _id: product._id,
        name: product.name,
        featured: product.featured
      }
    }, 'Featured status uğurla dəyişdirildi');

  } catch (error) {
    console.error('❌ Admin featured toggle xətası:', error);
    return ApiResponse.error(res, 'Featured status dəyişdirilərkən xəta baş verdi', 500);
  }
});

const bulkOperations = asyncHandler(async (req, res) => {
  try {
    const { action, productIds, data } = req.body;

    if (!action || !productIds || !Array.isArray(productIds)) {
      return ApiResponse.error(res, 'Tələb olunan parametrlər: action, productIds', 400);
    }

    let result;

    switch (action) {
      case 'delete':
        result = await Product.deleteMany({ _id: { $in: productIds } });
        break;
        
      case 'updateStatus':
        if (!data.status) {
          return ApiResponse.error(res, 'Status tələb olunur', 400);
        }
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { status: data.status, updatedAt: new Date() }
        );
        break;
        
      case 'toggleFeatured':
        const products = await Product.find({ _id: { $in: productIds } });
        for (let product of products) {
          product.featured = !product.featured;
          await product.save();
        }
        result = { modifiedCount: products.length };
        break;
        
      default:
        return ApiResponse.error(res, 'Keçərsiz əməliyyat', 400);
    }

    console.log(`✅ Admin bulk əməliyyat: ${action} - ${result.modifiedCount || result.deletedCount} məhsul`);

    ApiResponse.success(res, { 
      action,
      affectedCount: result.modifiedCount || result.deletedCount || 0
    }, 'Bulk əməliyyat uğurla tamamlandı');

  } catch (error) {
    console.error('❌ Admin bulk əməliyyat xətası:', error);
    return ApiResponse.error(res, 'Bulk əməliyyat zamanı xəta baş verdi', 500);
  }
});

const getProductStats = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Əsas statistikalar
    const basicStats = {
      total: await Product.countDocuments(),
      active: await Product.countDocuments({ status: 'active' }),
      draft: await Product.countDocuments({ status: 'draft' }),
      inactive: await Product.countDocuments({ status: 'inactive' }),
      pending: await Product.countDocuments({ status: 'pending' }),
      outOfStock: await Product.countDocuments({ status: 'out_of_stock' }),
      featured: await Product.countDocuments({ featured: true }),
      recentlyAdded: await Product.countDocuments({ 
        createdAt: { $gte: thirtyDaysAgo } 
      })
    };

    // ✅ DÜZƏLİŞ: Kateqoriya üzrə statistika - həm yeni həm köhnə sistem
    const categoryStats = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $addFields: {
          // Həm yeni həm köhnə category sistemi üçün
          categoryName: {
            $cond: {
              if: { $gt: [{ $size: '$categoryInfo' }, 0] },
              then: { $arrayElemAt: ['$categoryInfo.name', 0] },
              else: '$categoryLegacy'
            }
          }
        }
      },
      {
        $group: {
          _id: '$categoryName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Ən populyar məhsullar
    const popularProducts = await Product.find({ status: 'active' })
      .sort({ 'stats.views': -1 })
      .limit(5)
      .select('name stats.views stats.purchases pricing.sellingPrice')
      .lean();

    // Son əlavə edilən məhsullar
    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt')
      .populate('vendor', 'firstName lastName businessName')
      .lean();

    ApiResponse.success(res, {
      basicStats,
      categoryStats,
      popularProducts,
      recentProducts
    }, 'Məhsul statistikaları uğurla alındı');

  } catch (error) {
    console.error('❌ Admin məhsul statistika xətası:', error);
    return ApiResponse.error(res, 'Statistikalar alınarkən xəta baş verdi', 500);
  }
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  updateProductStock,
  toggleFeatured,
  bulkOperations,
  getProductStats
};