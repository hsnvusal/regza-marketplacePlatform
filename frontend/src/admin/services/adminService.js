// src/admin/services/adminService.js - TAM VERSİYA
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class AdminService {
  // Auth headers helper
  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ===== DASHBOARD METHODS =====
  
  async getDashboardStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          data: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Dashboard stats alınmadı'
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getRecentActivities(limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard/activities?limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          activities: data.activities
        };
      }
      
      return {
        success: false,
        error: data.message || 'Aktivliklər alınmadı'
      };
    } catch (error) {
      console.error('Recent activities error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== ORDERS METHODS =====

  async getOrders(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/orders?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          orders: data.data.orders,
          pagination: data.data.pagination
        };
      }
      
      return {
        success: false,
        error: data.message || 'Sifarişlər alınmadı'
      };
    } catch (error) {
      console.error('Get orders error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getOrderById(orderId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          order: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Sifariş məlumatları alınmadı'
      };
    } catch (error) {
      console.error('Get order by ID error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // Alias for getOrderById to match component usage
  async getOrderDetails(orderId) {
    return this.getOrderById(orderId);
  }

  async updateOrderStatus(orderId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          order: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Status yenilənmədi'
      };
    } catch (error) {
      console.error('Update order status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateOrderNotes(orderId, notesData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/notes`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(notesData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          order: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Qeydlər yenilənmədi'
      };
    } catch (error) {
      console.error('Update order notes error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== USERS METHODS =====

  async getAllUsers(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/users?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          users: data.data.users,
          pagination: data.data.pagination
        };
      }
      
      return {
        success: false,
        error: data.message || 'İstifadəçilər alınmadı'
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // Alias for getAllUsers to match component usage
  async getUsers(filters = {}) {
    return this.getAllUsers(filters);
  }

  async getUserDetails(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          user: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'İstifadəçi məlumatları alınmadı'
      };
    } catch (error) {
      console.error('Get user details error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateUserRole(userId, roleData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(typeof roleData === 'string' ? { role: roleData } : roleData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          user: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'İstifadəçi rolu yenilənmədi'
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateUserStatus(userId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          user: data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'İstifadəçi statusu yenilənmədi'
      };
    } catch (error) {
      console.error('Update user status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'İstifadəçi silinmədi'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== PRODUCTS METHODS - DÜZƏLDİLMİŞ VERSİYA =====

  async getProducts(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Filtrləri düzgün formatla
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      // ✅ DÜZƏLİŞ: Admin products endpoint istifadə et
      const response = await fetch(
        `${API_BASE_URL}/admin/products?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        // ✅ DÜZƏLİŞ: Müxtəlif response strukturlarını handle et
        const products = data.data?.products || data.products || [];
        const pagination = data.data?.pagination || data.pagination || {
          totalProducts: products.length,
          currentPage: 1,
          totalPages: 1,
          hasPrevPage: false,
          hasNextPage: false
        };

        return {
          success: true,
          products: products,
          pagination: pagination
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsullar alınmadı'
      };
    } catch (error) {
      console.error('Get products error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası',
        products: [],
        pagination: {
          totalProducts: 0,
          currentPage: 1,
          totalPages: 1,
          hasPrevPage: false,
          hasNextPage: false
        }
      };
    }
  }

  async getProductDetails(productId) {
    try {
      // ✅ DÜZƏLİŞ: Admin products endpoint istifadə et
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          product: data.data?.product || data.product || data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul məlumatları alınmadı'
      };
    } catch (error) {
      console.error('Get product details error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async createProduct(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          product: data.data?.product || data.product
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul yaradılmadı',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Create product error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateProduct(productId, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          product: data.data?.product || data.product
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul yenilənmədi',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Update product error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateProductStatus(productId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          product: data.data?.product || data.product
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul statusu yenilənmədi'
      };
    } catch (error) {
      console.error('Update product status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateProductStock(productId, stockData) {
    try {
      // ✅ DÜZƏLİŞ: Stock update endpoint əlavə et
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(stockData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          product: data.data?.product || data.product
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul stoqu yenilənmədi'
      };
    } catch (error) {
      console.error('Update product stock error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async deleteProduct(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul silinmədi'
      };
    } catch (error) {
      console.error('Delete product error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getProductReviews(productId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/reviews?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          reviews: data.data?.reviews || data.reviews || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul rəyləri alınmadı',
        reviews: []
      };
    } catch (error) {
      console.error('Get product reviews error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası',
        reviews: []
      };
    }
  }

  async getProductOrderHistory(productId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/orders?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          orders: data.data?.orders || data.orders || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul sifariş tarixçəsi alınmadı',
        orders: []
      };
    } catch (error) {
      console.error('Get product order history error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası',
        orders: []
      };
    }
  }

  async getNewProductFormData() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/products/new/form-data`, {
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        categories: data.categories || [],
        vendors: data.vendors || [],
        defaultData: data.defaultData || {}
      };
    }
    
    return {
      success: false,
      error: data.message || 'Form məlumatları alınmadı'
    };
  } catch (error) {
    console.error('Get new product form data error:', error);
    return {
      success: false,
      error: 'Server ilə əlaqə xətası'
    };
  }
}

  // ✅ DÜZƏLİŞ: Bulk operations əlavə et
  async bulkDeleteProducts(productIds) {
    return this.bulkOperation('delete', productIds);
  }

  async bulkUpdateProductStatus(productIds, status) {
    return this.bulkOperation('updateStatus', productIds, { status });
  }

  async bulkToggleFeatured(productIds) {
    return this.bulkOperation('toggleFeatured', productIds);
  }

  async bulkOperation(action, productIds, data = {}) {
    try {
      const requestBody = {
        action,
        productIds,
        data
      };

      const response = await fetch(`${API_BASE_URL}/admin/products/bulk`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        return {
          success: true,
          message: responseData.message,
          affectedCount: responseData.affectedCount || 0
        };
      }
      
      return {
        success: false,
        error: responseData.message || 'Bulk əməliyyat uğursuz'
      };
    } catch (error) {
      console.error('Bulk operation error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ✅ DÜZƏLİŞ: Product statistics əlavə et
  async getProductStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/products/stats`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          stats: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Statistikalar alınmadı'
      };
    } catch (error) {
      console.error('Get product stats error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== CATEGORIES METHODS =====

  // src/admin/services/adminService.js - getCategories method

async getCategories(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // Default olaraq aktiv kategoriyaları al
    if (!filters.isActive) {
      queryParams.append('isActive', 'true');
    }
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/admin/categories?${queryParams.toString()}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        categories: data.data?.categories || data.categories || [],
        pagination: data.data?.pagination || data.pagination || {},
        stats: data.data?.stats || data.stats || {}
      };
    }

    return {
      success: false,
      error: data.message || 'Kategoriyalar alınmadı'
    };

  } catch (error) {
    console.error('Get categories error:', error);
    return {
      success: false,
      error: 'Server ilə əlaqə xətası'
    };
  }
}

  async getCategoryTree(includeInactive = false) {
    try {
      const queryParams = new URLSearchParams();
      if (includeInactive) {
        queryParams.append('includeInactive', 'true');
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/categories/tree?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          tree: data.data?.tree || data.tree || [],
          count: data.data?.count || data.count || 0
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya ağacı alınmadı'
      };
    } catch (error) {
      console.error('Get category tree error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getCategoryDetails(categoryId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          category: data.data?.category || data.category,
          breadcrumb: data.data?.breadcrumb || data.breadcrumb || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya məlumatları alınmadı'
      };
    } catch (error) {
      console.error('Get category details error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          category: data.data?.category || data.category
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya yaradılmadı',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Create category error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateCategory(categoryId, categoryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          category: data.data?.category || data.category
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya yenilənmədi',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Update category error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async deleteCategory(categoryId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.forceDelete) {
        queryParams.append('forceDelete', 'true');
      }
      
      if (options.moveProductsTo) {
        queryParams.append('moveProductsTo', options.moveProductsTo);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/categories/${categoryId}?${queryParams.toString()}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya silinmədi'
      };
    } catch (error) {
      console.error('Delete category error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateCategoryStatus(categoryId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          category: data.data?.category || data.category
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya statusu yenilənmədi'
      };
    } catch (error) {
      console.error('Update category status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async reorderCategories(categoriesData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories/reorder`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ categories: categoriesData }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          modifiedCount: data.data?.modifiedCount || data.modifiedCount || 0
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya sıralaması yenilənmədi'
      };
    } catch (error) {
      console.error('Reorder categories error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getCategoryStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/categories/stats`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          stats: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kategoriya statistikaları alınmadı'
      };
    } catch (error) {
      console.error('Get category stats error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // Public categories method for dropdown options
  async getCategoriesForDropdown() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          categories: data.categories || data.data || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kateqoriyalar alınmadı'
      };
    } catch (error) {
      console.error('Get categories for dropdown error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== VENDORS METHODS =====

  async getVendors(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/vendors?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          vendors: data.vendors || data.data || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Vendorlar alınmadı'
      };
    } catch (error) {
      console.error('Get vendors error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getVendorDetails(vendorId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          vendor: data.data?.vendor || data.vendor
        };
      }
      
      return {
        success: false,
        error: data.message || 'Vendor məlumatları alınmadı'
      };
    } catch (error) {
      console.error('Get vendor details error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateVendorStatus(vendorId, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(statusData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          vendor: data.data?.vendor || data.vendor
        };
      }
      
      return {
        success: false,
        error: data.message || 'Vendor statusu yenilənmədi'
      };
    } catch (error) {
      console.error('Update vendor status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async approveVendor(vendorId) {
    return this.updateVendorStatus(vendorId, { status: 'approved' });
  }

  async rejectVendor(vendorId, reason = '') {
    return this.updateVendorStatus(vendorId, { 
      status: 'rejected',
      rejectionReason: reason 
    });
  }

  async suspendVendor(vendorId, reason = '') {
    return this.updateVendorStatus(vendorId, { 
      status: 'suspended',
      suspensionReason: reason 
    });
  }

  // ===== ANALYTICS METHODS =====

  async getAnalytics(timeframe = '30d') {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analytics?timeframe=${timeframe}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          analytics: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Analytics alınmadı'
      };
    } catch (error) {
      console.error('Get analytics error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getSalesReport(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/reports/sales?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          report: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Satış hesabatı alınmadı'
      };
    } catch (error) {
      console.error('Get sales report error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getInventoryReport() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/inventory`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          report: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Inventar hesabatı alınmadı'
      };
    } catch (error) {
      console.error('Get inventory report error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== REVIEWS METHODS =====

  async getReviews(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/reviews?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          reviews: data.data?.reviews || data.reviews || [],
          pagination: data.data?.pagination || data.pagination || {}
        };
      }
      
      return {
        success: false,
        error: data.message || 'Rəylər alınmadı'
      };
    } catch (error) {
      console.error('Get reviews error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateReviewStatus(reviewId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          review: data.data?.review || data.review
        };
      }
      
      return {
        success: false,
        error: data.message || 'Rəy statusu yenilənmədi'
      };
    } catch (error) {
      console.error('Update review status error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async deleteReview(reviewId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Rəy silinmədi'
      };
    } catch (error) {
      console.error('Delete review error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== COUPONS METHODS =====

  async getCoupons(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/coupons?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          coupons: data.data?.coupons || data.coupons || [],
          pagination: data.data?.pagination || data.pagination || {}
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kuponlar alınmadı'
      };
    } catch (error) {
      console.error('Get coupons error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async createCoupon(couponData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/coupons`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(couponData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          coupon: data.data?.coupon || data.coupon
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kupon yaradılmadı',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Create coupon error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateCoupon(couponId, couponData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/coupons/${couponId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(couponData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          coupon: data.data?.coupon || data.coupon
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kupon yenilənmədi',
        errors: data.errors || []
      };
    } catch (error) {
      console.error('Update coupon error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async deleteCoupon(couponId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kupon silinmədi'
      };
    } catch (error) {
      console.error('Delete coupon error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== SETTINGS METHODS =====

  async getSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          settings: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Tənzimləmələr alınmadı'
      };
    } catch (error) {
      console.error('Get settings error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async updateSettings(settingsData) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(settingsData),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          settings: data.data || data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Tənzimləmələr yenilənmədi'
      };
    } catch (error) {
      console.error('Update settings error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== FILE UPLOAD METHODS =====

  async uploadFile(file, type = 'general') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          // Content-Type-ı FormData üçün set etməyin
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          url: data.data?.url || data.url,
          filename: data.data?.filename || data.filename
        };
      }
      
      return {
        success: false,
        error: data.message || 'Fayl yüklənmədi'
      };
    } catch (error) {
      console.error('Upload file error:', error);
      return {
        success: false,
        error: 'Fayl yükləmə xətası'
      };
    }
  }

  async uploadMultipleFiles(files, type = 'general') {
    try {
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/admin/upload/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message,
          files: data.data?.files || data.files || []
        };
      }
      
      return {
        success: false,
        error: data.message || 'Fayllar yüklənmədi'
      };
    } catch (error) {
      console.error('Upload multiple files error:', error);
      return {
        success: false,
        error: 'Fayllar yükləmə xətası'
      };
    }
  }

  // ===== NOTIFICATION METHODS =====

  async getNotifications(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/notifications?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          notifications: data.data?.notifications || data.notifications || [],
          pagination: data.data?.pagination || data.pagination || {}
        };
      }
      
      return {
        success: false,
        error: data.message || 'Bildirişlər alınmadı'
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Bildiriş oxunmuş olaraq işarələnmədi'
      };
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async markAllNotificationsAsRead() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications/read-all`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message
        };
      }
      
      return {
        success: false,
        error: data.message || 'Bütün bildirişlər oxunmuş olaraq işarələnmədi'
      };
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== HELPER METHODS =====

  formatPrice(amount, currency = 'AZN') {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('az-AZ', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(date, options = {}) {
    if (!date) return '-';
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString('az-AZ', {
      ...defaultOptions,
      ...options
    });
  }

  formatDateShort(date) {
    return this.formatDate(date, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  }

  formatDateTime(date) {
    return this.formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('az-AZ').format(number);
  }

  formatPercentage(value) {
    if (!value && value !== 0) return '-';
    return `${value.toFixed(1)}%`;
  }

  getStatusBadgeConfig(status) {
    const statusConfig = {
      // Order statuses
      pending: { color: '#d69e2e', bg: '#fef5e7', text: 'Gözləyir' },
      confirmed: { color: '#3182ce', bg: '#ebf8ff', text: 'Təsdiqləndi' },
      processing: { color: '#805ad5', bg: '#faf5ff', text: 'İşlənir' },
      shipped: { color: '#3182ce', bg: '#ebf8ff', text: 'Göndərildi' },
      delivered: { color: '#38a169', bg: '#f0fff4', text: 'Çatdırıldı' },
      completed: { color: '#38a169', bg: '#f0fff4', text: 'Tamamlandı' },
      cancelled: { color: '#e53e3e', bg: '#fed7d7', text: 'Ləğv edildi' },
      refunded: { color: '#805ad5', bg: '#faf5ff', text: 'Geri qaytarıldı' },
      
      // Product statuses
      active: { color: '#38a169', bg: '#f0fff4', text: 'Aktiv' },
      inactive: { color: '#718096', bg: '#f7fafc', text: 'Deaktiv' },
      draft: { color: '#805ad5', bg: '#faf5ff', text: 'Qaralama' },
      rejected: { color: '#e53e3e', bg: '#fed7d7', text: 'Rədd edilib' },
      out_of_stock: { color: '#f56500', bg: '#fef5e7', text: 'Stokda yox' },
      discontinued: { color: '#718096', bg: '#f7fafc', text: 'Dayandırılıb' },
      
      // User roles
      customer: { color: '#3182ce', bg: '#ebf8ff', text: 'Müştəri' },
      vendor: { color: '#805ad5', bg: '#faf5ff', text: 'Vendor' },
      admin: { color: '#e53e3e', bg: '#fed7d7', text: 'Admin' },
      
      // Vendor statuses
      approved: { color: '#38a169', bg: '#f0fff4', text: 'Təsdiqlənib' },
      suspended: { color: '#f56500', bg: '#fef5e7', text: 'Məhdudlaşdırılıb' },
      
      // Review statuses
      published: { color: '#38a169', bg: '#f0fff4', text: 'Yayımlanıb' },
      hidden: { color: '#718096', bg: '#f7fafc', text: 'Gizlədilmiş' },
      flagged: { color: '#e53e3e', bg: '#fed7d7', text: 'Şikayət edilib' }
    };

    return statusConfig[status] || statusConfig.pending;
  }

  // Utility method for handling API errors
  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return 'Sessiya bitib. Yenidən daxil olun.';
      } else if (error.response.status === 403) {
        return 'Bu əməliyyat üçün icazəniz yoxdur.';
      } else if (error.response.status >= 500) {
        return 'Server xətası. Daha sonra cəhd edin.';
      }
    } else if (error.request) {
      // Request was made but no response received
      return 'Server ilə əlaqə qurulamadı. İnternet bağlantınızı yoxlayın.';
    }
    
    return error.message || 'Bilinməyən xəta baş verdi.';
  }

  // Debug method
  log(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AdminService] ${message}`, data);
    }
  }

  // Storage helpers
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
}

export default new AdminService();