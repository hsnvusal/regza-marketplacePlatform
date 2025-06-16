import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toastManager from '../utils/toastManager';

const CartPage = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
  const { 
    cartItems = [], 
    total: cartTotal = 0,
    itemCount: cartItemsCount = 0,
    subtotal = 0,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isLoading: cartLoading = false 
  } = useCart() || {};

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState({ discount: 0, description: '' });
  const [shippingOption, setShippingOption] = useState('standard');

  // Safe number helper
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Promo codes
  const promoCodes = {
    'WELCOME10': { discount: 10, type: 'percentage', description: '10% endirim' },
    'SAVE20': { discount: 20, type: 'fixed', description: '20 AZN endirim' },
    'NEWUSER': { discount: 15, type: 'percentage', description: '15% yeni istifadəçi endirimi' }
  };

  // Shipping options
  const shippingOptions = [
    { id: 'standard', name: 'Standart çatdırılma', price: 5, days: '3-5 iş günü' },
    { id: 'express', name: 'Sürətli çatdırılma', price: 15, days: '1-2 iş günü' },
    { id: 'free', name: 'Pulsuz çatdırılma', price: 0, days: '5-7 iş günü', minOrder: 100 }
  ];

  // Calculate totals
  const safeCartTotal = safeNumber(subtotal);
  const selectedShipping = shippingOptions.find(opt => opt.id === shippingOption);
  const canUseFreeShipping = safeCartTotal >= 100;
  const shippingCost = shippingOption === 'free' && canUseFreeShipping ? 0 : safeNumber(selectedShipping?.price);
  const discountAmount = discount.type === 'percentage' 
    ? (safeCartTotal * safeNumber(discount.discount)) / 100 
    : safeNumber(discount.discount);
  const finalTotal = Math.max(0, safeCartTotal - discountAmount + shippingCost);

  // Handle quantity change
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    try {
      const result = await updateQuantity(itemId, newQuantity);
      if (!result.success) {
        toastManager.error(result.error || 'Miqdar yenilənmədi');
      }
    } catch (error) {
      toastManager.error('Miqdar yenilənmədi');
    }
  };

  // Remove item
  const handleRemoveItem = async (itemId) => {
    try {
      const result = await removeFromCart(itemId);
      if (!result.success) {
        toastManager.error(result.error || 'Məhsul silinmədi');
      }
    } catch (error) {
      toastManager.error('Məhsul silinmədi');
    }
  };

  // Clear cart
  const handleClearCart = async () => {
    if (window.confirm('Bütün məhsulları səbətdən silmək istəyirsiniz?')) {
      try {
        await clearCart();
      } catch (error) {
        toastManager.error('Səbət təmizlənmədi');
      }
    }
  };

  // Apply promo
  const handleApplyPromo = () => {
    const code = promoCodes[promoCode.toUpperCase()];
    if (code) {
      setDiscount(code);
      toastManager.success(`${code.description} tətbiq edildi!`);
    } else {
      toastManager.error('Yanlış promo kodu');
      setDiscount({ discount: 0 });
    }
  };

  // Remove promo
  const handleRemovePromo = () => {
    setDiscount({ discount: 0 });
    setPromoCode('');
    toastManager.info('Promo kod silindi');
  };

  // Checkout
  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toastManager.warning('Checkout üçün daxil olmalısınız');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toastManager.error('Səbət boşdur');
      return;
    }

    setIsCheckingOut(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await clearCart();
      toastManager.success('Sifariş uğurla yerləşdirildi!');
      navigate('/orders');
    } catch (error) {
      toastManager.error('Sifariş zamanı xəta baş verdi');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Loading state
  if (cartLoading) {
    return (
      <div className="cart-loading">
        <div className="spinner"></div>
        <p>Səbət yüklənir...</p>
      </div>
    );
  }

  // Empty cart
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-content">
          <div className="empty-icon">🛒</div>
          <h1>Səbətiniz boşdur</h1>
          <p>Hələ heç bir məhsul əlavə etməmisiniz.</p>
          <Link to="/products" className="shop-btn">
            🛍️ Alış-verişə başla
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          <div>
            <h1>🛒 Alış-veriş Səbəti</h1>
            <p>{safeNumber(cartItemsCount)} məhsul - {safeCartTotal.toFixed(2)} AZN</p>
          </div>
          
          {cartItems.length > 0 && (
            <button onClick={handleClearCart} className="clear-btn">
              🗑️ Səbəti təmizlə
            </button>
          )}
        </div>

        <div className="cart-grid">
          {/* Cart Items */}
          <div className="cart-items">
            <h2>Məhsullar ({cartItems.length})</h2>

            <div className="items-list">
              {cartItems.map((item, index) => {
                if (!item || typeof item !== 'object') return null;

                const itemId = item.id || item._id || `item_${index}`;
                const product = item.product || item;
                const productName = product.name || item.name || 'Məhsul adı';
                const productImage = product.image || item.image;
                
                let productVendor = 'Satıcı';
                if (typeof product.vendor === 'string') {
                  productVendor = product.vendor;
                } else if (product.vendor && product.vendor.name) {
                  productVendor = product.vendor.name;
                } else if (product.vendor && product.vendor.businessName) {
                  productVendor = product.vendor.businessName;
                } else if (product.brand) {
                  productVendor = product.brand;
                }
                
                const productSku = product.sku || item.sku || '';
                const unitPrice = safeNumber(item.unitPrice || item.price || product.currentPrice || 0);
                const quantity = safeNumber(item.quantity || 1);
                const totalPrice = unitPrice * quantity;

                return (
                  <div key={itemId} className="cart-item">
                    {/* Product Image */}
                    <div className="item-image">
                      {productImage ? (
                        <img src={productImage} alt={productName} />
                      ) : (
                        <span className="no-image">📦</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="item-info">
                      <h3>{productName}</h3>
                      <p className="item-meta">
                        {productVendor}{productSku && ` • ${productSku}`}
                      </p>
                      <p className="item-price">{unitPrice.toFixed(2)} AZN</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="quantity-controls">
                      <button 
                        onClick={() => handleQuantityChange(itemId, quantity - 1)}
                        disabled={cartLoading}
                        className="qty-btn"
                      >
                        −
                      </button>
                      <span className="quantity">{quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(itemId, quantity + 1)}
                        disabled={cartLoading}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="item-total">
                      <p>{totalPrice.toFixed(2)} AZN</p>
                    </div>

                    {/* Remove Button */}
                    <button 
                      onClick={() => handleRemoveItem(itemId)}
                      disabled={cartLoading}
                      className="remove-btn"
                      title="Məhsulu sil"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Sidebar */}
          <div className="checkout-sidebar">
            <h2>Sifariş xülasəsi</h2>

            {/* Promo Code */}
            <div className="promo-section">
              <label>Promo kod</label>
              <div className="promo-input">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
                {safeNumber(discount.discount) > 0 ? (
                  <button onClick={handleRemovePromo} className="remove-promo-btn">
                    ✕
                  </button>
                ) : (
                  <button onClick={handleApplyPromo} className="apply-promo-btn">
                    Tətbiq et
                  </button>
                )}
              </div>
              {safeNumber(discount.discount) > 0 && (
                <p className="promo-success">
                  ✅ {discount.description || 'Endirim'} tətbiq edildi
                </p>
              )}
            </div>

            {/* Shipping Options */}
            <div className="shipping-section">
              <label>Çatdırılma</label>
              {shippingOptions.map((option) => (
                <label key={option.id} className="shipping-option">
                  <input
                    type="radio"
                    name="shipping"
                    value={option.id}
                    checked={shippingOption === option.id}
                    onChange={(e) => setShippingOption(e.target.value)}
                    disabled={option.id === 'free' && !canUseFreeShipping}
                  />
                  <div className="option-info">
                    <div className="option-name">{option.name}</div>
                    <div className="option-days">
                      {option.days}
                      {option.minOrder && !canUseFreeShipping && 
                        ` (min ${option.minOrder} AZN)`
                      }
                    </div>
                  </div>
                  <div className="option-price">
                    {option.id === 'free' && canUseFreeShipping ? 'Pulsuz' : `${option.price} AZN`}
                  </div>
                </label>
              ))}
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <div className="summary-line">
                <span>Məhsullar:</span>
                <span>{safeCartTotal.toFixed(2)} AZN</span>
              </div>
              
              {safeNumber(discount.discount) > 0 && (
                <div className="summary-line discount">
                  <span>Endirim:</span>
                  <span>-{discountAmount.toFixed(2)} AZN</span>
                </div>
              )}
              
              <div className="summary-line">
                <span>Çatdırılma:</span>
                <span>{shippingCost === 0 ? 'Pulsuz' : `${shippingCost.toFixed(2)} AZN`}</span>
              </div>
              
              <div className="summary-total">
                <span>Ümumi:</span>
                <span>{finalTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || cartItems.length === 0}
              className="checkout-btn"
            >
              {isCheckingOut ? '⏳ Sifarişlənir...' : '💳 Sifariş et'}
            </button>

            {/* Continue Shopping */}
            <Link to="/products" className="continue-shopping">
              ← Alış-verişə davam et
            </Link>

            {/* Security Notice */}
            <div className="security-notice">
              🔒 Təhlükəsiz ödəniş təmin edilir
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .cart-page {
          padding: 6rem 2rem 2rem;
          min-height: calc(100vh - 80px);
          background-color: #f8fafc;
        }

        .cart-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .cart-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-cart {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
        }

        .empty-cart-content {
          text-align: center;
          max-width: 500px;
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .empty-cart h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #1f2937;
          font-weight: 700;
        }

        .empty-cart p {
          font-size: 1.2rem;
          color: #64748b;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .shop-btn {
          display: inline-block;
          padding: 14px 28px;
          background-color: #6366f1;
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .shop-btn:hover {
          background-color: #5338ea;
          transform: translateY(-2px);
        }

        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .cart-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #1f2937;
          font-weight: 700;
        }

        .cart-header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        .clear-btn {
          padding: 10px 20px;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          align-items: start;
        }

        .cart-items {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .cart-items h2 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #1f2937;
          font-weight: 600;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cart-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          transition: border-color 0.2s;
          background-color: white;
        }

        .item-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          overflow: hidden;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          font-size: 2rem;
        }

        .item-info {
          flex: 1;
          margin-right: 1rem;
        }

        .item-info h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .item-meta {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .item-price {
          font-size: 1.1rem;
          font-weight: 600;
          color: #059669;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-right: 1rem;
        }

        .qty-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 2px solid #e5e7eb;
          background-color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .qty-btn:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .quantity {
          min-width: 40px;
          text-align: center;
          font-size: 1rem;
          font-weight: 600;
        }

        .item-total {
          text-align: right;
          margin-right: 1rem;
          min-width: 100px;
        }

        .item-total p {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1f2937;
        }

        .remove-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background-color: #fef2f2;
          color: #dc2626;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .remove-btn:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .checkout-sidebar {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: sticky;
          top: 100px;
        }

        .checkout-sidebar h2 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #1f2937;
          font-weight: 600;
        }

        .promo-section, .shipping-section {
          margin-bottom: 1.5rem;
        }

        .promo-section label, .shipping-section label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .promo-input {
          display: flex;
          gap: 0.5rem;
        }

        .promo-input input {
          flex: 1;
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }

        .apply-promo-btn {
          padding: 10px 12px;
          background-color: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .remove-promo-btn {
          padding: 10px 12px;
          background-color: #dc2626;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .promo-success {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #059669;
          font-weight: 500;
        }

        .shipping-option {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          background-color: white;
        }

        .shipping-option input {
          margin-right: 0.75rem;
        }

        .option-info {
          flex: 1;
        }

        .option-name {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
        }

        .option-days {
          font-size: 0.8rem;
          color: #64748b;
        }

        .option-price {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
        }

        .order-summary {
          border-top: 2px solid #f1f5f9;
          padding-top: 1rem;
          margin-bottom: 1.5rem;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .summary-line.discount span:last-child {
          color: #059669;
          font-weight: 500;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .summary-total span:last-child {
          color: #059669;
        }

        .checkout-btn {
          width: 100%;
          padding: 14px;
          background-color: #6366f1;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 1rem;
        }

        .checkout-btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .checkout-btn:not(:disabled):hover {
          background-color: #5338ea;
        }

        .continue-shopping {
          display: block;
          text-align: center;
          padding: 12px;
          color: #6366f1;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
        }

        .security-notice {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f0fdf4;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
          display: flex;
          align-items: center;
          font-size: 0.85rem;
          color: #166534;
        }

        @media (max-width: 768px) {
          .cart-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .cart-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .item-image {
            align-self: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CartPage;