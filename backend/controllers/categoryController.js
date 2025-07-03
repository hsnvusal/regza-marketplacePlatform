// controllers/categoryController.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Bütün kategoriyaları gətir
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      parent = null,
      featured = null,
      search = '',
      sortBy = 'sortOrder',
      sortOrder = 1
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Filter yaratma
    const filter = { isActive: true };
    
    if (parent !== null) {
      filter.parent = parent === 'null' ? null : parent;
    }
    
    if (featured !== null) {
      filter.isFeatured = featured === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Kategoriyaları tap
    const categories = await Category.find(filter)
      .sort({ [sortBy]: parseInt(sortOrder), name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('parent', 'name slug')
      .lean();

    // Total sayı
    const total = await Category.countDocuments(filter);

    // Hər kategoriya üçün məhsul sayını əlavə et
    for (let category of categories) {
      const productCount = await Product.countDocuments({
        category: category._id,
        status: 'active',
        visibility: 'public'
      });
      category.productCount = productCount;
    }

    ApiResponse.success(res, {
      categories,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }, 'Kategoriyalar uğurla alındı');

  } catch (error) {
    console.error('Kategoriyalar alma xətası:', error);
    return ApiResponse.error(res, 'Kategoriyalar alınarkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriya ağacını gətir (hierarchical)
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = asyncHandler(async (req, res) => {
  try {
    const buildTree = async (parentId = null, level = 0) => {
      const categories = await Category.find({
        parent: parentId,
        isActive: true,
        showInMenu: true
      })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

      const result = [];
      
      for (let category of categories) {
        // Məhsul sayını əlavə et
        const productCount = await Product.countDocuments({
          category: category._id,
          status: 'active',
          visibility: 'public'
        });
        
        const categoryWithChildren = {
          ...category,
          level,
          productCount,
          children: await buildTree(category._id, level + 1)
        };
        
        result.push(categoryWithChildren);
      }
      
      return result;
    };

    const tree = await buildTree();

    ApiResponse.success(res, { 
      tree,
      count: tree.length 
    }, 'Kategoriya ağacı uğurla alındı');

  } catch (error) {
    console.error('Kategoriya ağacı xətası:', error);
    return ApiResponse.error(res, 'Kategoriya ağacı alınarkən xəta baş verdi', 500);
  }
});

// @desc    Xüsusi kategoriyaları gətir (featured)
// @route   GET /api/categories/featured
// @access  Public
const getFeaturedCategories = asyncHandler(async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const categories = await Category.find({
      isFeatured: true,
      isActive: true
    })
    .sort({ sortOrder: 1, name: 1 })
    .limit(parseInt(limit))
    .lean();

    // Hər kategoriya üçün məhsul sayını əlavə et
    for (let category of categories) {
      const productCount = await Product.countDocuments({
        category: category._id,
        status: 'active',
        visibility: 'public'
      });
      category.productCount = productCount;
    }

    ApiResponse.success(res, { 
      categories,
      count: categories.length 
    }, 'Seçilmiş kategoriyalar uğurla alındı');

  } catch (error) {
    console.error('Seçilmiş kategoriyalar xətası:', error);
    return ApiResponse.error(res, 'Seçilmiş kategoriyalar alınarkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriya məlumatını gətir
// @route   GET /api/categories/:slug
// @access  Public
const getCategory = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ 
      slug, 
      isActive: true 
    })
    .populate('parent', 'name slug')
    .lean();

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    // Alt kategoriyaları tap
    const children = await Category.find({
      parent: category._id,
      isActive: true
    })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

    // Bu kategoriyada məhsul sayını tap
    const productCount = await Product.countDocuments({
      category: category._id,
      status: 'active',
      visibility: 'public'
    });

    // Breadcrumb üçün yol
    const breadcrumb = [];
    if (category.ancestors && category.ancestors.length > 0) {
      const ancestors = await Category.find({
        _id: { $in: category.ancestors }
      })
      .sort({ level: 1 })
      .select('name slug level')
      .lean();
      
      breadcrumb.push(...ancestors);
    }
    breadcrumb.push(category);

    ApiResponse.success(res, {
      category: {
        ...category,
        productCount,
        children
      },
      breadcrumb
    }, 'Kategoriya məlumatı uğurla alındı');

  } catch (error) {
    console.error('Kategoriya alma xətası:', error);
    return ApiResponse.error(res, 'Kategoriya alınarkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriyaya aid məhsulları gətir
// @route   GET /api/categories/:slug/products
// @access  Public
const getCategoryProducts = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1,
      minPrice,
      maxPrice,
      brand,
      inStock = true
    } = req.query;

    // Kategoriya tap
    const category = await Category.findOne({ 
      slug, 
      isActive: true 
    });

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    const skip = (page - 1) * limit;
    
    // Product filter
    const productFilter = {
      category: category._id,
      status: 'active',
      visibility: 'public'
    };

    // Qiymət aralığı
    if (minPrice || maxPrice) {
      productFilter['pricing.sellingPrice'] = {};
      if (minPrice) productFilter['pricing.sellingPrice'].$gte = parseFloat(minPrice);
      if (maxPrice) productFilter['pricing.sellingPrice'].$lte = parseFloat(maxPrice);
    }

    // Marka filtri
    if (brand) {
      productFilter.brand = { $regex: brand, $options: 'i' };
    }

    // Stok filtri
    if (inStock === 'true') {
      productFilter['inventory.stock'] = { $gt: 0 };
    }

    // Məhsulları tap
    const products = await Product.find(productFilter)
      .select('name slug images pricing inventory ratings stats featured')
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(productFilter);

    // Filtər seçimlərini tap (sidebar üçün)
    const filters = {
      brands: await Product.distinct('brand', productFilter),
      priceRange: await Product.aggregate([
        { $match: productFilter },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$pricing.sellingPrice' },
            maxPrice: { $max: '$pricing.sellingPrice' }
          }
        }
      ])
    };

    ApiResponse.success(res, {
      products,
      category: {
        name: category.name,
        slug: category.slug,
        description: category.description
      },
      filters,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }, 'Kategoriya məhsulları uğurla alındı');

  } catch (error) {
    console.error('Kategoriya məhsulları xətası:', error);
    return ApiResponse.error(res, 'Kategoriya məhsulları alınarkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriya axtarışı
// @route   GET /api/categories/search
// @access  Public
const searchCategories = asyncHandler(async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return ApiResponse.error(res, 'Axtarış sorğusu ən azı 2 simvol olmalıdır', 400);
    }

    const categories = await Category.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { $text: { $search: q } }
          ]
        }
      ]
    })
    .select('name slug description image productCount')
    .sort({ productCount: -1, name: 1 })
    .limit(parseInt(limit))
    .lean();

    ApiResponse.success(res, {
      categories,
      query: q,
      count: categories.length
    }, 'Axtarış nəticələri uğurla alındı');

  } catch (error) {
    console.error('Kategoriya axtarışı xətası:', error);
    return ApiResponse.error(res, 'Axtarış zamanı xəta baş verdi', 500);
  }
});

// ==== ADMIN FUNCTIONS ====

// @desc    Yeni kategoriya yarat
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumatlar düzgün deyil', 400, errors.array());
  }

  try {
    const categoryData = req.body;

    // Slug yoxla
    if (categoryData.slug) {
      const existingCategory = await Category.findOne({ slug: categoryData.slug });
      if (existingCategory) {
        return ApiResponse.error(res, 'Bu slug artıq mövcuddur', 400);
      }
    }

    const category = await Category.create(categoryData);

    ApiResponse.success(res, { category }, 'Kategoriya uğurla yaradıldı', 201);

  } catch (error) {
    console.error('Kategoriya yaratma xətası:', error);
    
    if (error.code === 11000) {
      return ApiResponse.error(res, 'Bu adda kategoriya artıq mövcuddur', 400);
    }
    
    return ApiResponse.error(res, 'Kategoriya yaradılarkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriya yenilə
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    ApiResponse.success(res, { category }, 'Kategoriya uğurla yeniləndi');

  } catch (error) {
    console.error('Kategoriya yeniləmə xətası:', error);
    return ApiResponse.error(res, 'Kategoriya yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Kategoriya sil
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    // Bu kategoriyada məhsul var mı yoxla
    const productCount = await Product.countDocuments({
      category: category._id
    });

    if (productCount > 0) {
      return ApiResponse.error(res, 'Bu kategoriyada məhsullar mövcuddur. Əvvəlcə məhsulları köçürün', 400);
    }

    // Alt kategoriyalar var mı yoxla
    const childCount = await Category.countDocuments({ parent: id });

    if (childCount > 0) {
      return ApiResponse.error(res, 'Bu kategoriyada alt kategoriyalar mövcuddur', 400);
    }

    await Category.findByIdAndDelete(id);

    ApiResponse.success(res, {}, 'Kategoriya uğurla silindi');

  } catch (error) {
    console.error('Kategoriya silmə xətası:', error);
    return ApiResponse.error(res, 'Kategoriya silinərkən xəta baş verdi', 500);
  }
});

module.exports = {
  getCategories,
  getCategoryTree,
  getFeaturedCategories,
  getCategory,
  getCategoryProducts,
  searchCategories,
  createCategory,
  updateCategory,
  deleteCategory
};