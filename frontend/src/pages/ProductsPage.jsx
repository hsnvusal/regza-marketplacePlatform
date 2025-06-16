import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import productService from '../services/productService';
import toastManager from '../utils/toastManager';
import './ProductsPage.css';

// 🚨 GLOBAL PROTECTION - Outside component to prevent all instances
const GLOBAL_PROCESSING = new Set();
const GLOBAL_LAST_CLICK = new Map();

const ProductsPage = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNext: false,
    hasPrev: false,
    limit: 12
  });

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    rating: '',
    vendor: '',
    sortBy: 'newest'
  });

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(new Set());
  const [blockedProducts, setBlockedProducts] = useState(new Set());
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  // Refs for stable references
  const filtersRef = useRef(filters);
  const paginationRef = useRef(pagination);
  
  // Update refs when values change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Initialize filters from URL params
  useEffect(() => {
    const urlFilters = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      rating: searchParams.get('rating') || '',
      vendor: searchParams.get('vendor') || '',
      sortBy: searchParams.get('sortBy') || 'newest',
    };

    const page = parseInt(searchParams.get('page')) || 1;

    setFilters(urlFilters);
    setSearchInput(urlFilters.search);
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, [searchParams]);

  // Stable loadProducts function
  const loadProducts = useCallback(async (filterParams = null, pageParams = null) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use passed parameters or current values
      const currentFilters = filterParams || filtersRef.current;
      const currentPagination = pageParams || paginationRef.current;

      const queryParams = {
        page: currentPagination.currentPage,
        limit: currentPagination.limit,
        status: 'active'
      };

      if (currentFilters.search?.trim()) queryParams.search = currentFilters.search.trim();
      if (currentFilters.category) queryParams.category = currentFilters.category;
      if (currentFilters.vendor) queryParams.vendor = currentFilters.vendor;
      if (currentFilters.minPrice) queryParams.minPrice = parseInt(currentFilters.minPrice);
      if (currentFilters.maxPrice) queryParams.maxPrice = parseInt(currentFilters.maxPrice);
      if (currentFilters.rating) queryParams.minRating = parseInt(currentFilters.rating);
      if (currentFilters.sortBy !== 'newest') queryParams.sortBy = currentFilters.sortBy;

      console.log('🔍 Loading products with params:', queryParams);

      const result = await productService.getProducts(queryParams);

      if (result.success) {
        let productsData = result.data.products || result.data || [];
        const paginationData = result.data.pagination || {};

        if (productsData.length > 0 && currentFilters.sortBy) {
          console.log('🔄 Applying client-side sort:', currentFilters.sortBy);
          productsData = [...productsData].sort((a, b) => {
            switch (currentFilters.sortBy) {
              case 'priceAsc':
                return (a.pricing?.sellingPrice || 0) - (b.pricing?.sellingPrice || 0);
              case 'priceDesc':
                return (b.pricing?.sellingPrice || 0) - (a.pricing?.sellingPrice || 0);
              case 'ratingDesc':
                return (b.ratings?.average || 0) - (a.ratings?.average || 0);
              case 'popular':
                return (b.ratings?.count || 0) - (a.ratings?.count || 0);
              case 'name':
                return (a.name || '').localeCompare(b.name || '', 'az');
              case 'oldest':
                if (a.createdAt && b.createdAt) {
                  return new Date(a.createdAt) - new Date(b.createdAt);
                }
                return 0;
              case 'newest':
              default:
                if (a.createdAt && b.createdAt) {
                  return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return 0;
            }
          });
          console.log('✅ Client-side sorting applied');
        }

        setProducts(productsData);
        setPagination(prev => ({
          ...prev,
          totalProducts: paginationData.totalProducts || productsData.length,
          totalPages: paginationData.totalPages || Math.ceil(productsData.length / prev.limit),
          hasNext: paginationData.hasNext || false,
          hasPrev: paginationData.hasPrev || false
        }));

        console.log('✅ Products loaded:', productsData.length);
      } else {
        console.log('⚠️ No products found or error:', result.error);
        setProducts([]);
        setPagination(prev => ({
          ...prev,
          totalProducts: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }));
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      setError(error.message);
      setProducts([]);
      setPagination(prev => ({
        ...prev,
        totalProducts: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load products only when filters or pagination actually change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(filters, pagination);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.category, filters.vendor, filters.minPrice, filters.maxPrice, filters.rating, filters.sortBy, pagination.currentPage, pagination.limit, loadProducts]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    console.log('🔄 Filter changed:', filterName, '=', value);

    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    if (filterName !== 'page') {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }

    updateURL(newFilters, filterName !== 'page' ? 1 : pagination.currentPage);
  };

  // Update URL parameters
  const updateURL = (newFilters, page = pagination.currentPage) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'newest') {
        params.set(key, value);
      }
    });

    if (page > 1) {
      params.set('page', page.toString());
    }

    setSearchParams(params);
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    handleFilterChange('search', searchInput);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setPagination(prev => ({ ...prev, currentPage: newPage }));
    handleFilterChange('page', newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      vendor: '',
      sortBy: 'newest'
    };

    setFilters(clearedFilters);
    setSearchInput('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setSearchParams(new URLSearchParams());
  };

  // 🚨 ULTIMATE AGGRESSIVE PROTECTION - Handle add to cart
  const handleAddToCart = useCallback(async (product) => {
    const productId = product._id;
    const userId = isLoggedIn ? 'user' : 'guest';
    const globalKey = `${userId}_${productId}`;
    const now = Date.now();
    
    console.log(`🚀 [${now}] handleAddToCart called for:`, product.name);
    
    // 🛑 GLOBAL AGGRESSIVE PROTECTION
    
    // 1. Global processing check (across all component instances)
    if (GLOBAL_PROCESSING.has(globalKey)) {
      console.log(`🚫 [${now}] GLOBAL BLOCKED - Already processing globally:`, product.name);
      return;
    }
    
    // 2. Global rapid click protection (3 seconds)
    const lastGlobalClick = GLOBAL_LAST_CLICK.get(globalKey) || 0;
    if (now - lastGlobalClick < 3000) {
      console.log(`🚫 [${now}] GLOBAL BLOCKED - Too rapid (${now - lastGlobalClick}ms ago):`, product.name);
      return;
    }
    
    // 3. Component level protection
    if (blockedProducts.has(productId)) {
      console.log(`🚫 [${now}] COMPONENT BLOCKED - Product blocked:`, product.name);
      return;
    }
    
    if (loadingProducts.has(productId)) {
      console.log(`🚫 [${now}] COMPONENT BLOCKED - Loading:`, product.name);
      return;
    }
    
    // 4. Auth check
    if (!isLoggedIn) {
      console.log(`🚫 [${now}] BLOCKED - Not logged in`);
      toastManager.error('Məhsul əlavə etmək üçün giriş edin');
      navigate('/login');
      return;
    }

    console.log(`✅ [${now}] PROCEEDING - All checks passed:`, product.name);

    // 🔒 IMMEDIATE GLOBAL AND LOCAL LOCKS
    GLOBAL_PROCESSING.add(globalKey);
    GLOBAL_LAST_CLICK.set(globalKey, now);
    setLoadingProducts(prev => new Set(prev).add(productId));
    setBlockedProducts(prev => new Set(prev).add(productId));
    
    // Auto unblock timers
    const unblockTimer = setTimeout(() => {
      console.log(`🔓 [${now + 5000}] AUTO-UNBLOCK:`, product.name);
      GLOBAL_PROCESSING.delete(globalKey);
      setBlockedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }, 5000);

    try {
      console.log(`🛒 [${now}] Making API call:`, product.name);
      
      const result = await addToCart(product, 1);
      
      console.log(`📦 [${now}] API result:`, result);
      
      if (result.success !== false) {
        console.log(`✅ [${now}] SUCCESS:`, product.name);
        toastManager.cartSuccess('Səbətə əlavə edildi', product.name);
      } else {
        console.log(`❌ [${now}] FAILED:`, result.error);
        toastManager.actionError('Səbətə əlavə edilərkən xəta baş verdi');
      }
    } catch (error) {
      console.error(`❌ [${now}] ERROR:`, error);
      
      // Check if it's a rate limit error
      if (error.response?.status === 429 || error.message.includes('429') || error.message.includes('Too many requests')) {
        console.log(`⏳ [${now}] Rate limited - extending block time`);
        toastManager.actionError('Çox tez istək. Bir az gözləyin.');
        
        // Extend block time for rate limit
        clearTimeout(unblockTimer);
        setTimeout(() => {
          GLOBAL_PROCESSING.delete(globalKey);
          setBlockedProducts(prev => {
            const newSet = new Set(prev);
            newSet.delete(productId);
            return newSet;
          });
        }, 10000); // 10 seconds for rate limit
        
      } else {
        toastManager.actionError('Səbətə əlavə edilərkən xəta baş verdi');
      }
    } finally {
      console.log(`🔄 [${now}] CLEANUP:`, product.name);
      
      // Always remove from loading
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      
      console.log(`✅ [${now}] CLEANUP COMPLETE:`, product.name);
    }
  }, [isLoggedIn, addToCart, navigate, loadingProducts, blockedProducts]);

  // Cleanup global state on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component cleanup - removing global locks');
      GLOBAL_PROCESSING.clear();
    };
  }, []);

  // Handle product click
  const handleProductClick = (productId) => {
    console.log('🔗 Navigating to product detail:', productId);
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

  // Calculate active filters
  const activeFiltersCount = Object.values(filters).filter(value => 
    value && value !== '' && value !== 'newest'
  ).length;

  // Loading state
  if (isLoading && products.length === 0) {
    return (
      <div className="products-page">
        <div className="container">
          <div className="products-loading">
            <div className="loading-spinner"></div>
            <p>Məhsullar yüklənir...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1>Məhsullar</h1>
          <p>Ən yaxşı qiymətlərlə keyfiyyətli məhsullar</p>
        </div>

        {/* Search and Controls */}
        <div className="products-controls">
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Məhsul, marka və ya kateqoriya axtarın..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                🔍 Axtar
              </button>
            </form>
          </div>

          <div className="filter-controls">
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔽 Filtrlər
              {activeFiltersCount > 0 && (
                <span className="filter-count">({activeFiltersCount})</span>
              )}
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => {
                console.log('🔄 Sort changed to:', e.target.value);
                handleFilterChange('sortBy', e.target.value);
              }}
              className="sort-select"
            >
              <option value="newest">Ən yeni</option>
              <option value="oldest">Ən köhnə</option>
              <option value="priceAsc">Qiymət: Aşağıdan yuxarı</option>
              <option value="priceDesc">Qiymət: Yuxarıdan aşağı</option>
              <option value="ratingDesc">Ən yüksək reytinq</option>
              <option value="popular">Ən populyar</option>
              <option value="name">Əlifba sırası</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-grid">
              <div className="filter-group">
                <label>Kateqoriya</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">Bütün kateqoriyalar</option>
                  <option value="electronics">Elektronika</option>
                  <option value="fashion">Moda</option>
                  <option value="home">Ev və Bağ</option>
                  <option value="sports">İdman</option>
                  <option value="books">Kitablar</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Qiymət aralığı</label>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    min="0"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Minimum reytinq</label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                >
                  <option value="">Bütün reytinqlər</option>
                  <option value="4">4+ ulduz</option>
                  <option value="3">3+ ulduz</option>
                  <option value="2">2+ ulduz</option>
                  <option value="1">1+ ulduz</option>
                </select>
              </div>

              <div className="filter-actions">
                <button onClick={clearFilters} className="clear-filters">
                  Filtrlərı təmizlə
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Info */}
        <div className="results-info">
          <p>
            {pagination.totalProducts > 0 ? (
              <>
                {pagination.totalProducts} məhsul tapıldı
                {filters.search && ` "${filters.search}" üçün`}
              </>
            ) : (
              <>
                Məhsul tapılmadı
                {filters.search && ` "${filters.search}" üçün`}
              </>
            )}
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map((product) => (
              <div key={product._id} className="product-card">
                <div 
                  className="product-image"
                  onClick={() => handleProductClick(product._id)}
                >
                  <span className="product-emoji">
                    {product.images?.[0]?.url || '📦'}
                  </span>
                  {product.featured && (
                    <div className="product-badge featured">Seçilmiş</div>
                  )}
                  {product.pricing?.discountPercentage > 0 && (
                    <div className="product-badge discount">
                      -{product.pricing.discountPercentage}%
                    </div>
                  )}
                </div>

                <div className="product-info">
                  <div className="product-vendor">
                    {product.vendor?.businessName || 'Store'}
                  </div>
                  
                  <h3 
                    className="product-title"
                    onClick={() => handleProductClick(product._id)}
                  >
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="product-description">
                      {product.description.length > 60 
                        ? `${product.description.substring(0, 60)}...`
                        : product.description
                      }
                    </p>
                  )}

                  <div className="product-rating">
                    <div className="stars">
                      {renderStars(product.ratings?.average || 0)}
                    </div>
                    <span className="rating-text">
                      {product.ratings?.average?.toFixed(1) || '0.0'} 
                      ({product.ratings?.count || 0} rəy)
                    </span>
                  </div>

                  <div className="product-price">
                    <span className="current-price">
                      {formatPrice(product.pricing?.sellingPrice || 0)}
                    </span>
                    {product.pricing?.originalPrice && 
                     product.pricing.originalPrice > product.pricing.sellingPrice && (
                      <span className="original-price">
                        {formatPrice(product.pricing.originalPrice)}
                      </span>
                    )}
                  </div>

                  <div className="product-actions">
                    <button
                      className={`add-to-cart ${loadingProducts.has(product._id) ? 'loading' : ''} ${blockedProducts.has(product._id) ? 'blocked' : ''}`}
                      onClick={() => handleAddToCart(product)}
                      disabled={loadingProducts.has(product._id) || blockedProducts.has(product._id) || product.status !== 'active'}
                      style={{
                        pointerEvents: (loadingProducts.has(product._id) || blockedProducts.has(product._id)) ? 'none' : 'auto',
                        opacity: blockedProducts.has(product._id) ? 0.5 : 1
                      }}
                    >
                      {loadingProducts.has(product._id) ? (
                        <>
                          <span className="spinner-small"></span>
                          Əlavə edilir...
                        </>
                      ) : blockedProducts.has(product._id) ? (
                        <>
                          ⏳ Gözləyin... (5s)
                        </>
                      ) : (
                        <>
                          🛒 Səbətə əlavə et
                        </>
                      )}
                    </button>

                    <button
                      className="quick-view"
                      onClick={() => handleProductClick(product._id)}
                    >
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && (
          <div className="no-products">
            <div className="no-products-icon">🔍</div>
            <h3>Məhsul tapılmadı</h3>
            <p>
              {filters.search 
                ? `"${filters.search}" üçün məhsul tapılmadı`
                : 'Seçilmiş filtrlərlə məhsul tapılmadı'
              }
            </p>
            <button onClick={clearFilters} className="clear-filters-btn">
              Filtrlərı təmizlə
            </button>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              ← Əvvəlki
            </button>

            <div className="page-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === pagination.totalPages || 
                  Math.abs(page - pagination.currentPage) <= 2
                )
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="page-ellipsis">...</span>
                    )}
                    <button
                      className={`page-number ${page === pagination.currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))
              }
            </div>

            <button
              className="page-btn"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Növbəti →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;