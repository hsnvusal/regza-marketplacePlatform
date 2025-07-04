import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toastManager from '../utils/toastManager';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import cartService from '../services/cartService';
import './Home.css';

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingFeaturedProducts, setLoadingFeaturedProducts] = useState(true);
  const [apiErrors, setApiErrors] = useState({});
  const navigate = useNavigate();

  // Hardcoded stats - these could also come from an analytics API later
  const stats = React.useMemo(() => [
    { number: '2.5M+', label: 'Aktiv İstifadəçi', icon: '👥' },
    { number: '150K+', label: 'Etibar edilən Satıcı', icon: '🏪' },
    { number: '50M+', label: 'Məhsul Çeşidi', icon: '📦' },
    { number: '99.9%', label: 'Müştəri Məmnuniyyəti', icon: '⭐' }
  ], []);

  // Load featured categories from API
  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      console.log('🔍 Loading featured categories...');
      
      const response = await categoryService.getFeaturedCategories(6);
      
      if (response.success && response.data?.categories) {
        const formattedCategories = response.data.categories.map(category => ({
          id: category._id || category.id,
          icon: getCategoryIcon(category.name || category.slug),
          title: category.name,
          description: category.description || `${category.name} kateqoriyasında ən yaxşı məhsullar`,
          color: category.color || getRandomColor(),
          slug: category.slug,
          productCount: category.productCount || 0
        }));
        
        setCategories(formattedCategories);
        console.log('✅ Categories loaded:', formattedCategories.length);
      } else {
        console.warn('⚠️ No categories found, using fallback');
        setCategories(getFallbackCategories());
        setApiErrors(prev => ({ ...prev, categories: response.error }));
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      setCategories(getFallbackCategories());
      setApiErrors(prev => ({ ...prev, categories: error.message }));
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Load featured products from API
  const loadFeaturedProducts = useCallback(async () => {
    try {
      setLoadingFeaturedProducts(true);
      console.log('🔍 Loading featured products...');
      
      const response = await productService.getFeaturedProducts(4);
      
      if (response.success && response.data?.products) {
        const formattedProducts = response.data.products.map(product => ({
          id: product._id || product.id,
          image: getProductEmoji(product.category || product.categoryLegacy),
          vendor: getVendorName(product.vendor || product.vendorInfo),
          title: product.name,
          rating: product.ratings?.average || 4.5,
          reviews: product.ratings?.count || 0,
          currentPrice: formatPrice(product.pricing?.sellingPrice || product.finalPrice),
          originalPrice: product.pricing?.discountPrice ? formatPrice(product.pricing.sellingPrice) : null,
          discount: product.discountPercentage ? `-${product.discountPercentage}%` : null,
          badge: getProductBadge(product),
          badgeColor: getBadgeColor(product),
          stock: product.inventory?.stock || 0,
          isInStock: product.isInStock !== false
        }));
        
        setFeaturedProducts(formattedProducts);
        console.log('✅ Featured products loaded:', formattedProducts.length);
      } else {
        console.warn('⚠️ No featured products found, using fallback');
        setFeaturedProducts(getFallbackProducts());
        setApiErrors(prev => ({ ...prev, products: response.error }));
      }
    } catch (error) {
      console.error('❌ Error loading featured products:', error);
      setFeaturedProducts(getFallbackProducts());
      setApiErrors(prev => ({ ...prev, products: error.message }));
    } finally {
      setLoadingFeaturedProducts(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 Home page loading started...');
      
      // Load cart count from localStorage or API
      const savedCartCount = localStorage.getItem('cartCount');
      if (savedCartCount) {
        setCartCount(parseInt(savedCartCount, 10));
      }

      // Load categories and products in parallel
      await Promise.all([
        loadCategories(),
        loadFeaturedProducts()
      ]);

      console.log('✅ Home page data loaded');
      setIsLoading(false);
    };

    loadData();
  }, [loadCategories, loadFeaturedProducts]);

  // Handle category navigation
  const handleCategoryClick = useCallback((category) => {
    if (category.slug) {
      navigate(`/products?category=${category.slug}`);
    } else {
      navigate(`/products?category=${category.id}`);
    }
  }, [navigate]);

  // Handle add to cart with real API integration
  const handleAddToCart = useCallback(async (productId) => {
    try {
      console.log('🛒 Adding to cart:', productId);
      
      setLoadingProducts(prev => new Set(prev).add(productId));
      
      // Find product to get its details
      const product = featuredProducts.find(p => p.id === productId);
      
      if (!product) {
        throw new Error('Məhsul tapılmadı');
      }

      if (!product.isInStock) {
        throw new Error('Məhsul stokda yoxdur');
      }

      // Call cart service to add product
      const cartData = {
        productId: productId,
        quantity: 1,
        selectedVariants: {}
      };

      const response = await cartService.addToCart(cartData);
      
      if (response.success) {
        // Update cart count
        const newCartCount = cartCount + 1;
        setCartCount(newCartCount);
        localStorage.setItem('cartCount', newCartCount.toString());
        
        // Show success message
        toastManager.cartSuccess('Məhsul səbətə əlavə edildi', product.title);
        console.log('✅ Product added to cart successfully');
      } else {
        throw new Error(response.error || 'Səbətə əlavə etmə uğursuz');
      }
      
    } catch (error) {
      console.error('❌ Add to cart error:', error);
      toastManager.error(error.message || 'Səbətə əlavə etmə xətası');
    } finally {
      // Remove loading after delay
      setTimeout(() => {
        setLoadingProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }, 1000);
    }
  }, [featuredProducts, cartCount]);

  // Helper functions
  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'electronics': '📱',
      'technology': '📱',
      'texnologiya': '📱',
      'fashion': '👗',
      'moda': '👗',
      'geyim': '👗',
      'home': '🏠',
      'ev': '🏠',
      'gaming': '🎮',
      'oyun': '🎮',
      'beauty': '💄',
      'gözəllik': '💄',
      'sports': '⚽',
      'idman': '⚽',
      'automotive': '🚗',
      'books': '📚',
      'kitab': '📚',
      'food': '🍕',
      'toys': '🧸'
    };
    
    const key = (categoryName || '').toLowerCase();
    return iconMap[key] || '📦';
  };

  const getProductEmoji = (category) => {
    const emojiMap = {
      'electronics': '📱',
      'technology': '💻', 
      'fashion': '👟',
      'home': '🏠',
      'gaming': '🎮',
      'beauty': '💄',
      'sports': '⚽',
      'automotive': '🚗',
      'books': '📚',
      'food': '🍕'
    };
    
    return emojiMap[category] || '📦';
  };

  const getVendorName = (vendor) => {
    if (typeof vendor === 'string') return vendor;
    if (vendor?.businessName) return vendor.businessName;
    if (vendor?.firstName && vendor?.lastName) {
      return `${vendor.firstName} ${vendor.lastName}`;
    }
    return 'MarketPlace Satıcısı';
  };

  const formatPrice = (price) => {
    if (!price) return '0₼';
    return `${parseFloat(price).toLocaleString()}₼`;
  };

  const getProductBadge = (product) => {
    if (product.featured) return 'Seçilmiş';
    if (product.newArrival) return 'Yeni Gəliş';
    if (product.bestSeller) return 'Ən Çox Satan';
    if (product.pricing?.discountPrice) return 'Endirim';
    return 'Premium';
  };

  const getBadgeColor = (product) => {
    if (product.featured) return '#8b5cf6';
    if (product.newArrival) return '#10b981';
    if (product.bestSeller) return '#f59e0b';
    if (product.pricing?.discountPrice) return '#ef4444';
    return '#6b7280';
  };

  const getRandomColor = () => {
    const colors = [
      '#667eea', '#f093fb', '#4facfe', '#43e97b', 
      '#ff6b9d', '#feca57', '#ff9ff3', '#54a0ff'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Fallback data in case API fails
  const getFallbackCategories = () => [
    {
      id: 'technology',
      icon: '📱',
      title: 'Texnologiya & Elektronika',
      description: 'Ən son texnologiya məhsulları, smartfonlar, laptoplar və aksesuarlar',
      color: '#667eea'
    },
    {
      id: 'fashion',
      icon: '👗',
      title: 'Moda & Geyim',
      description: 'Dünya brendlərindən ən trendy geyimlər və aksesuarlar',
      color: '#f093fb'
    },
    {
      id: 'home',
      icon: '🏠',
      title: 'Ev & Yaşayış',
      description: 'Ev üçün hər şey - mebel, dekor və məişət texnikası',
      color: '#4facfe'
    },
    {
      id: 'gaming',
      icon: '🎮',
      title: 'Oyun & Əyləncə',
      description: 'Oyun konsolları, oyunlar və əyləncə sistemləri',
      color: '#43e97b'
    }
  ];

  const getFallbackProducts = () => [
    {
      id: 'fallback-1',
      image: '📱',
      vendor: 'Apple Store Azerbaijan',
      title: 'iPhone 15 Pro Max 512GB',
      rating: 4.9,
      reviews: 2847,
      currentPrice: '2,999₼',
      originalPrice: '3,999₼',
      discount: '-25%',
      badge: 'Endirim',
      badgeColor: '#ef4444',
      isInStock: true
    },
    {
      id: 'fallback-2',
      image: '👟',
      vendor: 'Nike Official Store',
      title: 'Nike Air Max 270 React',
      rating: 4.7,
      reviews: 1523,
      currentPrice: '249₼',
      badge: 'Yeni Gəliş',
      badgeColor: '#10b981',
      isInStock: true
    }
  ];

  // Show loading screen
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <div className="loading-text">MarketPlace Pro yüklənir...</div>
        {Object.keys(apiErrors).length > 0 && (
          <div className="loading-errors">
            <small>Bəzi məlumatlar yüklənmədi, əsas funksionallıq işləyir</small>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Gələcəyin E-commerce Platforması</h1>
            <p className="hero-subtitle">
              50+ milyon məhsul, 150,000+ etibar edilən satıcı və ən yaxşı qiymətlər - 
              hamısı bir yerdə, premium təcrübə ilə
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn-hero btn-hero-primary">
                <span>🛍️</span>
                Alış-verişə başla
              </Link>
              <Link to="/vendor/register" className="btn-hero btn-hero-secondary">
                <span>🏪</span>
                Satıcı ol
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Premium Kateqoriyalar</h2>
            <p className="section-subtitle">
              Ən yüksək keyfiyyətli məhsullarla dolu kateqoriyalarımızı kəşf edin
            </p>
            {apiErrors.categories && (
              <div className="api-error-notice">
                <small>⚠️ Kateqoriyalar yüklənmədi: {apiErrors.categories}</small>
              </div>
            )}
          </div>
          
          {loadingCategories ? (
            <div className="category-grid-loading">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="category-card-skeleton">
                  <div className="skeleton-icon"></div>
                  <div className="skeleton-title"></div>
                  <div className="skeleton-description"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="category-grid">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="category-card"
                  onClick={() => handleCategoryClick(category)}
                  style={{ '--category-color': category.color }}
                >
                  <div className="category-icon">{category.icon}</div>
                  <h3 className="category-title">{category.title}</h3>
                  <p className="category-description">{category.description}</p>
                  {category.productCount > 0 && (
                    <div className="category-product-count">
                      {category.productCount} məhsul
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="products">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Tövsiyə Olunan Məhsullar</h2>
            <p className="section-subtitle">
              Ən çox satılan və yüksək reytinqli premium məhsullarımızı kəşf edin
            </p>
            {apiErrors.products && (
              <div className="api-error-notice">
                <small>⚠️ Məhsullar yüklənmədi: {apiErrors.products}</small>
              </div>
            )}
          </div>
          
          {loadingFeaturedProducts ? (
            <div className="product-grid-loading">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="product-card-skeleton">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-vendor"></div>
                  <div className="skeleton-title"></div>
                  <div className="skeleton-rating"></div>
                  <div className="skeleton-price"></div>
                  <div className="skeleton-button"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((product, index) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    <span className="product-emoji">{product.image}</span>
                    <div 
                      className="product-badge"
                      style={{ backgroundColor: product.badgeColor }}
                    >
                      {product.badge}
                    </div>
                    {!product.isInStock && (
                      <div className="out-of-stock-overlay">
                        Stokda yoxdur
                      </div>
                    )}
                  </div>
                  <div className="product-info">
                    <div className="product-vendor">{product.vendor}</div>
                    <h3 className="product-title">{product.title}</h3>
                    <div className="product-rating">
                      <span className="rating-stars">
                        {'★'.repeat(Math.floor(product.rating))}
                        {product.rating % 1 !== 0 && '☆'}
                      </span>
                      <span className="rating-text">
                        {product.rating} ({product.reviews.toLocaleString()} rəy)
                      </span>
                    </div>
                    <div className="product-price">
                      <span className="current-price">{product.currentPrice}</span>
                      {product.originalPrice && (
                        <>
                          <span className="original-price">{product.originalPrice}</span>
                          <span className="discount-badge">{product.discount}</span>
                        </>
                      )}
                    </div>
                    <div className="product-actions">
                      <button 
                        className={`add-to-cart ${loadingProducts.has(product.id) ? 'loading' : ''} ${!product.isInStock ? 'disabled' : ''}`}
                        onClick={() => handleAddToCart(product.id)}
                        disabled={loadingProducts.has(product.id) || !product.isInStock}
                      >
                        {loadingProducts.has(product.id) ? (
                          <>
                            <span className="spinner-small"></span>
                            Əlavə edilir...
                          </>
                        ) : !product.isInStock ? (
                          <>
                            ❌ Stokda yoxdur
                          </>
                        ) : (
                          <>
                            🛒 Səbətə əlavə et
                          </>
                        )}
                      </button>
                      <button className="wishlist-btn">♡</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="section-footer">
            <Link to="/products" className="view-all-btn">
              Bütün məhsulları gör
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter">
        <div className="container">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Xüsusi Təkliflərdən Xəbərdar Olun</h2>
            <p className="newsletter-description">
              Ən yaxşı endirimləri, yeni məhsulları və ekskluziv təklifləri ilk öncə öğrenin
            </p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                className="newsletter-input" 
                placeholder="E-mail ünvanınızı daxil edin" 
                required 
              />
              <button type="submit" className="newsletter-btn">
                Abunə Ol
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;