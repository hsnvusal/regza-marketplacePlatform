// src/services/stripeService.js - FIXED FOR VITE
import { loadStripe } from '@stripe/stripe-js';
import apiClient, { handleApiResponse, handleApiError } from './api';

// ⚠️ Vite üçün import.meta.env istifadə edin
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

class StripeService {
  
  // 🔧 Get Stripe instance
  async getStripe() {
    return await stripePromise;
  }

  // 💳 Create Payment Intent
  async createPaymentIntent(paymentData) {
    try {
      console.log('💳 Creating payment intent:', paymentData);
      
      const response = await apiClient.post('/payments/create-intent', {
        amount: Math.round(paymentData.amount), // Already in cents
        currency: paymentData.currency || 'usd',
        customerInfo: paymentData.customerInfo,
        orderInfo: paymentData.orderInfo
      });
      
      console.log('✅ Payment intent response:', response);
      return handleApiResponse(response);
    } catch (error) {
      console.error('❌ Payment intent error:', error);
      return handleApiError(error);
    }
  }

  // ✅ Confirm Payment
  async confirmPayment(paymentIntentId) {
    try {
      console.log('✅ Confirming payment:', paymentIntentId);
      
      const response = await apiClient.post(`/payments/confirm/${paymentIntentId}`);
      
      console.log('✅ Payment confirmation response:', response);
      return handleApiResponse(response);
    } catch (error) {
      console.error('❌ Payment confirmation error:', error);
      return handleApiError(error);
    }
  }

  // 📊 Get Payment Status
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await apiClient.get(`/payments/status/${paymentIntentId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // 🧪 Test Stripe Configuration
  async testStripeConfig() {
    try {
      console.log('🧪 Testing Stripe configuration...');
      console.log('  - Publishable Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✅ Found' : '❌ Missing');
      console.log('  - API URL:', import.meta.env.VITE_API_BASE_URL);
      
      const stripe = await this.getStripe();
      console.log('  - Stripe Instance:', stripe ? '✅ Loaded' : '❌ Failed');
      
      return {
        success: true,
        publishableKeyExists: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
        stripeLoaded: !!stripe
      };
    } catch (error) {
      console.error('❌ Stripe config test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new StripeService();