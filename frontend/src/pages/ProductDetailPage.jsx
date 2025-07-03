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

  // State idarəetməsi
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
  
  // İstəyə bağlı məlumatlar üçün ayrı yükləmə statusları
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [relatedError, setRelatedError] = useState(null);

  // Şəkil helper funksiyaları
  const getImageUrl = (product, imageIndex = 0) => {
    console.log('Məhsul şəkilləri üçün detail:', product?.images);
    
    if (!product) return `https://picsum.photos/600/600?random=${Math.floor(Math.random() * 1000)}`;
    
    // 1. Spesifik index şəkli varsa
    if (product.images && product.images[imageIndex]) {
      const image = product.images[imageIndex];
      return image.url || image;
    }
    
    // 2. mainImage varsa
    if (product.mainImage) {
      return product.mainImage;
    }
    
    // 3. İlk şəkil varsa
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return firstImage.url || firstImage;
    }
    
    // 4. Default placeholder
    return `https://picsum.photos/600/600?random=${Math.floor(Math.random() * 1000)}`;
  };

  const handleImageError = (e) => {
    console.log('Şəkil yükləmə xətası:', e.target.src);
    
    // Placeholder istifadə et
    if (!e.target.src.includes('via.placeholder')) {
      e.target.src = `https://via.placeholder.com/600x600/667eea/ffffff?text=${encodeURIComponent(product?.name?.substring(0, 10) || 'Məhsul')}`;
      return;
    }
    
    // Son cəhd: rəng ilə
    e.target.style.backgroundColor = '#667eea';
    e.target.style.display = 'flex';
    e.target.style.alignItems = 'center';
    e.target.style.justifyContent = 'center';
    e.target.style.color = 'white';
    e.target.style.fontSize = '24px';
    e.target.textContent = '📦';
  };

  // Oxşar məhsul şəkil helper
  const getRelatedImageUrl = (relatedProduct) => {
    if (!relatedProduct) return `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`;
    
    if (relatedProduct.mainImage) {
      return relatedProduct.mainImage;
    }
    
    if (relatedProduct.images && relatedProduct.images.length > 0) {
      const firstImage = relatedProduct.images[0];
      return firstImage.url || firstImage;
    }
    
    return `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`;
  };

  // Təkmilləşdirilmiş məlumat yükləmə ilə daha yaxşı xəta idarəetməsi
  useEffect(() => {
    console.log('🔍 ProductDetail useEffect id ilə işə salındı:', id);
    
    if (!id || !id.trim()) {
      console.error('❌ URL parametrlərində etibarlı məhsul ID-si tapılmadı');
      setError('Məhsul ID-si tapılmadı');
      setIsLoading(false);
      return;
    }

    loadAllData();
  }, [id]);

  // Təkmilləşdirilmiş xəta idarəetməsi ilə əsas yükləmə funksiyası
  const loadAllData = async () => {
    try {
      console.log('🚀 ID ilə məhsul yüklənir:', id);
      setIsLoading(true);
      setError(null);

      // Əsas məhsulu yüklə - bu kritikdir
      const result = await productService.getProductById(id);
      console.log('🔍 ProductService nəticəsi:', result);

      if (result.success && result.data) {
        console.log('✅ Məhsul uğurla yükləndi:', result.data);
        console.log('📝 Məhsul strukturu:', {
          id: result.data._id,
          name: result.data.name,
          pricing: result.data.pricing,
          images: result.data.images,
          description: result.data.description
        });
        
        setProduct(result.data);
        
        // Oxşar məhsulların əsas cavabda daxil olub-olmadığını yoxla
        if (result.data.relatedProducts && Array.isArray(result.data.relatedProducts)) {
          console.log('✅ Oxşar məhsullar əsas cavabda tapıldı:', result.data.relatedProducts.length);
          setRelatedProducts(result.data.relatedProducts);
          setRelatedLoading(false);
        } else {
          setRelatedLoading(false);
        }
        
        // Rəyləri mövcud deyil olaraq təyin et (hələlik)
        setReviewsLoading(false);
        setReviews([]);
        
      } else {
        console.error('❌ Məhsul yükləmə uğursuz oldu:', result.error);
        setError(result.error || 'Məhsul tapılmadı');
      }
    } catch (error) {
      console.error('❌ Məhsul yükləmə xətası:', error);
      setError(error.message || 'Məhsul yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  // Təkmilləşdirilmiş rəylər yükləmə - HƏLƏLİK DEAKTIV
  const loadReviews = async () => {
    console.log('📝 Rəylər yükləmə deaktivdir');
    setReviewsLoading(false);
    setReviews([]);
    setReviewsError('Rəylər xüsusiyyəti tezliklə əlavə ediləcək');
  };

  // Təkmilləşdirilmiş oxşar məhsullar yükləmə - DEAKTIV, ƏSAS API CAVABINI İSTİFADƏ EDİR
  const loadRelatedProducts = async () => {
    console.log('🔗 Oxşar məhsullar yükləmə deaktivdir - əsas API cavabını istifadə edir');
    setRelatedLoading(false);
  };

  // Səbətə əlavə etmə - yalnız səbət əməliyyatları üçün giriş tələb olunur
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
      console.error('Səbətə əlavə etmə xətası:', error);
      toast.error('Səbətə əlavə edilərkən xəta baş verdi');
    }
  };

  // İndi al - yalnız alış əməliyyatları üçün giriş tələb olunur
  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      toast.error('Alış-veriş üçün giriş edin');
      navigate('/login');
      return;
    }

    await handleAddToCart();
    navigate('/cart');
  };

  // Miqdar dəyişikliyi idarəetməsi
  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || product?.inventory?.stock || 999)) {
      setQuantity(newQuantity);
    }
  };

  // Oxşar məhsul kliki idarəetməsi
  const handleRelatedProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  // Uğursuz olan istəyə bağlı məlumatlar üçün yenidən cəhd funksiyası
  const retryOptionalData = () => {
    console.log('🔄 Yenidən cəhd deaktiv - bütün məhsul məlumatını yenidən yükləyir');
    loadAllData();
  };

  // Qiymət formatlaşdırması
  const formatPrice = (price) => {
    return new Intl.NumberFormat('az-AZ').format(price) + '₼';
  };

  // Ulduzları render et
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

  // Render üçün debug loglaşdırma
  console.log('🎨 ProductDetail render olunur məhsul ilə:', {
    hasProduct: !!product,
    productName: product?.name,
    productPricing: product?.pricing,
    isLoading,
    error
  });

  // Yükləmə vəziyyəti
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

  // Xəta vəziyyəti - yalnız kritik məhsul məlumatları üçün
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

        {/* Məhsul Əsas Bölməsi - ŞƏKİLLƏR DÜZƏLDILMIŞ */}
        <div className="product-main">
          {/* Məhsul Şəkilləri */}
          <div className="product-images">
            <div className="main-image">
              <div 
                className="image-container"
                onClick={() => setShowImageModal(true)}
              >
                <img
                  src={getImageUrl(product, selectedImage)}
                  alt={product.name || 'Məhsul'}
                  onError={handleImageError}
                  onLoad={() => console.log('✅ Ana şəkil yükləndi')}
                  style={{
                    width: '100%',
                    height: '400px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    cursor: 'zoom-in'
                  }}
                />
                {(product.pricing?.discountPercentage > 0 || product.discountPercentage > 0) && (
                  <div className="discount-badge">
                    -{product.pricing?.discountPercentage || product.discountPercentage}% ENDİRİM
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
                    <img
                      src={image.url || image}
                      alt={`${product.name} ${index + 1}`}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/80x80/667eea/ffffff?text=${index + 1}`;
                      }}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Məhsul Məlumatları */}
          <div className="product-info">
            {/* Satıcı */}
            <div className="product-vendor">
              {product.vendor?.businessName || product.brand || 'Mağaza'}
            </div>

            {/* Başlıq */}
            <h1 className="product-title">
              {product.name && product.name !== 'Məhsul adı yoxdur' 
                ? product.name 
                : 'Məhsul'}
            </h1>

            {/* Reytinq */}
            <div className="product-rating">
              <div className="stars">
                {renderStars(product.ratings?.average || 0)}
              </div>
              <span className="rating-text">
                {product.ratings?.average?.toFixed(1) || '0.0'} 
                ({product.ratings?.count || 0} rəy)
              </span>
            </div>

            {/* Qiymət */}
            <div className="product-price">
              <div className="current-price">
                {product.pricing?.sellingPrice && product.pricing.sellingPrice > 0
                  ? formatPrice(product.pricing.sellingPrice) 
                  : product.finalPrice && product.finalPrice > 0
                    ? formatPrice(product.finalPrice)
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
                    {formatPrice((product.pricing?.originalPrice || product.originalPrice || 0) - (product.pricing?.sellingPrice || product.finalPrice || product.price || 0))} qənaət
                  </span>
                </div>
              )}
            </div>

            {/* Stok Statusu */}
            <div className="stock-status">
              {(product.stock > 0 || product.inventory?.stock > 0 || product.quantity > 0 || product.isInStock || (!product.stock && !product.quantity && !product.inventory?.stock)) ? (
                <span className="in-stock">
                  ✅ Stokda var {(product.stock || product.inventory?.stock || product.quantity) ? `(${product.stock || product.inventory?.stock || product.quantity} ədəd)` : ''}
                </span>
              ) : (
                <span className="out-of-stock">
                  ❌ Stokda yoxdur
                </span>
              )}
            </div>

            {/* Miqdar Seçici */}
            {((product.stock && product.stock > 0) || (product.inventory?.stock && product.inventory.stock > 0) || (product.quantity && product.quantity > 0) || product.isInStock || (!product.stock && !product.quantity && !product.inventory?.stock)) && (
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
                    disabled={quantity >= (product.stock || product.inventory?.stock || product.quantity || 999)}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Əməliyyat Düymələri */}
            <div className="product-actions">
              <button
                className={`add-to-cart-btn ${cartLoading ? 'loading' : ''}`}
                onClick={handleAddToCart}
                disabled={cartLoading || (product.stock === 0 && product.quantity === 0 && product.inventory?.stock === 0 && !product.isInStock)}
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
                disabled={cartLoading || (product.stock === 0 && product.quantity === 0 && product.inventory?.stock === 0 && !product.isInStock)}
              >
                ⚡ İndi al
              </button>
            </div>

            {/* Məhsul Xüsusiyyətləri */}
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

        {/* Məhsul Təfsilatları Tabları */}
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
                  {product.description && product.description !== 'undefined...' && product.description !== '...' && product.description.trim()
                    ? product.description 
                    : product.shortDescription && product.shortDescription !== 'undefined...' && product.shortDescription !== '...' && product.shortDescription.trim()
                      ? product.shortDescription
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

                {product.tags && product.tags.length > 0 && (
                  <div className="product-tags">
                    <h4>Etiketlər:</h4>
                    <div className="tags-list">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
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
                      <td>{product.vendor?.businessName || product.brand || 'N/A'}</td>
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
                      <td>SKU</td>
                      <td>{product.sku || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Status</td>
                      <td>{product.status === 'active' ? 'Aktiv' : 'Deaktiv'}</td>
                    </tr>
                    <tr>
                      <td>Stok</td>
                      <td>{product.inventory?.stock || product.stock || product.quantity || 'Məlum deyil'}</td>
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
                    <tr>
                      <td>Yaradılma tarixi</td>
                      <td>{product.createdAt ? new Date(product.createdAt).toLocaleDateString('az-AZ') : 'Məlum deyil'}</td>
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

        {/* Oxşar Məhsullar Bölməsi - ŞƏKİLLƏR DÜZƏLDILMIŞ */}
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
                    <img
                      src={getRelatedImageUrl(relatedProduct)}
                      alt={relatedProduct.name || 'Oxşar məhsul'}
                      onError={(e) => {
                        if (!e.target.src.includes('via.placeholder')) {
                          e.target.src = `https://via.placeholder.com/200x200/667eea/ffffff?text=${encodeURIComponent(relatedProduct.name?.substring(0, 5) || 'Məhsul')}`;
                        } else {
                          e.target.style.backgroundColor = '#667eea';
                          e.target.style.color = 'white';
                          e.target.textContent = '📦';
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                  <div className="related-info">
                    <h4>{relatedProduct.name}</h4>
                    <div className="related-price">
                      {formatPrice(relatedProduct.finalPrice || relatedProduct.pricing?.sellingPrice || relatedProduct.price || 0)}
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

        {/* Əlavə Məhsul Məlumatları Bölməsi */}
        <div className="additional-info">
          <div className="info-grid">
            {/* Məhsul Statistikaları */}
            <div className="info-card">
              <h4>📊 Məhsul Statistikası</h4>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label">Baxış sayı:</span>
                  <span className="stat-value">{product.stats?.views || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Satış sayı:</span>
                  <span className="stat-value">{product.stats?.purchases || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Wishlist-də:</span>
                  <span className="stat-value">{product.stats?.wishlisted || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Reytinq:</span>
                  <span className="stat-value">{product.ratings?.average?.toFixed(1) || '0.0'}/5.0</span>
                </div>
              </div>
            </div>

            {/* Çatdırılma Məlumatları */}
            <div className="info-card">
              <h4>🚚 Çatdırılma Məlumatları</h4>
              <div className="shipping-info">
                <div className="shipping-item">
                  <span className="shipping-icon">📦</span>
                  <div className="shipping-details">
                    <strong>Standart çatdırılma</strong>
                    <p>2-3 iş günü, 5₼</p>
                  </div>
                </div>
                <div className="shipping-item">
                  <span className="shipping-icon">⚡</span>
                  <div className="shipping-details">
                    <strong>Sürətli çatdırılma</strong>
                    <p>1 iş günü, 10₼</p>
                  </div>
                </div>
                <div className="shipping-item">
                  <span className="shipping-icon">🎁</span>
                  <div className="shipping-details">
                    <strong>Pulsuz çatdırılma</strong>
                    <p>50₼-dən yuxarı sifarişlər üçün</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Təhlükəsizlik Məlumatları */}
            <div className="info-card">
              <h4>🔒 Təhlükəsizlik</h4>
              <div className="security-list">
                <div className="security-item">
                  <span className="security-icon">✅</span>
                  <span>SSL şifrələmə</span>
                </div>
                <div className="security-item">
                  <span className="security-icon">✅</span>
                  <span>Təhlükəsiz ödəniş</span>
                </div>
                <div className="security-item">
                  <span className="security-icon">✅</span>
                  <span>Məlumat qorunması</span>
                </div>
                <div className="security-item">
                  <span className="security-icon">✅</span>
                  <span>Zəmanət dəstəyi</span>
                </div>
              </div>
            </div>

            {/* Qaytarma Siyasəti */}
            <div className="info-card">
              <h4>↩️ Qaytarma Siyasəti</h4>
              <div className="return-policy">
                <p><strong>7 gün qaytarma garantisi</strong></p>
                <ul>
                  <li>Məhsul orijinal qablaşdırmada olmalıdır</li>
                  <li>İstifadə edilməmiş vəziyyətdə olmalıdır</li>
                  <li>Qaytarma səbəbi göstərilməlidir</li>
                  <li>Çatdırılma xərci alıcı tərəfindən ödənilir</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Bölməsi */}
        <div className="faq-section">
          <h3>❓ Tez-tez verilən suallar</h3>
          <div className="faq-list">
            <div className="faq-item">
              <h4>Bu məhsul necə istifadə olunur?</h4>
              <p>Məhsulun istifadə təlimatları qablaşdırmanın içərisində mövcuddur. Əlavə məlumat üçün müştəri xidmətləri ilə əlaqə saxlayın.</p>
            </div>
            <div className="faq-item">
              <h4>Zəmanət müddəti nə qədərdir?</h4>
              <p>Bu məhsul üçün 1 il rəsmi zəmanət təqdim edilir. Zəmanət şərtləri haqqında ətraflı məlumat satış qaimələrində göstərilir.</p>
            </div>
            <div className="faq-item">
              <h4>Çatdırılma nə qədər vaxt aparır?</h4>
              <p>Standart çatdırılma 2-3 iş günü, sürətli çatdırılma 1 iş günü aparır. Bazar və bayram günləri çatdırılma həyata keçirilmir.</p>
            </div>
            <div className="faq-item">
              <h4>Ödəniş üsulları hansılardır?</h4>
              <p>Nağd ödəniş, bank kartı, bank köçürməsi və online ödəniş üsulları ilə ödəniş edə bilərsiniz.</p>
            </div>
          </div>
        </div>

        {/* Son baxılan məhsullar */}
        <div className="recently-viewed">
          <h3>👁️ Son baxılan məhsullar</h3>
          <p>Bu xüsusiyyət tezliklə əlavə ediləcək</p>
        </div>

        {/* Şəkil Modal - ŞƏKİL DÜZƏLDILMIŞ */}
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
                <img
                  src={getImageUrl(product, selectedImage)}
                  alt={product.name || 'Məhsul'}
                  onError={handleImageError}
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="modal-navigation">
                  <button 
                    className="modal-nav-btn prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => prev > 0 ? prev - 1 : product.images.length - 1);
                    }}
                    disabled={product.images.length <= 1}
                  >
                    ← Əvvəlki
                  </button>
                  <span className="modal-counter">
                    {selectedImage + 1} / {product.images.length}
                  </span>
                  <button 
                    className="modal-nav-btn next"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => prev < product.images.length - 1 ? prev + 1 : 0);
                    }}
                    disabled={product.images.length <= 1}
                  >
                    Növbəti →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Əlavə stilizasiya üçün CSS */}
      <style jsx>{`
        .additional-info {
          margin: 3rem 0;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        
        .info-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1px solid #f1f3f4;
        }
        
        .info-card h4 {
          margin: 0 0 1rem;
          color: #2d3748;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stat-label {
          color: #718096;
          font-size: 0.9rem;
        }
        
        .stat-value {
          font-weight: 600;
          color: #2d3748;
        }
        
        .shipping-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .shipping-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .shipping-icon {
          font-size: 1.25rem;
        }
        
        .shipping-details strong {
          display: block;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }
        
        .shipping-details p {
          margin: 0;
          color: #718096;
          font-size: 0.9rem;
        }
        
        .security-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .security-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4a5568;
        }
        
        .return-policy ul {
          margin: 0.75rem 0 0;
          padding-left: 1.25rem;
        }
        
        .return-policy li {
          margin-bottom: 0.5rem;
          color: #718096;
          font-size: 0.9rem;
        }
        
        .faq-section {
          margin: 3rem 0;
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .faq-section h3 {
          margin: 0 0 1.5rem;
          color: #2d3748;
          font-size: 1.5rem;
        }
        
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .faq-item h4 {
          margin: 0 0 0.5rem;
          color: #2d3748;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .faq-item p {
          margin: 0;
          color: #718096;
          line-height: 1.6;
        }
        
        .recently-viewed {
          margin: 2rem 0;
          text-align: center;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 12px;
        }
        
        .recently-viewed h3 {
          margin: 0 0 0.5rem;
          color: #2d3748;
        }
        
        .recently-viewed p {
          margin: 0;
          color: #a0aec0;
        }
        
        .image-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          position: relative;
          max-width: 95vw;
          max-height: 95vh;
        }
        
        .modal-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          z-index: 1001;
        }
        
        .modal-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding: 0 1rem;
        }
        
        .modal-nav-btn {
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        
        .modal-nav-btn:hover {
          background: rgba(0,0,0,0.8);
        }
        
        .modal-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .modal-counter {
          color: white;
          font-size: 0.9rem;
          background: rgba(0,0,0,0.7);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }
        
        .product-tags {
          margin-top: 1rem;
        }
        
        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .tag {
          background: #e2e8f0;
          color: #4a5568;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .modal-navigation {
            flex-direction: column;
            gap: 1rem;
          }
          
          .faq-section {
            padding: 1.5rem;
          }
          
          .additional-info {
            margin: 2rem 0;
          }
          
          .modal-close {
            top: -30px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;