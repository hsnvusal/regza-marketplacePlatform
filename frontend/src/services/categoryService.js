// src/services/categoryService.js
import apiClient, { handleApiResponse, handleApiError } from './api';

class CategoryService {
  // Bütün kategoriyaları gətir
  async getCategories(params = {}) {
    try {
      console.log('🔍 CategoryService: Getting categories with params:', params);
      
      const response = await apiClient.get('/categories', { params });
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Categories retrieved:', result.data?.categories?.length);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Get categories error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriya ağacını gətir (hierarchical)
  async getCategoryTree() {
    try {
      console.log('🔍 CategoryService: Getting category tree');
      
      const response = await apiClient.get('/categories/tree');
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category tree retrieved:', result.data?.tree?.length);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Get category tree error:', error);
      return handleApiError(error);
    }
  }

  // Seçilmiş kategoriyaları gətir
  async getFeaturedCategories(limit = 6) {
    try {
      console.log('🔍 CategoryService: Getting featured categories, limit:', limit);
      
      const response = await apiClient.get('/categories/featured', {
        params: { limit }
      });
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Featured categories retrieved:', result.data?.categories?.length);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Get featured categories error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriya məlumatını gətir
  async getCategory(slug) {
    try {
      console.log('🔍 CategoryService: Getting category:', slug);
      
      const response = await apiClient.get(`/categories/${slug}`);
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category retrieved:', result.data?.category?.name);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Get category error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriyaya aid məhsulları gətir
  async getCategoryProducts(slug, params = {}) {
    try {
      console.log('🔍 CategoryService: Getting category products:', slug, params);
      
      const response = await apiClient.get(`/categories/${slug}/products`, { params });
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category products retrieved:', result.data?.products?.length);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Get category products error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriya axtarışı
  async searchCategories(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: { categories: [], query, count: 0 },
          message: 'Axtarış sorğusu çox qısadır'
        };
      }

      console.log('🔍 CategoryService: Searching categories:', query);
      
      const response = await apiClient.get('/categories/search', {
        params: { q: query.trim(), limit }
      });
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category search results:', result.data?.categories?.length);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Search categories error:', error);
      return handleApiError(error);
    }
  }

  // Admin funksiyaları

  // Yeni kategoriya yarat
  async createCategory(categoryData) {
    try {
      console.log('🔍 CategoryService: Creating category:', categoryData.name);
      
      const response = await apiClient.post('/categories', categoryData);
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category created:', result.data?.category?.name);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Create category error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriya yenilə
  async updateCategory(categoryId, categoryData) {
    try {
      console.log('🔍 CategoryService: Updating category:', categoryId);
      
      const response = await apiClient.put(`/categories/${categoryId}`, categoryData);
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category updated:', result.data?.category?.name);
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Update category error:', error);
      return handleApiError(error);
    }
  }

  // Kategoriya sil
  async deleteCategory(categoryId) {
    try {
      console.log('🔍 CategoryService: Deleting category:', categoryId);
      
      const response = await apiClient.delete(`/categories/${categoryId}`);
      const result = handleApiResponse(response);
      
      console.log('✅ CategoryService: Category deleted');
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Delete category error:', error);
      return handleApiError(error);
    }
  }

  // Utility functions

  // Kategoriya slug-ını yaradır
  createSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9əöüğıçş\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Kategoriya rəngini yaradır
  generateRandomColor() {
    const colors = [
      '#007bff', '#28a745', '#ffc107', '#dc3545', 
      '#6f42c1', '#fd7e14', '#20c997', '#6c757d',
      '#e83e8c', '#17a2b8', '#343a40', '#f8f9fa'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Kategoriya validasiyası
  validateCategory(categoryData) {
    const errors = {};

    // Ad tələb olunur
    if (!categoryData.name || categoryData.name.trim().length < 2) {
      errors.name = 'Kategoriya adı ən azı 2 simvol olmalıdır';
    }

    if (categoryData.name && categoryData.name.length > 100) {
      errors.name = 'Kategoriya adı 100 simvoldan çox ola bilməz';
    }

    // Təsvir yoxlanması
    if (categoryData.description && categoryData.description.length > 500) {
      errors.description = 'Təsvir 500 simvoldan çox ola bilməz';
    }

    // URL yoxlanması
    if (categoryData.image && !this.isValidUrl(categoryData.image)) {
      errors.image = 'Düzgün şəkil URL-i daxil edin';
    }

    // Rəng yoxlanması
    if (categoryData.color && !/^#[0-9A-F]{6}$/i.test(categoryData.color)) {
      errors.color = 'Düzgün hex rəng kodu daxil edin (#RRGGBB)';
    }

    // Sıralama rəqəmi yoxlanması
    if (categoryData.sortOrder !== undefined && categoryData.sortOrder < 0) {
      errors.sortOrder = 'Sıralama rəqəmi 0 və ya böyük olmalıdır';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // URL validasiyası
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Kategoriya məlumatlarını formatla
  formatCategoryData(category) {
    return {
      id: category._id || category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      icon: category.icon || 'fas fa-folder',
      color: category.color || '#667eea',
      productCount: category.productCount || 0,
      level: category.level || 0,
      isActive: category.isActive !== false,
      isFeatured: category.isFeatured || false,
      showInMenu: category.showInMenu !== false,
      sortOrder: category.sortOrder || 0,
      parent: category.parent,
      children: category.children || [],
      path: category.path || category.slug,
      ancestors: category.ancestors || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  // Kategoriya statistikalarını hesabla
  calculateCategoryStats(categories) {
    const stats = {
      total: categories.length,
      active: categories.filter(c => c.isActive).length,
      featured: categories.filter(c => c.isFeatured).length,
      withProducts: categories.filter(c => (c.productCount || 0) > 0).length,
      totalProducts: categories.reduce((sum, c) => sum + (c.productCount || 0), 0)
    };

    return stats;
  }

  // Kategoriya ağacını düz siyahıya çevir
  flattenCategoryTree(tree, level = 0) {
    let result = [];
    
    for (const category of tree) {
      result.push({
        ...category,
        level,
        hasChildren: category.children && category.children.length > 0
      });
      
      if (category.children && category.children.length > 0) {
        result = result.concat(this.flattenCategoryTree(category.children, level + 1));
      }
    }
    
    return result;
  }

  // Breadcrumb yaradır
  createBreadcrumb(category, allCategories) {
    const breadcrumb = [];
    
    if (category.ancestors && category.ancestors.length > 0) {
      for (const ancestorId of category.ancestors) {
        const ancestor = allCategories.find(c => c._id === ancestorId || c.id === ancestorId);
        if (ancestor) {
          breadcrumb.push(ancestor);
        }
      }
    }
    
    breadcrumb.push(category);
    return breadcrumb;
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
export default categoryService;