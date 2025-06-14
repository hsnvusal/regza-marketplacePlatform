import React, { useState, useEffect, useCallback } from 'react';
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

  // DEBUG INFO
  console.log('🚀 ProductDetail component rendered');
  console.log('🔍 URL param ID:', id);
  console.log('🔍 ID type:', typeof id);
  console.log('🔍 ID length:', id?.length);
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 useParams result:', { id });

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

  // Load product data
  useEffect(() => {
    console.log('🔍 ProductDetail useEffect triggered with id:', id);
    if (id && id.trim()) {
      console.log('🚀 ID exists, calling loadProduct()');
      // Load main product immediately
      loadProduct();
    } else {
      console.error('❌ No valid product ID found in URL params');
      setError('Məhsul ID-si tapılmadı');
      setIsLoading(false);
    }
  }, [id, loadProduct]);

  // Load additional data separately
  useEffect(() => {
    if (id && id.trim()) {
      console.log('🔍 Loading additional data (reviews, related)');
      const timer = setTimeout(() => {
        loadReviews();
        loadRelatedProducts();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [id]);

  // Load main product - make sure it's defined before useEffect
  const loadProduct = useCallback(async () => {
    try {
      console.log('🚀 loadProduct function called');
      console.log('🔍 About to call setIsLoading(true)');
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading product with ID:', id);
      console.log('🔍 Product ID type:', typeof id);
      console.log('🔍 Product ID length:', id?.length);

      if (!id || id.trim() === '') {
        throw new Error('Məhsul ID-si boşdur');
      }

      console.log('🚀 About to call productService.getProductById');
      const result = await productService.getProductById(id);

      console.log('🔍 ProductService result:', result);

      if (result.success) {
        console.log('✅ Product loaded successfully:', result.data);
        setProduct(result.data);
      } else {
        console.error('❌ Product loading failed:', result.error);
        setError(result.error || 'Məhsul tapılmadı');
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
      setError(error.message || 'Məhsul yüklənərkən xəta baş verdi');
    } finally {
      console.log('🔍 Setting isLoading to false');
      setIsLoading(false);
    }
  }, [id]);

  // Load product reviews
  const loadReviews = async () => {
    try {
      console.log('🔍 Loading reviews for product:', id);
      const result = await productService.getProductReviews(id, { limit: 10 });
      if (result.success) {
        setReviews(result.data.reviews || []);
        console.log('✅ Reviews loaded:', result.data.reviews?.length || 0);
      } else {
        console.log('⚠️ Reviews not available:', result.error);
        setReviews([]); // Set empty array if not available
      }
    } catch (error) {
      console.warn('⚠️ Could not load reviews:', error.message);
      setReviews([]); // Set empty array on error
    }
  };

  // Load related products
  const loadRelatedProducts = async () => {
    try {
      console.log('🔍 Loading related products for:', id);
      const result = await productService.getRelatedProducts(id, 6);
      if (result.success) {
        setRelatedProducts(result.data.products || []);
        console.log('✅ Related products loaded:', result.data.products?.length || 0);
      } else {
        console.log('⚠️ Related products not available:', result.error);
        setRelatedProducts([]); // Set empty array if not available
      }
    } catch (error) {
      console.warn('⚠️ Could not load related products:', error.message);
      setRelatedProducts([]); // Set empty array on error
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast.error('Giriş edin və ya qeydiyyatdan keçin');
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

  // Handle buy now
  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      toast.error('Giriş edin və ya qeydiyyatdan keçin');
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

  // Loading state - temporary reduced
  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="product-loading">
            <div className="loading-spinner"></div>
            <p>Məhsul yüklənir... (ID: {id})</p>
            <p>Loading state: {isLoading ? 'true' : 'false'}</p>
            <p>Product: {product ? 'loaded' : 'null'}</p>
            <p>Error: {error || 'none'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="product-detail">
        <div className="container">
          <div className="product-error">
            <div className="error-icon">❌</div>
            <h2>Məhsul tapılmadı</h2>
            <p>{error || 'Bu məhsul mövcud deyil və ya silinib'}</p>
            <button onClick={() => navigate('/products')} className="back-btn">
              Məhsullara qayıt
            </button>
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
            <h1 className="product-title">{product.name}</h1>

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
                {formatPrice(product.pricing?.sellingPrice || 0)}
              </div>
              {product.pricing?.originalPrice && 
               product.pricing.originalPrice > product.pricing.sellingPrice && (
                <div className="price-info">
                  <span className="original-price">
                    {formatPrice(product.pricing.originalPrice)}
                  </span>
                  <span className="savings">
                    {formatPrice(product.pricing.originalPrice - product.pricing.sellingPrice)} qənaət
                  </span>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="stock-status">
              {product.stock > 0 ? (
                <span className="in-stock">
                  ✅ Stokda var ({product.stock} ədəd)
                </span>
              ) : (
                <span className="out-of-stock">
                  ❌ Stokda yoxdur
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {product.stock > 0 && (
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
                    disabled={quantity >= product.stock}
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
                disabled={cartLoading || product.stock <= 0}
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
                disabled={cartLoading || product.stock <= 0}
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
                <p>{product.description || 'Bu məhsul haqqında ətraflı məlumat yoxdur.'}</p>
                
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
                
                {reviews.length > 0 ? (
                  <div className="reviews-list">
                    {reviews.map((review) => (
                      <div key={review._id} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <span className="reviewer-name">
                              {review.user?.firstName || 'Anonim'} {review.user?.lastName?.[0] || ''}.
                            </span>
                            <div className="review-stars">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString('az-AZ')}
                          </span>
                        </div>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>Hələ heç bir rəy yoxdur. İlk rəy yazan siz olun!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h3>Oxşar məhsullar</h3>
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
                      {formatPrice(relatedProduct.pricing?.sellingPrice || 0)}
                    </div>
                    <div className="related-rating">
                      {renderStars(relatedProduct.ratings?.average || 0)}
                      <span>({relatedProduct.ratings?.count || 0})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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