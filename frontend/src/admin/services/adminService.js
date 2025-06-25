// src/admin/services/adminService.js
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

  // ===== PRODUCTS METHODS =====

  async getProducts(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/products?${queryParams.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          products: data.data.products || data.products,
          pagination: data.data.pagination || data.pagination
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
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async getProductDetails(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          product: data.data || data.product
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
          product: data.data
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
          product: data.data
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
          reviews: data.reviews || data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul rəyləri alınmadı'
      };
    } catch (error) {
      console.error('Get product reviews error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
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
          orders: data.orders || data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Məhsul sifariş tarixçəsi alınmadı'
      };
    } catch (error) {
      console.error('Get product order history error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  // ===== CATEGORIES METHODS =====

  async getCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          categories: data.categories || data.data
        };
      }
      
      return {
        success: false,
        error: data.message || 'Kateqoriyalar alınmadı'
      };
    } catch (error) {
      console.error('Get categories error:', error);
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
          vendors: data.vendors || data.data
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

  // ===== HELPER METHODS =====

  formatPrice(amount, currency = 'AZN') {
    return new Intl.NumberFormat('az-AZ', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(date, options = {}) {
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

  getStatusBadgeConfig(status) {
    const statusConfig = {
      pending: { color: '#d69e2e', bg: '#fef5e7', text: 'Gözləyir' },
      confirmed: { color: '#3182ce', bg: '#ebf8ff', text: 'Təsdiqləndi' },
      processing: { color: '#805ad5', bg: '#faf5ff', text: 'İşlənir' },
      shipped: { color: '#3182ce', bg: '#ebf8ff', text: 'Göndərildi' },
      delivered: { color: '#38a169', bg: '#f0fff4', text: 'Çatdırıldı' },
      completed: { color: '#38a169', bg: '#f0fff4', text: 'Tamamlandı' },
      cancelled: { color: '#e53e3e', bg: '#fed7d7', text: 'Ləğv edildi' },
      active: { color: '#38a169', bg: '#f0fff4', text: 'Aktiv' },
      inactive: { color: '#718096', bg: '#f7fafc', text: 'Deaktiv' },
      customer: { color: '#3182ce', bg: '#ebf8ff', text: 'Müştəri' },
      vendor: { color: '#805ad5', bg: '#faf5ff', text: 'Vendor' },
      admin: { color: '#e53e3e', bg: '#fed7d7', text: 'Admin' }
    };

    return statusConfig[status] || statusConfig.pending;
  }
}

export default new AdminService();