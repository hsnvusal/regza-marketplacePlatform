import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { number: '2.5M+', label: 'Aktiv İstifadəçi', icon: '👥' },
    { number: '150K+', label: 'Etibar edilən Satıcı', icon: '🏪' },
    { number: '50M+', label: 'Məhsul Çeşidi', icon: '📦' },
    { number: '99.9%', label: 'Müştəri Məmnuniyyəti', icon: '⭐' }
  ];

  const categories = [
    {
      id: 'technology',
      icon: '📱',
      title: 'Texnologiya & Elektronika',
      description: 'Ən son texnologiya məhsulları, smartfonlar, laptoplar, aksesuarlar və daha çoxu',
      color: '#667eea'
    },
    {
      id: 'fashion',
      icon: '👗',
      title: 'Moda & Geyim',
      description: 'Dünya brendlərindən ən trendy geyimlər, ayaqqabılar və aksesuarlar',
      color: '#f093fb'
    },
    {
      id: 'home',
      icon: '🏠',
      title: 'Ev & Yaşayış',
      description: 'Ev üçün hər şey - mebel, dekor, məişət texnikası və bağçılıq',
      color: '#4facfe'
    },
    {
      id: 'gaming',
      icon: '🎮',
      title: 'Oyun & Əyləncə',
      description: 'Oyun konsolları, oyunlar, VR cihazları və əyləncə sistemləri',
      color: '#43e97b'
    },
    {
      id: 'beauty',
      icon: '💄',
      title: 'Gözəllik & Sağlamlıq',
      description: 'Premium kosmetika, parfüm, şəxsi baxım və sağlamlıq məhsulları',
      color: '#ff6b9d'
    },
    {
      id: 'sports',
      icon: '⚽',
      title: 'İdman & Fitness',
      description: 'İdman geyimləri, fitness avadanlıqları və outdoor fəaliyyət məhsulları',
      color: '#feca57'
    }
  ];

  const featuredProducts = [
    {
      id: 'iphone',
      image: '📱',
      vendor: 'Apple Store Azerbaijan',
      title: 'iPhone 15 Pro Max 512GB Titan Blue',
      rating: 4.9,
      reviews: 2847,
      currentPrice: '2,999₼',
      originalPrice: '3,999₼',
      discount: '-25%',
      badge: 'Endirim',
      badgeColor: '#ef4444'
    },
    {
      id: 'nike',
      image: '👟',
      vendor: 'Nike Official Store',
      title: 'Nike Air Max 270 React Premium',
      rating: 4.7,
      reviews: 1523,
      currentPrice: '249₼',
      badge: 'Yeni Gəliş',
      badgeColor: '#10b981'
    },
    {
      id: 'macbook',
      image: '💻',
      vendor: 'Apple Store Azerbaijan',
      title: 'MacBook Pro 16" M3 Max 1TB',
      rating: 4.8,
      reviews: 956,
      currentPrice: '5,499₼',
      originalPrice: '5,999₼',
      discount: '-8%',
      badge: 'Ən Çox Satan',
      badgeColor: '#f59e0b'
    },
    {
      id: 'airpods',
      image: '🎧',
      vendor: 'Audio World',
      title: 'AirPods Pro 2nd Gen with MagSafe',
      rating: 4.9,
      reviews: 3421,
      currentPrice: '449₼',
      originalPrice: '499₼',
      discount: '-10%',
      badge: 'Premium',
      badgeColor: '#8b5cf6'
    }
  ];

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${categoryId}`);
  };

  const handleAddToCart = (productId) => {
    setCartCount(prev => prev + 1);
    showToast('Məhsul səbətə əlavə edildi!', 'success');
  };

  const showToast = (message, type = 'success') => {
    // Toast implementation will be added later
    console.log(`Toast [${type}]: ${message}`);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <div className="loading-text">MarketPlace Pro yüklənir...</div>
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
              Ən yüksək keyfiyyətli məhsullarla dolu kateqoriyalarımızı kəşf edin və 
              ideal alış-veriş təcrübəsi yaşayın
            </p>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleCategoryClick(category.id)}
                style={{ '--category-color': category.color }}
              >
                <div className="category-icon">{category.icon}</div>
                <h3 className="category-title">{category.title}</h3>
                <p className="category-description">{category.description}</p>
              </div>
            ))}
          </div>
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
          </div>
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
                      className="add-to-cart"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      🛒 Səbətə əlavə et
                    </button>
                    <button className="wishlist-btn">♡</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            <form className="newsletter-form">
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