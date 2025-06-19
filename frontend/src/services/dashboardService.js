// services/dashboardService.js
import apiClient from './api';

class DashboardService {
  // Get dashboard statistics
  async getStats(userRole) {
    try {
      const response = await apiClient.get(`/dashboard/stats?role=${userRole}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Statistika yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get recent orders
  async getRecentOrders(userRole, limit = 5) {
    try {
      const endpoint = userRole === 'customer' 
        ? `/orders/my-orders?limit=${limit}&sort=-createdAt`
        : `/orders?limit=${limit}&sort=-createdAt`;
        
      const response = await apiClient.get(endpoint);
      return {
        success: true,
        data: response.data.orders || response.data
      };
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifarişlər yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get recent products (for admin/vendor)
  async getRecentProducts(limit = 5) {
    try {
      const response = await apiClient.get(`/products?limit=${limit}&sort=-createdAt&status=active`);
      return {
        success: true,
        data: response.data.products || response.data
      };
    } catch (error) {
      console.error('Error fetching recent products:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Məhsullar yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get top selling products (for admin/vendor)
  async getTopProducts(limit = 5) {
    try {
      const response = await apiClient.get(`/dashboard/top-products?limit=${limit}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching top products:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Məhsullar yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get customer analytics
  async getCustomerAnalytics() {
    try {
      const response = await apiClient.get('/dashboard/customer-analytics');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Analitika yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get vendor analytics
  async getVendorAnalytics() {
    try {
      const response = await apiClient.get('/dashboard/vendor-analytics');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Vendor analitikası yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get admin analytics
  async getAdminAnalytics() {
    try {
      const response = await apiClient.get('/dashboard/admin-analytics');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Admin analitikası yüklənərkən xəta baş verdi'
      };
    }
  }

  // Get wishlist (for customers)
  async getWishlist() {
    try {
      const response = await apiClient.get('/wishlist');
      return {
        success: true,
        data: response.data.items || response.data
      };
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'İstək siyahısı yüklənərkən xəta baş verdi'
      };
    }
  }

  // Add to wishlist
  async addToWishlist(productId) {
    try {
      const response = await apiClient.post('/wishlist', { productId });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'İstək siyahısına əlavə edilərkən xəta baş verdi'
      };
    }
  }

  // Remove from wishlist
  async removeFromWishlist(productId) {
    try {
      const response = await apiClient.delete(`/wishlist/${productId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'İstək siyahısından silinərkən xəta baş verdi'
      };
    }
  }

  // Get all orders (for admin/vendor)
  async getAllOrders(page = 1, limit = 10, filters = {}) {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...filters
      });

      const response = await apiClient.get(`/orders?${queryParams}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching all orders:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifarişlər yüklənərkən xəta baş verdi'
      };
    }
  }

  // Update order status (for admin/vendor)
  async updateOrderStatus(orderId, status) {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/status`, { status });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifariş statusu yenilənərkən xəta baş verdi'
      };
    }
  }

  // Get user profile
  async getUserProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Profil məlumatları yüklənərkən xəta baş verdi'
      };
    }
  }

  // Update user profile
  async updateUserProfile(profileData) {
    try {
      const response = await apiClient.patch('/auth/profile', profileData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Profil yenilənərkən xəta baş verdi'
      };
    }
  }
}

const dashboardService = new DashboardService();
export default dashboardService;