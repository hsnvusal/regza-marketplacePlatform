// controllers/admin/adminCategoriesController.js
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const ApiResponse = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Admin - Bütün kategoriyaları gətir
// @route   GET /api/admin/categories
// @access  Private/Admin
const getCategories = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50, // Admin üçün daha çox limit
      search = '',
      parent = null,
      isActive = null,
      isFeatured = null,
      sortBy = 'sortOrder',
      sortOrder = 'asc'
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
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (parent !== null && parent !== '') {
      filter.parent = parent === 'null' ? null : parent;
    }
    
    if (isActive !== null && isActive !== '') {
      filter.isActive = isActive === 'true';
    }
    
    if (isFeatured !== null && isFeatured !== '') {
      filter.isFeatured = isFeatured === 'true';
    }

    // Sort object yaratma
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortObject = { [sortBy]: sortDirection };
    
    // Secondary sort
    if (sortBy !== 'name') {
      sortObject.name = 1;
    }

    // Kategoriyaları tap
    const categories = await Category.find(filter)
      .populate('parent', 'name slug level')
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Hər kategoriya üçün məhsul sayını və alt kategoriya sayını əlavə et
    for (let category of categories) {
      // Məhsul sayı (aktiv məhsullar)
      const productCount = await Product.countDocuments({
        category: category._id,
        status: 'active'
      });
      
      // Alt kategoriya sayı
      const childrenCount = await Category.countDocuments({
        parent: category._id
      });
      
      category.productCount = productCount;
      category.childrenCount = childrenCount;
    }

    // Total sayı
    const total = await Category.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Statistics
    const stats = {
      total: await Category.countDocuments(),
      active: await Category.countDocuments({ isActive: true }),
      inactive: await Category.countDocuments({ isActive: false }),
      featured: await Category.countDocuments({ isFeatured: true }),
      rootCategories: await Category.countDocuments({ parent: null }),
      withProducts: await Category.countDocuments({
        _id: { $in: await getCategoriesWithProducts() }
      })
    };

    const response = {
      categories,
      pagination: {
        totalCategories: total,
        currentPage: pageNum,
        totalPages: totalPages,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages
      },
      stats
    };

    console.log(`✅ Admin categories fetched: ${categories.length} of ${total} total`);

    ApiResponse.success(res, response, 'Kategoriyalar uğurla alındı');

  } catch (error) {
    console.error('❌ Admin kategoriyalar alma xətası:', error);
    return ApiResponse.error(res, 'Kategoriyalar alınarkən xəta baş verdi', 500);
  }
});

// Helper function - məhsulu olan kategoriyaları tap
async function getCategoriesWithProducts() {
  try {
    // MongoDB ObjectId formatında olan category field-ları tap
    const validCategories = await Product.aggregate([
      {
        $match: { 
          status: 'active',
          category: { 
            $ne: null,
            $type: 'objectId'  // Yalnız ObjectId tipində olan field-ları seç
          }
        }
      },
      {
        $group: {
          _id: '$category'
        }
      }
    ]);

    return validCategories.map(item => item._id);
  } catch (error) {
    console.error('Categories with products error:', error);
    return [];
  }
}

// @desc    Admin - Kategoriya tree (hierarchical)
// @route   GET /api/admin/categories/tree
// @access  Private/Admin
const getCategoryTree = asyncHandler(async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const buildTree = async (parentId = null, level = 0) => {
      const filter = { parent: parentId };
      
      if (!includeInactive) {
        filter.isActive = true;
      }

      const categories = await Category.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      const result = [];
      
      for (let category of categories) {
        // Məhsul sayını əlavə et
        const productCount = await Product.countDocuments({
          category: category._id,
          status: 'active'
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
    console.error('❌ Admin kategoriya ağacı xətası:', error);
    return ApiResponse.error(res, 'Kategoriya ağacı alınarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Kategoriya məlumatını gətir
// @route   GET /api/admin/categories/:id
// @access  Private/Admin
const getCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('parent', 'name slug level')
      .lean();

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    // Alt kategoriyaları tap
    const children = await Category.find({
      parent: category._id
    })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

    // Məhsul sayı
    const productCount = await Product.countDocuments({
      category: category._id
    });

    // Aktiv məhsul sayı
    const activeProductCount = await Product.countDocuments({
      category: category._id,
      status: 'active'
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
        activeProductCount,
        children
      },
      breadcrumb
    }, 'Kategoriya məlumatı uğurla alındı');

  } catch (error) {
    console.error('❌ Admin kategoriya alma xətası:', error);
    return ApiResponse.error(res, 'Kategoriya alınarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Yeni kategoriya yarat
// @route   POST /api/admin/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumatlar düzgün deyil', 400, errors.array());
  }

  try {
    const categoryData = req.body;

    // Parent kategoriya yoxlanışı
    if (categoryData.parent) {
      const parentCategory = await Category.findById(categoryData.parent);
      if (!parentCategory) {
        return ApiResponse.error(res, 'Parent kategoriya tapılmadı', 400);
      }
      
      // Çox dərin hierarchy-dən qorunma (max 5 level)
      if (parentCategory.level >= 4) {
        return ApiResponse.error(res, 'Maksimum 5 səviyyə kategoriya yarada bilərsiniz', 400);
      }
    }

    // Slug yoxla (manual təyin edilibsə)
    if (categoryData.slug) {
      const existingCategory = await Category.findOne({ 
        slug: categoryData.slug 
      });
      if (existingCategory) {
        return ApiResponse.error(res, 'Bu slug artıq mövcuddur', 400);
      }
    }

    const category = await Category.create(categoryData);
    
    // Populated məlumatlarla geri qaytar
    const populatedCategory = await Category.findById(category._id)
      .populate('parent', 'name slug level');

    console.log(`✅ Admin tərəfindən yeni kategoriya yaradıldı: ${category.name}`);

    ApiResponse.success(res, { category: populatedCategory }, 'Kategoriya uğurla yaradıldı', 201);

  } catch (error) {
    console.error('❌ Admin kategoriya yaratma xətası:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return ApiResponse.error(res, `Bu ${field} artıq mövcuddur`, 400);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat yoxlanması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Kategoriya yaradılarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Kategoriya yenilə
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    // Parent dəyişikliyi yoxlanışı
    if (updateData.parent && updateData.parent !== existingCategory.parent?.toString()) {
      // Özünü parent etməkdən qorunma
      if (updateData.parent === id) {
        return ApiResponse.error(res, 'Kategoriya özünü parent edə bilməz', 400);
      }

      // Alt kategoriyalarından birini parent etməkdən qorunma
      const descendants = await existingCategory.getDescendants();
      const descendantIds = descendants.map(cat => cat._id.toString());
      
      if (descendantIds.includes(updateData.parent)) {
        return ApiResponse.error(res, 'Alt kategoriya parent ola bilməz', 400);
      }

      // Yeni parent-in mövcudluğunu yoxla
      const newParent = await Category.findById(updateData.parent);
      if (!newParent) {
        return ApiResponse.error(res, 'Yeni parent kategoriya tapılmadı', 400);
      }

      // Dərinlik yoxlanışı
      if (newParent.level >= 4) {
        return ApiResponse.error(res, 'Maksimum 5 səviyyə kategoriya ola bilər', 400);
      }
    }

    // Slug yoxlanışı (dəyişilibsə)
    if (updateData.slug && updateData.slug !== existingCategory.slug) {
      const slugExists = await Category.findOne({ 
        slug: updateData.slug,
        _id: { $ne: id }
      });
      if (slugExists) {
        return ApiResponse.error(res, 'Bu slug artıq mövcuddur', 400);
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('parent', 'name slug level');

    console.log(`✅ Admin tərəfindən kategoriya yeniləndi: ${category.name}`);

    ApiResponse.success(res, { category }, 'Kategoriya uğurla yeniləndi');

  } catch (error) {
    console.error('❌ Admin kategoriya yeniləmə xətası:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return ApiResponse.error(res, `Bu ${field} artıq mövcuddur`, 400);
    }
    
    return ApiResponse.error(res, 'Kategoriya yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Kategoriya sil
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { forceDelete = false, moveProductsTo = null } = req.query;

    const category = await Category.findById(id);

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    // Bu kategoriyada məhsul sayını yoxla
    const productCount = await Product.countDocuments({
      category: category._id
    });

    // Alt kategoriya sayını yoxla
    const childCount = await Category.countDocuments({ 
      parent: id 
    });

    // Məhsulları başqa kategoriyaya köçür
    if (productCount > 0) {
      if (moveProductsTo) {
        const targetCategory = await Category.findById(moveProductsTo);
        if (!targetCategory) {
          return ApiResponse.error(res, 'Hədəf kategoriya tapılmadı', 400);
        }
        
        await Product.updateMany(
          { category: category._id },
          { category: moveProductsTo }
        );
        
        console.log(`✅ ${productCount} məhsul ${targetCategory.name} kategoriyasına köçürüldü`);
      } else if (!forceDelete) {
        return ApiResponse.error(res, 
          `Bu kategoriyada ${productCount} məhsul var. Əvvəlcə məhsulları köçürün və ya forceDelete=true istifadə edin`, 
          400
        );
      }
    }

    // Alt kategoriyaları parent-ə köçür və ya sil
    if (childCount > 0) {
      if (!forceDelete) {
        // Alt kategoriyaları bir səviyyə yuxarı köçür
        await Category.updateMany(
          { parent: id },
          { parent: category.parent || null }
        );
        
        console.log(`✅ ${childCount} alt kategoriya köçürüldü`);
      } else {
        // Bütün alt kategoriyaları və onların məhsullarını sil
        const descendants = await category.getDescendants();
        const descendantIds = descendants.map(cat => cat._id);
        
        await Product.deleteMany({ 
          category: { $in: [...descendantIds, category._id] } 
        });
        
        await Category.deleteMany({ 
          _id: { $in: descendantIds } 
        });
        
        console.log(`✅ ${descendants.length} alt kategoriya və məhsulları silindi`);
      }
    }

    // Əsas kategoriyani sil
    await Category.findByIdAndDelete(id);

    console.log(`✅ Admin tərəfindən kategoriya silindi: ${category.name}`);

    ApiResponse.success(res, {}, 'Kategoriya uğurla silindi');

  } catch (error) {
    console.error('❌ Admin kategoriya silmə xətası:', error);
    return ApiResponse.error(res, 'Kategoriya silinərkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Kategoriya statusunu dəyiş
// @route   PATCH /api/admin/categories/:id/status
// @access  Private/Admin
const updateCategoryStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isFeatured, showInMenu } = req.body;

    const updateData = {};
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (typeof isFeatured === 'boolean') {
      updateData.isFeatured = isFeatured;
    }
    
    if (typeof showInMenu === 'boolean') {
      updateData.showInMenu = showInMenu;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiResponse.error(res, 'Dəyişdiriləcək status göstərilməyib', 400);
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug level');

    if (!category) {
      return ApiResponse.error(res, 'Kategoriya tapılmadı', 404);
    }

    console.log(`✅ Admin tərəfindən kategoriya statusu dəyişdi: ${category.name}`);

    ApiResponse.success(res, { category }, 'Kategoriya statusu uğurla dəyişdirildi');

  } catch (error) {
    console.error('❌ Admin kategoriya status dəyişmə xətası:', error);
    return ApiResponse.error(res, 'Status dəyişdirilərkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Sort order yenilə
// @route   PATCH /api/admin/categories/reorder
// @access  Private/Admin
const reorderCategories = asyncHandler(async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(categories)) {
      return ApiResponse.error(res, 'Categories array tələb olunur', 400);
    }

    const updates = categories.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { sortOrder: parseInt(sortOrder) }
      }
    }));

    const result = await Category.bulkWrite(updates);

    console.log(`✅ Admin tərəfindən ${result.modifiedCount} kategoriya yenidən sıralandı`);

    ApiResponse.success(res, { 
      modifiedCount: result.modifiedCount 
    }, 'Kategoriya sıralaması uğurla yeniləndi');

  } catch (error) {
    console.error('❌ Admin kategoriya sıralama xətası:', error);
    return ApiResponse.error(res, 'Sıralama yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Admin - Kategoriya statistikaları
// @route   GET /api/admin/categories/stats
// @access  Private/Admin
const getCategoryStats = asyncHandler(async (req, res) => {
  try {
    // Əsas statistikalar
    const basicStats = {
      total: await Category.countDocuments(),
      active: await Category.countDocuments({ isActive: true }),
      inactive: await Category.countDocuments({ isActive: false }),
      featured: await Category.countDocuments({ isFeatured: true }),
      rootCategories: await Category.countDocuments({ parent: null }),
      leafCategories: await Category.countDocuments({
        _id: { $nin: await Category.distinct('parent') }
      })
    };

    // Səviyyə üzrə bölgü
    const levelStats = await Category.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Məhsul sayına görə top kategoriyalar
    const topCategories = await Product.aggregate([
      { $match: { status: 'active', category: { $ne: null } } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo._id',
          name: { $first: '$categoryInfo.name' },
          productCount: { $sum: 1 }
        }
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 }
    ]);

    // Boş kategoriyalar
    const categoriesWithProducts = await Product.distinct('category', { 
      status: 'active',
      category: { $ne: null }
    });
    
    const emptyCategories = await Category.countDocuments({
      _id: { $nin: categoriesWithProducts },
      isActive: true
    });

    ApiResponse.success(res, {
      basicStats: {
        ...basicStats,
        emptyCategories
      },
      levelStats,
      topCategories
    }, 'Kategoriya statistikaları uğurla alındı');

  } catch (error) {
    console.error('❌ Admin kategoriya statistika xətası:', error);
    return ApiResponse.error(res, 'Statistikalar alınarkən xəta baş verdi', 500);
  }
});

module.exports = {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  reorderCategories,
  getCategoryStats
};