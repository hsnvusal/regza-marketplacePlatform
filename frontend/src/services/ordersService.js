// services/ordersService.js
import apiClient from './api';

class OrdersService {
  // Customer - Müştəri sifarişlərini al
  async getMyOrders(page = 1, limit = 10, filters = {}) {
    try {
      console.log('🚀 ordersService.getMyOrders called with:', { page, limit, filters });
      
      // URLSearchParams-i daha təhlükəsiz formada yaradaq
      const queryParams = new URLSearchParams();
      
      // Əsas parametrləri əlavə edək
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      // Filterləri təmizləyib əlavə edək
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const apiUrl = `/orders?${queryParams}`;
      console.log('📡 Making API request to:', apiUrl);
      console.log('📡 Full URL will be:', `${apiClient.defaults.baseURL}${apiUrl}`);

      // Backend route structure-ə uyğun - customer öz sifarişlərini GET /orders ilə alır
      const response = await apiClient.get(apiUrl);
      console.log('✅ API Response received:', response);
      console.log('📦 Response data:', response.data);
      console.log('📊 Response structure:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'no data'
      });

      // Backend ApiResponse.paginated structure-ına uyğun extract etmək
      let extractedData = response.data;
      
      // Əgər success field var və data field də varsa (ApiResponse format)
      if (response.data.success !== undefined && response.data.data !== undefined) {
        extractedData = response.data.data;
        console.log('📋 Using ApiResponse.data format:', extractedData);
      }

      return {
        success: true,
        data: extractedData
      };
    } catch (error) {
      console.error('❌ ordersService.getMyOrders ERROR:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config
      });

      return {
        success: false,
        error: error.response?.data?.message || 'Sifarişlər alınarkən xəta baş verdi'
      };
    }
  }

  // Vendor - Vendor sifarişlərini al
  async getVendorOrders(page = 1, limit = 10, filters = {}) {
    try {
      console.log('🚀 ordersService.getVendorOrders called');
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const apiUrl = `/orders/vendor/my-orders?${queryParams}`;
      console.log('📡 Making vendor API request to:', apiUrl);

      const response = await apiClient.get(apiUrl);
      console.log('✅ Vendor API Response:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Vendor orders error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Vendor sifarişləri alınarkən xəta baş verdi'
      };
    }
  }


  async trackOrder(orderId) {
  try {
    console.log('🚀 Tracking order:', orderId);
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error tracking order:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'İzləmə məlumatları yüklənmədi'
    };
  }
}

  // Admin - Bütün sifarişləri al
  async getAllOrders(page = 1, limit = 20, filters = {}) {
    try {
      console.log('🚀 ordersService.getAllOrders called');
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const apiUrl = `/orders/admin/all?${queryParams}`;
      console.log('📡 Making admin API request to:', apiUrl);

      const response = await apiClient.get(apiUrl);
      console.log('✅ Admin API Response:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Admin orders error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Bütün sifarişlər alınarkən xəta baş verdi'
      };
    }
  }

  // Test method - API bağlantısını yoxlamaq üçün
  async testConnection() {
    try {
      console.log('🧪 Testing API connection...');
      console.log('🧪 API Base URL:', apiClient.defaults.baseURL);
      console.log('🧪 API Headers:', apiClient.defaults.headers);
      
      const response = await apiClient.get('/orders/stats');
      console.log('✅ Connection test successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Sifariş detayı
  async getOrder(orderId) {
    try {
      console.log('🚀 Getting order details for:', orderId);
      const response = await apiClient.get(`/orders/${orderId}`);
      console.log('✅ Order details response:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get order error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifariş detayı alınarkən xəta baş verdi'
      };
    }
  }

  // Alias for getOrder
  async getOrderDetails(orderId) {
    return this.getOrder(orderId);
  }

  // Səbətdən sifariş yarat
  async createOrder(orderData) {
    try {
      console.log('🚀 Creating order with data:', orderData);
      const response = await apiClient.post('/orders', orderData);
      console.log('✅ Order created successfully:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Create order error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifariş yaradılarkən xəta baş verdi'
      };
    }
  }

  // Sifarişi ləğv et
  async cancelOrder(orderId, reason = '') {
    try {
      console.log('🚀 Cancelling order:', orderId, 'Reason:', reason);
      const response = await apiClient.put(`/orders/${orderId}/cancel`, { reason });
      console.log('✅ Order cancelled:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Cancel order error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Sifariş ləğv edilərkən xəta baş verdi'
      };
    }
  }

  // Status update methods və digər methodları buraya əlavə edin...
  // (qısaldım çünki əsas problem API connection-dadır)

  // Get order statuses
  getOrderStatuses() {
    return [
      { value: 'pending', label: 'Gözləyir', color: '#f59e0b' },
      { value: 'confirmed', label: 'Təsdiqləndi', color: '#3b82f6' },
      { value: 'processing', label: 'Hazırlanır', color: '#8b5cf6' },
      { value: 'shipped', label: 'Göndərildi', color: '#06b6d4' },
      { value: 'delivered', label: 'Çatdırıldı', color: '#10b981' },
      { value: 'completed', label: 'Tamamlandı', color: '#059669' },
      { value: 'cancelled', label: 'Ləğv edildi', color: '#ef4444' },
      { value: 'refunded', label: 'Geri qaytarıldı', color: '#f97316' }
    ];
  }

  // Get status color
  getStatusColor(status) {
    const statusObj = this.getOrderStatuses().find(s => s.value === status);
    return statusObj ? statusObj.color : '#6b7280';
  }

  // Get status text
  getStatusText(status) {
    const statusObj = this.getOrderStatuses().find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  }
}

const ordersService = new OrdersService();

// Global debug helper
window.debugOrders = ordersService;
console.log('🛠️ Debug helper added: window.debugOrders');

export default ordersService;