// src/components/PaymentModal.jsx - FIXED VERSION
import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from './StripePaymentForm';
import './PaymentModal.css'; // CSS faylını əlavə edin

// ⚠️ Vite üçün import.meta.env istifadə edin
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PaymentModal = ({
  isOpen,
  onClose,
  amount,
  currency,
  customerInfo,
  orderInfo,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [step, setStep] = useState('form'); // 'form', 'processing', 'success', 'error'

  // Debug logs
  console.log('💳 PaymentModal props:', {
    isOpen,
    amount,
    currency,
    customerInfo,
    orderInfo
  });

  console.log('🔑 Stripe Publishable Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Loaded ✅' : 'Missing ❌');

  const handlePaymentSuccess = (paymentResult) => {
    console.log('✅ PaymentModal: Payment successful!', paymentResult);
    setStep('success');
    setTimeout(() => {
      onPaymentSuccess(paymentResult);
      onClose();
    }, 2000);
  };

  const handlePaymentError = (error) => {
    console.error('❌ PaymentModal: Payment error!', error);
    setStep('error');
    onPaymentError(error);
    setTimeout(() => {
      setStep('form');
    }, 3000);
  };

  const handleCancel = () => {
    console.log('🚫 PaymentModal: Payment cancelled');
    setStep('form');
    onClose();
  };

  if (!isOpen) return null;

  // Check if Stripe is configured
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="payment-modal-overlay">
        <div className="payment-modal">
          <div className="modal-header">
            <h2>⚠️ Stripe Konfiqurasiya Xətası</h2>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
          <div className="modal-content">
            <div className="payment-error">
              <div className="error-icon">❌</div>
              <h3>Stripe açarı tapılmadı</h3>
              <p>VITE_STRIPE_PUBLISHABLE_KEY .env faylında təyin edilməyib</p>
              <button onClick={onClose} className="error-btn">Bağla</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <h2>💳 Təhlükəsiz Ödəniş (Stripe)</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-content">
          {step === 'form' && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                amount={amount}
                currency={currency}
                customerInfo={customerInfo}
                orderInfo={orderInfo}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handleCancel}
              />
            </Elements>
          )}

          {step === 'processing' && (
            <div className="payment-processing">
              <div className="processing-spinner"></div>
              <h3>Ödəniş edilir...</h3>
              <p>Zəhmət olmasa gözləyin, ödənişiniz təsdiq edilir.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="payment-success">
              <div className="success-icon">✅</div>
              <h3>Ödəniş Uğurludur!</h3>
              <p>Sifarişiniz təsdiqləndi və email göndərildi.</p>
              <div className="amount-display">
                ${(amount / 100).toFixed(2)} {currency?.toUpperCase()}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="payment-error">
              <div className="error-icon">❌</div>
              <h3>Ödəniş Uğursuz</h3>
              <p>Zəhmət olmasa kartınızı yoxlayın və yenidən cəhd edin.</p>
              <button 
                onClick={() => setStep('form')} 
                className="retry-btn"
              >
                🔄 Yenidən cəhd et
              </button>
            </div>
          )}
        </div>

        {/* Debug info (only in development) */}
        {import.meta.env.DEV && (
          <div className="debug-info" style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            fontSize: '12px',
            color: '#666',
            backgroundColor: '#f0f0f0',
            padding: '5px',
            borderRadius: '3px'
          }}>
            Amount: ${(amount / 100).toFixed(2)} | Step: {step}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;