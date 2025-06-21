// src/services/paymentService.js
import apiClient, { handleApiResponse, handleApiError } from './api';

class PaymentService {
  
  // 🚀 Create payment intent for card payments
  async createPaymentIntent(paymentData) {
    try {
      const response = await apiClient.post('/payments/create-intent', {
        amount: paymentData.amount, // Amount in cents/qəpik
        currency: paymentData.currency || 'AZN',
        paymentMethod: 'card',
        customerInfo: paymentData.customerInfo,
        orderInfo: paymentData.orderInfo,
        metadata: paymentData.metadata,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 🔍 Get payment status
  async getPaymentStatus(paymentId) {
    try {
      const response = await apiClient.get(`/payments/${paymentId}/status`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ✅ Confirm payment after processing
  async confirmPayment(paymentId, confirmationData) {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/confirm`, {
        transactionId: confirmationData.transactionId,
        status: confirmationData.status,
        processorResponse: confirmationData.processorResponse
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ❌ Cancel payment
  async cancelPayment(paymentId, reason) {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/cancel`, {
        reason: reason || 'User cancelled'
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 💰 Process refund
  async processRefund(paymentId, refundData) {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, {
        amount: refundData.amount, // Amount to refund in cents
        reason: refundData.reason,
        orderId: refundData.orderId
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 📊 Get payment history for user
  async getPaymentHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      
      const response = await apiClient.get(`/payments/history?${queryParams.toString()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 🏦 Get supported payment methods
  async getSupportedPaymentMethods() {
    try {
      const response = await apiClient.get('/payments/methods');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 🔧 Validate card details (client-side validation)
  validateCardNumber(cardNumber) {
    // Remove spaces and check if it's numeric
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (!/^\d+$/.test(cleanNumber)) {
      return { valid: false, error: 'Kart nömrəsi yalnız rəqəmlərdən ibarət olmalıdır' };
    }
    
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return { valid: false, error: 'Kart nömrəsi 13-19 rəqəm arasında olmalıdır' };
    }
    
    // Luhn algorithm check
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    const isValid = (sum % 10) === 0;
    
    if (!isValid) {
      return { valid: false, error: 'Kart nömrəsi düzgün deyil' };
    }
    
    // Detect card type
    const cardType = this.detectCardType(cleanNumber);
    
    return { 
      valid: true, 
      cardType: cardType,
      maskedNumber: this.maskCardNumber(cleanNumber)
    };
  }

  // 🔍 Detect card type
  detectCardType(cardNumber) {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]|^2(2[2-9]|[3-6]|7[0-1]|720)/,
      amex: /^3[47]/,
      discover: /^6011|^64[4-9]|^65/,
      unionpay: /^62/
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cardNumber)) {
        return type;
      }
    }
    
    return 'unknown';
  }

  // 🎭 Mask card number for security
  maskCardNumber(cardNumber) {
    if (cardNumber.length < 4) return cardNumber;
    
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4);
    
    return masked + last4;
  }

  // 📅 Validate expiry date
  validateExpiryDate(month, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    // Adjust year if it's 2-digit
    const fullYear = expYear < 100 ? 2000 + expYear : expYear;
    
    if (expMonth < 1 || expMonth > 12) {
      return { valid: false, error: 'Ay 1-12 arasında olmalıdır' };
    }
    
    if (fullYear < currentYear || (fullYear === currentYear && expMonth < currentMonth)) {
      return { valid: false, error: 'Kartın müddəti bitib' };
    }
    
    if (fullYear > currentYear + 20) {
      return { valid: false, error: 'Tarix çox uzaqdır' };
    }
    
    return { valid: true };
  }

  // 🔐 Validate CVV
  validateCVV(cvv, cardType = 'unknown') {
    if (!cvv || !/^\d+$/.test(cvv)) {
      return { valid: false, error: 'CVV yalnız rəqəmlərdən ibarət olmalıdır' };
    }
    
    const expectedLength = cardType === 'amex' ? 4 : 3;
    
    if (cvv.length !== expectedLength) {
      return { 
        valid: false, 
        error: `CVV ${expectedLength} rəqəm olmalıdır${cardType === 'amex' ? ' (Amex)' : ''}` 
      };
    }
    
    return { valid: true };
  }

  // 💳 Format card number for display
  formatCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    const groups = cleanNumber.match(/.{1,4}/g) || [];
    return groups.join(' ');
  }

  // 🏦 Get card brand info
  getCardBrandInfo(cardType) {
    const brands = {
      visa: {
        name: 'Visa',
        color: '#1A1F71',
        logo: '💳',
        cvvLength: 3
      },
      mastercard: {
        name: 'Mastercard',
        color: '#EB001B',
        logo: '💳',
        cvvLength: 3
      },
      amex: {
        name: 'American Express',
        color: '#006FCF',
        logo: '💳',
        cvvLength: 4
      },
      discover: {
        name: 'Discover',
        color: '#FF6000',
        logo: '💳',
        cvvLength: 3
      },
      unionpay: {
        name: 'UnionPay',
        color: '#E21836',
        logo: '💳',
        cvvLength: 3
      },
      unknown: {
        name: 'Kart',
        color: '#666666',
        logo: '💳',
        cvvLength: 3
      }
    };
    
    return brands[cardType] || brands.unknown;
  }

  // 🧮 Calculate total amount including fees
  calculatePaymentTotal(subtotal, fees = {}) {
    const processingFee = fees.processingFee || 0;
    const serviceFee = fees.serviceFee || 0;
    const total = subtotal + processingFee + serviceFee;
    
    return {
      subtotal: subtotal,
      processingFee: processingFee,
      serviceFee: serviceFee,
      total: total
    };
  }

  // 📱 Check if payment method is supported
  async isPaymentMethodSupported(method) {
    try {
      const supportedMethods = await this.getSupportedPaymentMethods();
      
      if (supportedMethods.success) {
        return supportedMethods.data.methods.includes(method);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking payment method support:', error);
      return false;
    }
  }

  // 🔄 Retry payment with backoff
  async retryPayment(paymentData, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const result = await this.createPaymentIntent(paymentData);
        
        if (result.success) {
          return result;
        }
        
        attempt++;
        
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, then 2s, then 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Wait before retry
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Payment failed after maximum retries');
  }

  // 📊 Get payment analytics (admin only)
  async getPaymentAnalytics(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.groupBy) queryParams.append('groupBy', filters.groupBy);
      
      const response = await apiClient.get(`/payments/analytics?${queryParams.toString()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

export default new PaymentService();