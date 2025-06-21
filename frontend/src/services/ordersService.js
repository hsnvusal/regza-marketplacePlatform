// services/ordersService.js - DEBUG & FIXED VERSION
import apiClient from './api';

class OrdersService {
  
  // 🔧 IMPROVED createOrder with validation and better error handling
  async createOrder(orderData) {
    try {
      console.log('🚀 OrdersService: Creating order...');
      console.log('📦 Raw order data:', JSON.stringify(orderData, null, 2));
      
      // Validate and clean order data
      const cleanedData = this.validateAndCleanOrderData(orderData);
      console.log('🧹 Cleaned order data:', JSON.stringify(cleanedData, null, 2));
      
      if (!cleanedData.success) {
        console.error('❌ Order validation failed:', cleanedData.error);
        return cleanedData;
      }
      
      const response = await apiClient.post('/orders/direct', cleanedData.data);
      console.log('✅ Order created successfully:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Create order error:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // More detailed error handling
      let errorMessage = 'Sifariş yaradılarkən xəta baş verdi';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      };
    }
  }

  // 🔧 Validate and clean order data
  validateAndCleanOrderData(orderData) {
    try {
      console.log('🔍 Validating order data...');
      
      // Check if orderData exists
      if (!orderData || typeof orderData !== 'object') {
        return {
          success: false,
          error: 'Order data is required and must be an object'
        };
      }

      // Check required fields
      const requiredFields = ['items', 'pricing', 'shippingAddress'];
      const missingFields = [];
      
      requiredFields.forEach(field => {
        if (!orderData[field]) {
          missingFields.push(field);
        }
      });
      
      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Check items array
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return {
          success: false,
          error: 'Items must be a non-empty array'
        };
      }

      // Validate each item
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        if (!item.product) {
          return {
            success: false,
            error: `Item ${i + 1}: product ID is required`
          };
        }
        if (!item.quantity || item.quantity < 1) {
          return {
            success: false,
            error: `Item ${i + 1}: quantity must be at least 1`
          };
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          return {
            success: false,
            error: `Item ${i + 1}: unitPrice must be a positive number`
          };
        }
      }

      // Check pricing
      if (!orderData.pricing || typeof orderData.pricing !== 'object') {
        return {
          success: false,
          error: 'Pricing object is required'
        };
      }

      const pricingFields = ['subtotal', 'total'];
      const missingPricingFields = [];
      
      pricingFields.forEach(field => {
        if (orderData.pricing[field] === undefined || orderData.pricing[field] === null) {
          missingPricingFields.push(field);
        }
      });
      
      if (missingPricingFields.length > 0) {
        return {
          success: false,
          error: `Missing pricing fields: ${missingPricingFields.join(', ')}`
        };
      }

      // Check shipping address
      if (!orderData.shippingAddress || typeof orderData.shippingAddress !== 'object') {
        return {
          success: false,
          error: 'Shipping address object is required'
        };
      }

      const addressFields = ['firstName', 'lastName', 'email'];
      const missingAddressFields = [];
      
      addressFields.forEach(field => {
        if (!orderData.shippingAddress[field]) {
          missingAddressFields.push(field);
        }
      });
      
      if (missingAddressFields.length > 0) {
        return {
          success: false,
          error: `Missing shipping address fields: ${missingAddressFields.join(', ')}`
        };
      }

      // Clean and structure the data according to backend expectations
      const cleanedData = {
        // Items with proper structure
        items: orderData.items.map(item => ({
          product: item.product,
          productSnapshot: item.productSnapshot || {
            name: item.name || 'Product',
            price: item.unitPrice,
            image: item.image || null,
            sku: item.sku || null
          },
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        })),

        // Pricing with proper numeric values
        pricing: {
          subtotal: parseFloat(orderData.pricing.subtotal || 0),
          shippingCost: parseFloat(orderData.pricing.shippingCost || 0),
          tax: parseFloat(orderData.pricing.tax || 0),
          discountAmount: parseFloat(orderData.pricing.discountAmount || 0),
          paymentFee: parseFloat(orderData.pricing.paymentFee || 0),
          total: parseFloat(orderData.pricing.total || 0)
        },

        // Shipping address
        shippingAddress: {
          firstName: orderData.shippingAddress.firstName,
          lastName: orderData.shippingAddress.lastName,
          email: orderData.shippingAddress.email,
          phone: orderData.shippingAddress.phone || '',
          street: orderData.shippingAddress.street || '',
          city: orderData.shippingAddress.city || '',
          country: orderData.shippingAddress.country || 'Azerbaijan',
          deliveryInstructions: orderData.shippingAddress.deliveryInstructions || ''
        },

        // Payment method
        paymentMethod: orderData.paymentMethod || 'cash_on_delivery',

        // Payment info (if paid via card)
        ...(orderData.paymentInfo && {
          paymentInfo: {
            paymentIntentId: orderData.paymentInfo.paymentIntentId,
            chargeId: orderData.paymentInfo.chargeId,
            status: orderData.paymentInfo.status || 'paid',
            paidAt: orderData.paymentInfo.paidAt || new Date().toISOString(),
            paymentMethod: orderData.paymentInfo.paymentMethod || 'card',
            amount: orderData.paymentInfo.amount,
            currency: orderData.paymentInfo.currency || 'usd'
          }
        }),

        // Order status
        status: orderData.status || (orderData.paymentInfo ? 'paid' : 'pending'),

        // Customer notes
        customerNotes: orderData.customerNotes || '',

        // Special instructions
        specialInstructions: orderData.specialInstructions || {
          giftWrap: false,
          priority: 'normal'
        }
      };

      console.log('✅ Order data validated and cleaned successfully');
      return {
        success: true,
        data: cleanedData
      };

    } catch (error) {
      console.error('❌ Order validation error:', error);
      return {
        success: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  // Customer - Müştəri sifarişlərini al
  async getMyOrders(page = 1, limit = 10, filters = {}) {
    try {
      console.log('🚀 ordersService.getMyOrders called with:', { page, limit, filters });
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const apiUrl = `/orders?${queryParams}`;
      console.log('📡 Making API request to:', apiUrl);

      const response = await apiClient.get(apiUrl);
      console.log('✅ API Response received:', response);

      let extractedData = response.data;
      
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