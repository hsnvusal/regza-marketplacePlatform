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

  // 🔥 ORDER DETAIL METHODS - OrderDetailPage üçün lazım olan metodlar

/**
 * Get order tracking information
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Tracking data
 */
async getOrderTracking(orderId) {
  try {
    console.log('🔄 Getting order tracking for:', orderId);
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    console.log('✅ Order tracking response:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Get order tracking error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'İzləmə məlumatları alınarkən xəta baş verdi'
    };
  }
}

/**
 * Update vendor order status
 * @param {string} orderId - Order ID
 * @param {Object} updateData - Status update data
 * @returns {Promise<Object>} Update result
 */
async updateVendorOrderStatus(orderId, updateData) {
  try {
    console.log('🔄 Updating vendor order status:', { orderId, updateData });
    const response = await apiClient.put(`/orders/${orderId}/vendor-status`, updateData);
    console.log('✅ Vendor status updated:', response.data);
    return {
      success: true,
      message: response.data.message || 'Status uğurla yeniləndi',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Update vendor status error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Status yenilənərkən xəta baş verdi'
    };
  }
}

/**
 * Update order status (admin only)
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @param {string} notes - Optional admin notes
 * @returns {Promise<Object>} Update result
 */
async updateOrderStatus(orderId, status, notes = '') {
  try {
    console.log('🔄 Updating order status (admin):', { orderId, status, notes });
    const response = await apiClient.put(`/orders/${orderId}/status`, {
      status,
      adminNotes: notes
    });
    console.log('✅ Order status updated:', response.data);
    return {
      success: true,
      message: response.data.message || 'Status uğurla yeniləndi',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Update order status error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Status yenilənərkən xəta baş verdi'
    };
  }
}

/**
 * Add or update tracking information
 * @param {string} orderId - Order ID
 * @param {Object} trackingData - Tracking information
 * @returns {Promise<Object>} Update result
 */
async updateTracking(orderId, trackingData) {
  try {
    console.log('🔄 Updating tracking information:', { orderId, trackingData });
    const response = await apiClient.put(`/orders/${orderId}/tracking`, trackingData);
    console.log('✅ Tracking updated:', response.data);
    return {
      success: true,
      message: response.data.message || 'Tracking məlumatı əlavə edildi',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Update tracking error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Tracking məlumatı əlavə edilərkən xəta baş verdi'
    };
  }
}

/**
 * Update tracking status
 * @param {string} orderId - Order ID
 * @param {Object} statusData - Status update data
 * @returns {Promise<Object>} Update result
 */
async updateTrackingStatus(orderId, statusData) {
  try {
    console.log('🔄 Updating tracking status:', { orderId, statusData });
    const response = await apiClient.put(`/orders/${orderId}/tracking/status`, statusData);
    console.log('✅ Tracking status updated:', response.data);
    return {
      success: true,
      message: response.data.message || 'Tracking status yeniləndi',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Update tracking status error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Tracking status yenilənərkən xəta baş verdi'
    };
  }
}

/**
 * Track order by tracking number (public)
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise<Object>} Tracking result
 */
async trackByNumber(trackingNumber) {
  try {
    console.log('🔄 Tracking by number:', trackingNumber);
    const response = await apiClient.get(`/orders/track/${trackingNumber}`);
    console.log('✅ Public tracking result:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Track by number error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Bu tracking nömrəsi ilə sifariş tapılmadı'
    };
  }
}

/**
 * Get order statistics
 * @returns {Promise<Object>} Order statistics
 */
async getOrderStats() {
  try {
    console.log('🔄 Getting order statistics');
    const response = await apiClient.get('/orders/stats');
    console.log('✅ Order stats:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Get order stats error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'Statistika alınarkən xəta baş verdi'
    };
  }
}

/**
 * Export orders to file
 * @param {Object} filters - Export filters
 * @param {string} format - Export format (xlsx, csv, pdf)
 * @returns {Promise<Object>} Export result
 */
async exportOrders(filters = {}, format = 'xlsx') {
  try {
    console.log('🔄 Exporting orders:', { filters, format });
    
    const params = new URLSearchParams({
      format,
      ...filters
    });

    // Remove empty filters
    for (const [key, value] of params.entries()) {
      if (!value || value === '') {
        params.delete(key);
      }
    }
    
    const response = await apiClient.get(`/orders/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const blob = new Blob([response.data], {
      type: response.headers['content-type']
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from response headers or create default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `orders_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Orders exported successfully');
    return {
      success: true,
      message: 'Sifarişlər uğurla ixrac edildi'
    };
    
  } catch (error) {
    console.error('❌ Export orders error:', error);
    return {
      success: false,
      error: error.response?.data?.message || 'İxrac edilərkən xəta baş verdi'
    };
  }
}

// 🔥 UTILITY METHODS - Helper functions

/**
 * Format price with currency
 * @param {number} price - Price amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted price
 */
formatPrice(price, currency = 'AZN') {
  if (price === null || price === undefined) return '0 ' + currency;
  return new Intl.NumberFormat('az-AZ').format(price) + ' ' + currency;
}

/**
 * Format date for display
 * @param {string|Date} dateString - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date
 */
formatDate(dateString, options = {}) {
  if (!dateString) return 'Naməlum';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(dateString).toLocaleDateString('az-AZ', {
    ...defaultOptions,
    ...options
  });
}

/**
 * Get payment method text in Azerbaijani
 * @param {string} method - Payment method code
 * @returns {string} Payment method text
 */
getPaymentMethodText(method) {
  const methods = {
    credit_card: 'Kredit kartı',
    debit_card: 'Debet kartı',
    paypal: 'PayPal',
    bank_transfer: 'Bank köçürməsi',
    cash_on_delivery: 'Çatdırılma zamanı ödəniş',
    crypto: 'Kriptovalyuta'
  };
  return methods[method] || method;
}

/**
 * Get payment status text in Azerbaijani
 * @param {string} status - Payment status code
 * @returns {string} Payment status text
 */
getPaymentStatusText(status) {
  const statuses = {
    pending: 'Gözləyir',
    processing: 'İşlənir',
    completed: 'Tamamlandı',
    failed: 'Uğursuz',
    refunded: 'Geri qaytarıldı',
    partially_refunded: 'Qismən geri qaytarıldı'
  };
  return statuses[status] || status;
}

/**
 * Get carrier text in Azerbaijani
 * @param {string} carrier - Carrier code
 * @returns {string} Carrier text
 */
getCarrierText(carrier) {
  const carriers = {
    azerpost: 'Azərpoçt',
    bravo: 'Bravo Express',
    express: 'Express Post',
    pickup: 'Özü götürmə',
    other: 'Digər'
  };
  return carriers[carrier] || carrier;
}

/**
 * Get tracking status text in Azerbaijani
 * @param {string} status - Tracking status code
 * @returns {string} Tracking status text
 */
getTrackingStatusText(status) {
  const statuses = {
    shipped: 'Göndərildi',
    in_transit: 'Yoldadır',
    out_for_delivery: 'Çatdırılma üçün yolda',
    delivered: 'Çatdırıldı',
    failed_delivery: 'Çatdırılma uğursuz',
    returned: 'Geri qaytarıldı'
  };
  return statuses[status] || status;
}

/**
 * Check if order can be cancelled
 * @param {Object} order - Order object
 * @param {Object} user - Current user
 * @returns {boolean} Can cancel
 */
canCancelOrder(order, user) {
  return user?.role === 'customer' && 
         ['pending', 'confirmed'].includes(order?.status);
}

/**
 * Check if order status can be updated
 * @param {Object} order - Order object
 * @param {Object} user - Current user
 * @returns {boolean} Can update status
 */
canUpdateStatus(order, user) {
  return (user?.role === 'admin' || user?.role === 'vendor') &&
         !['completed', 'cancelled', 'refunded'].includes(order?.status);
}

/**
 * Get available statuses for user role
 * @param {string} userRole - User role
 * @returns {Array} Available statuses
 */
getAvailableStatuses(userRole) {
  const allStatuses = this.getOrderStatuses();
  
  if (userRole === 'vendor') {
    return allStatuses.filter(status => 
      ['confirmed', 'processing', 'shipped', 'delivered'].includes(status.value)
    );
  }
  
  return allStatuses; // Admin sees all statuses
}

/**
 * Validate order data before submission
 * @param {Object} orderData - Order data to validate
 * @returns {Object} Validation result
 */
validateOrderData(orderData) {
  const errors = [];
  
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Məhsul siyahısı boş ola bilməz');
  }
  
  if (!orderData.shippingAddress) {
    errors.push('Çatdırılma ünvanı tələb olunur');
  } else {
    if (!orderData.shippingAddress.firstName) errors.push('Ad tələb olunur');
    if (!orderData.shippingAddress.lastName) errors.push('Soyad tələb olunur');
    if (!orderData.shippingAddress.email) errors.push('Email tələb olunur');
  }
  
  if (!orderData.pricing || !orderData.pricing.total) {
    errors.push('Məbləğ məlumatı tələb olunur');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 🔥 DEBUG HELPERS - Development üçün

/**
 * Debug order data
 * @param {Object} order - Order to debug
 */
debugOrder(order) {
  console.group('🐛 Order Debug Info');
  console.log('Order ID:', order?._id || order?.id);
  console.log('Order Number:', order?.orderNumber);
  console.log('Status:', order?.status);
  console.log('Customer:', order?.customer);
  console.log('Vendor Orders:', order?.vendorOrders?.length);
  console.log('Total Amount:', this.formatPrice(order?.pricing?.total));
  console.log('Payment Method:', order?.payment?.method);
  console.log('Payment Status:', order?.payment?.status);
  console.log('Tracking Info:', order?.tracking || 'No tracking');
  console.log('Full Order:', order);
  console.groupEnd();
}

/**
 * Test API endpoints
 */
async runDiagnostics() {
  console.group('🔧 Orders Service Diagnostics');
  
  try {
    // Test connection
    console.log('1. Testing API connection...');
    const connectionTest = await this.testConnection();
    console.log('   Connection:', connectionTest.success ? '✅' : '❌');
    
    // Test orders endpoint
    console.log('2. Testing orders endpoint...');
    const ordersTest = await this.getMyOrders(1, 5);
    console.log('   Orders API:', ordersTest.success ? '✅' : '❌');
    
    // Test order stats
    console.log('3. Testing order stats...');
    const statsTest = await this.getOrderStats();
    console.log('   Stats API:', statsTest.success ? '✅' : '❌');
    
  } catch (error) {
    console.error('Diagnostics failed:', error);
  }
  
  console.groupEnd();
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