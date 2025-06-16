import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import productService from '../services/productService';
import toast from 'react-hot-toast';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, isLoading: cartLoading } = useCart();
  const { isLoggedIn } = useAuth();

  // State management
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('description');
  const [showImageModal, setShowImageModal] = useState(false);
  
  // NEW: Separate loading states for optional data
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [relatedError, setRelatedError] = useState(null);

  // Enhanced data loading with better error handling
  useEffect(() => {
    console.log('🔍 ProductDetail useEffect triggered with id:', id);
    
    if (!id || !id.trim()) {
      console.error('❌ No valid product ID found in URL params');
      setError('Məhsul ID-si tapılmadı');
      setIsLoading(false);
      return;
    }

    loadAllData();
  }, [id]);

  // Main loading function with enhanced error handling
  const loadAllData = async () => {
    try {
      console.log('🚀 Loading product with ID:', id);
      setIsLoading(true);
      setError(null);

      // Load main product - this is critical
      const result = await productService.getProductById(id);
      console.log('🔍 ProductService result:', result);

      if (result.success && result.data) {
        console.log('✅ Product loaded successfully:', result.data);
        console.log('📝 Product structure:', {
          id: result.data._id,
          name: result.data.name,
          pricing: result.data.pricing,
          images: result.data.images,
          description: result.data.description
        });
        
        setProduct(result.data);
        
        // Check if related products are included in the main response
        if (result.data.relatedProducts && Array.isArray(result.data.relatedProducts)) {
          console.log('✅ Related products found in main response:', result.data.relatedProducts.length);
          setRelatedProducts(result.data.relatedProducts);
          setRelatedLoading(false); // Set loading false since we have data
        } else {
          setRelatedLoading(false); // No related products, stop loading
        }
        
        // Disable optional data loading since we handle it differently now
        // loadOptionalData();
        
        // Set reviews as not available (for now)
        setReviewsLoading(false);
        setReviews([]);
        
      } else {
        console.error('❌ Product loading failed:', result.error);
        setError(result.error || 'Məhsul tapılmadı');
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
      setError(error.message || 'Məhsul yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  // Load optional data (reviews & related products) with graceful fallbacks
  const loadOptionalData = () => {
    // Skip loading since we handle this differently now
    console.log('📋 Optional data loading skipped - using main API response');
    
    // Reviews are disabled for now
    setReviewsLoading(false);
    setReviews([]);
    
    // Related products come from main API response
    setRelatedLoading(false);
  };

  // Enhanced reviews loading - DISABLED FOR NOW
  const loadReviews = async () => {
    console.log('📝 Reviews loading is disabled');
    setReviewsLoading(false);
    setReviews([]);
    setReviewsError('Rəylər xüsusiyyəti tezliklə əlavə ediləcək');
  };

  // Enhanced related products loading - DISABLED, USING MAIN API RESPONSE
  const loadRelatedProducts = async () => {
    console.log('🔗 Related products loading is disabled - using main API response');
    // This function is no longer needed since related products come from main API
    setRelatedLoading(false);
  };

  // Handle add to cart - login required only for cart actions
  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast.error('Səbətə əlavə etmək üçün giriş edin');
      navigate('/login');
      return;
    }

    if (!product) return;

    try {
      await addToCart(product, quantity, selectedVariant);
      toast.success(`${product.name} səbətə əlavə edildi`);
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Səbətə əlavə edilərkən xəta baş verdi');
    }
  };

  // Handle buy now - login required only for purchase actions
  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      toast.error('Alış-veriş üçün giriş edin');
      navigate('/login');
      return;
    }

    await handleAddToCart();
    navigate('/cart');
  };

  // Handle quantity change
  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 999)) {
      setQuantity(newQuantity);
    }
  };

  // Handle related product click
  const handleRelatedProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  // Retry function for failed optional data - DISABLED
  const retryOptionalData = () => {
    console.log('🔄 Retry disabled - reloading entire product data');
    loadAllData(); // Reload the entire product instead
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('az-AZ').format(price) + '₼';
  };

  // Render stars
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star filled">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return stars;
  };

  // Debug logging for render
  console.log('🎨 Rendering ProductDetail with product:', {
    hasProduct: !!product,
    productName: product?.name,
    productPricing: product?.pricing,
    isLoading,
    error
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="product-loading">
            <div className="loading-spinner"></div>
            <p>Məhsul yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - only for critical product data
  if (error || !product) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="product-error">
            <div className="error-icon">❌</div>
            <h2>Məhsul tapılmadı</h2>
            <p>{error || 'Bu məhsul mövcud deyil və ya silinib'}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/products')} className="back-btn">
                Məhsullara qayıt
              </button>
              <button onClick={loadAllData} className="retry-btn">
                🔄 Yenidən cəhd et
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <button onClick={() => navigate('/')}>Ana səhifə</button>
          <span>/</span>
          <button onClick={() => navigate('/products')}>Məhsullar</button>
          <span>/</span>
          <span>{product.category?.name || 'Məhsul'}</span>
          <span>/</span>
          <span className="current">{product.name}</span>
        </div>

        {/* Product Main Section */}
        <div className="product-main">
          {/* Product Images */}
          <div className="product-images">
            <div className="main-image">
              <div 
                className="image-container"
                onClick={() => setShowImageModal(true)}
              >
                <span className="product-emoji">
                  {product.images?.[selectedImage]?.url || product.images?.[0]?.url || '📦'}
                </span>
                {product.pricing?.discountPercentage > 0 && (
                  <div className="discount-badge">
                    -{product.pricing.discountPercentage}% ENDIRIM
                  </div>
                )}
              </div>
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <span className="thumb-emoji">
                      {image.url || '📦'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            {/* Vendor */}
            <div className="product-vendor">
              {product.vendor?.businessName || 'Store'}
            </div>

            {/* Title */}
            <h1 className="product-title">
              {product.name && product.name !== 'Məhsul adı yoxdur' 
                ? product.name 
                : 'Məhsul'}
            </h1>

            {/* Rating */}
            <div className="product-rating">
              <div className="stars">
                {renderStars(product.ratings?.average || 0)}
              </div>
              <span className="rating-text">
                {product.ratings?.average?.toFixed(1) || '0.0'} 
                ({product.ratings?.count || 0} rəy)
              </span>
            </div>

            {/* Price */}
            <div className="product-price">
              <div className="current-price">
                {product.pricing?.sellingPrice && product.pricing.sellingPrice > 0
                  ? formatPrice(product.pricing.sellingPrice) 
                  : product.price && product.price > 0
                    ? formatPrice(product.price)
                    : 'Qiymət məlum deyil'
                }
              </div>
              {((product.pricing?.originalPrice && product.pricing.originalPrice > (product.pricing.sellingPrice || 0)) ||
                (product.originalPrice && product.originalPrice > (product.price || 0))) && (
                <div className="price-info">
                  <span className="original-price">
                    {formatPrice(product.pricing?.originalPrice || product.originalPrice || 0)}
                  </span>
                  <span className="savings">
                    {formatPrice((product.pricing?.originalPrice || product.originalPrice || 0) - (product.pricing?.sellingPrice || product.price || 0))} qənaət
                  </span>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="stock-status">
              {(product.stock > 0 || product.quantity > 0 || (!product.stock && !product.quantity)) ? (
                <span className="in-stock">
                  ✅ Stokda var {product.stock || product.quantity ? `(${product.stock || product.quantity} ədəd)` : ''}
                </span>
              ) : (
                <span className="out-of-stock">
                  ❌ Stokda yoxdur
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {((product.stock && product.stock > 0) || (product.quantity && product.quantity > 0) || (!product.stock && !product.quantity)) && (
              <div className="quantity-section">
                <label>Miqdar:</label>
                <div className="quantity-controls">
                  <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="qty-btn"
                  >
                    -
                  </button>
                  <span className="quantity">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.stock || product.quantity || 999)}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="product-actions">
              <button
                className={`add-to-cart-btn ${cartLoading ? 'loading' : ''}`}
                onClick={handleAddToCart}
                disabled={cartLoading || (product.stock === 0 && product.quantity === 0)}
              >
                {cartLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Əlavə edilir...
                  </>
                ) : (
                  <>
                    🛒 Səbətə əlavə et
                  </>
                )}
              </button>

              <button
                className="buy-now-btn"
                onClick={handleBuyNow}
                disabled={cartLoading || (product.stock === 0 && product.quantity === 0)}
              >
                ⚡ İndi al
              </button>
            </div>

            {/* Product Features */}
            <div className="product-features">
              <div className="feature">
                <span className="icon">🚚</span>
                <span className="text">Pulsuz çatdırılma (50₼-dən yuxarı)</span>
              </div>
              <div className="feature">
                <span className="icon">↩️</span>
                <span className="text">7 gün qaytarma garantisi</span>
              </div>
              <div className="feature">
                <span className="icon">🛡️</span>
                <span className="text">Rəsmi zəmanət</span>
              </div>
              <div className="feature">
                <span className="icon">💳</span>
                <span className="text">Təhlükəsiz ödəniş</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="product-tabs">
          <div className="tab-headers">
            <button 
              className={`tab-header ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Təsvir
            </button>
            <button 
              className={`tab-header ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('specifications')}
            >
              Xüsusiyyətlər
            </button>
            <button 
              className={`tab-header ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Rəylər ({reviews.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'description' && (
              <div className="description-tab">
                <h3>Məhsul haqqında</h3>
                <p>
                  {product.description && product.description !== 'undefined...' && product.description !== '...'
                    ? product.description 
                    : 'Bu məhsul haqqında ətraflı məlumat hal-hazırda mövcud deyil.'}
                </p>
                
                {product.features && product.features.length > 0 && (
                  <div className="product-highlights">
                    <h4>Əsas xüsusiyyətlər:</h4>
                    <ul>
                      {product.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="specifications-tab">
                <h3>Texniki xüsusiyyətlər</h3>
                <table className="specs-table">
                  <tbody>
                    <tr>
                      <td>Marka</td>
                      <td>{product.vendor?.businessName || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Kateqoriya</td>
                      <td>{product.category?.name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Model</td>
                      <td>{product.model || product.name}</td>
                    </tr>
                    <tr>
                      <td>Çəki</td>
                      <td>{product.weight || 'Məlum deyil'}</td>
                    </tr>
                    <tr>
                      <td>Ölçülər</td>
                      <td>{product.dimensions || 'Məlum deyil'}</td>
                    </tr>
                    <tr>
                      <td>Rəng</td>
                      <td>{product.color || 'Müxtəlif'}</td>
                    </tr>
                    {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-tab">
                <h3>Müştəri rəyləri</h3>
                
                {/* Enhanced Reviews Section with working productService */}
                {reviewsLoading ? (
                  <div className="reviews-loading">
                    <div className="loading-spinner"></div>
                    <p>Rəylər yüklənir...</p>
                  </div>
                ) : reviewsError ? (
                  <div className="reviews-error">
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      <p>{reviewsError}</p>
                      <small>Rəylər yükləmə xətası</small>
                    </div>
                    <button onClick={loadReviews} className="retry-btn-small">
                      🔄 Yenidən cəhd et
                    </button>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="reviews-list">
                    {reviews.map((review, index) => (
                      <div key={review._id || index} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <span className="reviewer-name">
                              {review.user?.firstName || review.userName || 'Anonim'} {review.user?.lastName?.[0] || ''}.
                            </span>
                            <div className="review-stars">
                              {renderStars(review.rating || 0)}
                            </div>
                          </div>
                          <span className="review-date">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString('az-AZ') : 'Tarix yoxdur'}
                          </span>
                        </div>
                        <p className="review-comment">{review.comment || review.text || 'Rəy mətni yoxdur'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <span className="no-reviews-icon">💭</span>
                    <p>Hələ heç bir rəy yoxdur.</p>
                    <small>İlk rəy yazan siz olun!</small>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Related Products Section with working productService */}
        <div className="related-products">
          <h3>Oxşar məhsullar</h3>
          
          {relatedLoading ? (
            <div className="related-loading">
              <div className="loading-spinner"></div>
              <p>Oxşar məhsullar yüklənir...</p>
            </div>
          ) : relatedError ? (
            <div className="related-error">
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <p>{relatedError}</p>
                <small>Oxşar məhsullar yükləmə xətası</small>
              </div>
              <button onClick={loadRelatedProducts} className="retry-btn-small">
                🔄 Yenidən cəhd et
              </button>
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="related-grid">
              {relatedProducts.map((relatedProduct) => (
                <div 
                  key={relatedProduct._id} 
                  className="related-product-card"
                  onClick={() => handleRelatedProductClick(relatedProduct._id)}
                >
                  <div className="related-image">
                    <span className="related-emoji">
                      {relatedProduct.images?.[0]?.url || '📦'}
                    </span>
                  </div>
                  <div className="related-info">
                    <h4>{relatedProduct.name}</h4>
                    <div className="related-price">
                      {formatPrice(relatedProduct.pricing?.sellingPrice || relatedProduct.price || 0)}
                    </div>
                    <div className="related-rating">
                      {renderStars(relatedProduct.ratings?.average || relatedProduct.rating || 0)}
                      <span>({relatedProduct.ratings?.count || relatedProduct.reviewCount || 0})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-related">
              <span className="no-related-icon">🔗</span>
              <p>Oxşar məhsul tapılmadı</p>
              <small>Bu məhsulla bağlı oxşar məhsullar mövcud deyil</small>
            </div>
          )}
        </div>

        {/* Image Modal */}
        {showImageModal && (
          <div className="image-modal" onClick={() => setShowImageModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="modal-close"
                onClick={() => setShowImageModal(false)}
              >
                ✕
              </button>
              <div className="modal-image">
                <span className="modal-emoji">
                  {product.images?.[selectedImage]?.url || '📦'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;