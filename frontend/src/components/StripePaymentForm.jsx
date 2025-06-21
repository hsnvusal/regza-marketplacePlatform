// src/components/StripePaymentForm.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import stripeService from '../services/stripeService'; // ⚠️ IMPORT ƏLAVƏ EDİLDİ
import toastManager from '../utils/toastManager';
import './StripePaymentForm.css';

const StripePaymentForm = ({ 
  amount, 
  currency = 'usd',
  customerInfo,
  orderInfo,
  onSuccess,
  onError,
  onCancel 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  // Debug logs
  console.log('💳 StripePaymentForm props:', {
    amount,
    currency,
    customerInfo,
    orderInfo
  });

  // Create payment intent when component mounts
  useEffect(() => {
    createPaymentIntent();
  }, [amount]);

  const createPaymentIntent = async () => {
    setIsCreatingIntent(true);
    
    try {
      console.log('💳 Creating payment intent with stripeService...');
      
      const result = await stripeService.createPaymentIntent({
        amount: amount, // Already in cents
        currency: currency,
        customerInfo: customerInfo,
        orderInfo: orderInfo
      });

      console.log('💳 Payment intent result:', result);

      if (result.success) {
        setClientSecret(result.data.clientSecret);
        setPaymentIntentId(result.data.paymentIntentId);
        console.log('✅ Payment intent created successfully');
      } else {
        console.error('❌ Payment intent creation failed:', result.error);
        onError(result.error || 'Payment intent yaradıla bilmədi');
      }
    } catch (error) {
      console.error('❌ Payment intent error:', error);
      onError(error.message || 'Server ilə əlaqə xətası');
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toastManager.error('Stripe yüklənməyib, yenidən cəhd edin');
      return;
    }

    if (!clientSecret) {
      toastManager.error('Payment intent yaradılmayıb');
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    try {
      console.log('💳 Confirming payment with Stripe...');
      
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo?.name || 'Customer',
            email: customerInfo?.email,
            phone: customerInfo?.phone
          }
        }
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        
        let errorMessage = 'Ödəniş uğursuz';
        if (error.code === 'card_declined') {
          errorMessage = 'Kartınız rədd edildi';
        } else if (error.code === 'insufficient_funds') {
          errorMessage = 'Kartda kifayət qədər məbləğ yoxdur';
        } else if (error.code === 'incorrect_cvc') {
          errorMessage = 'CVC kodu səhvdir';
        } else if (error.code === 'expired_card') {
          errorMessage = 'Kartın müddəti bitib';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        onError(errorMessage);
        toastManager.error(`Ödəniş uğursuz: ${errorMessage}`);
      } else {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        
        try {
          // Confirm payment on backend
          console.log('✅ Confirming payment on backend...');
          const confirmResult = await stripeService.confirmPayment(paymentIntent.id);
          
          if (confirmResult.success) {
            console.log('✅ Backend confirmation successful');
            toastManager.success('Ödəniş uğurla tamamlandı!', '💳');
            onSuccess({
              paymentIntentId: paymentIntent.id,
              chargeId: confirmResult.data.chargeId,
              amount: confirmResult.data.amount,
              currency: confirmResult.data.currency
            });
          } else {
            console.error('❌ Backend confirmation failed:', confirmResult.error);
            // Payment succeeded on Stripe but backend confirmation failed
            // This is a critical state - payment was charged but order might not be created
            toastManager.warning('Ödəniş uğurlu amma sistem xətası var. Dəstək ilə əlaqə saxlayın.');
            onError('Payment confirmation failed on backend');
          }
        } catch (confirmError) {
          console.error('❌ Backend confirmation error:', confirmError);
          toastManager.warning('Ödəniş uğurlu amma sistem xətası var. Dəstək ilə əlaqə saxlayın.');
          onError('Backend confirmation error');
        }
      }
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      onError(error.message || 'Ödəniş zamanı xəta baş verdi');
      toastManager.error('Ödəniş zamanı xəta baş verdi');
    } finally {
      setIsProcessing(false);
    }
  };

  // Card element styling
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true
  };

  // Show loading state while creating payment intent
  if (isCreatingIntent) {
    return (
      <div className="stripe-payment-form">
        <div className="payment-loading">
          <div className="spinner"></div>
          <h3>Ödəniş hazırlanır...</h3>
          <p>Zəhmət olmasa gözləyin</p>
        </div>
      </div>
    );
  }

  // Show error if payment intent creation failed
  if (!clientSecret && !isCreatingIntent) {
    return (
      <div className="stripe-payment-form">
        <div className="payment-error">
          <div className="error-icon">❌</div>
          <h3>Ödəniş hazırlanmadı</h3>
          <p>Payment intent yaradıla bilmədi</p>
          <button onClick={createPaymentIntent} className="retry-btn">
            🔄 Yenidən cəhd et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-payment-form">
      <div className="payment-header">
        <h3>💳 Kart məlumatları</h3>
        <div className="payment-amount">
          ${(amount / 100).toFixed(2)} {currency.toUpperCase()}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="card-element-container">
          <CardElement 
            options={cardElementOptions}
            className="card-element"
          />
        </div>

        <div className="payment-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={isProcessing}
          >
            ← Geri
          </button>
          
          <button
            type="submit"
            disabled={!stripe || !elements || isProcessing || !clientSecret}
            className="pay-btn"
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Ödənilir...
              </>
            ) : (
              `Ödə $${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
            )}
          </button>
        </div>
      </form>

      <div className="security-info">
        <div className="security-badges">
          🔒 SSL Şifrələmə | 🛡️ PCI DSS | 💳 3D Secure
        </div>
        <div className="accepted-cards">
          Qəbul edilən kartlar: Visa, Mastercard, Amex
        </div>
        <div className="test-card-info" style={{ 
          marginTop: '8px', 
          fontSize: '12px', 
          color: '#666',
          textAlign: 'center'
        }}>
          Test kartı: 4242 4242 4242 4242 | CVC: 123 | Tarix: 12/25
        </div>
      </div>
    </div>
  );
};

export default StripePaymentForm;