import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import './AdminProducts.css';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    totalProducts: 0,
    currentPage: 1,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    vendor: 'all',
    search: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // table | grid
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadProducts = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getProducts(filters);
      
      if (result.success) {
        setProducts(Array.isArray(result.products) ? result.products : []);
        setPagination({
          totalProducts: result.pagination?.totalProducts || result.pagination?.total || 0,
          currentPage: result.pagination?.currentPage || result.pagination?.current || 1,
          totalPages: result.pagination?.totalPages || result.pagination?.pages || 1,
          hasPrevPage: result.pagination?.hasPrevPage || result.pagination?.hasPrev || false,
          hasNextPage: result.pagination?.hasNextPage || result.pagination?.hasNext || false
        });
      } else {
        setError(result.error || 'Məhsullar yüklənərkən xəta baş verdi');
        setProducts([]);
      }
    } catch (error) {
      console.error('Products loading error:', error);
      setError('Məhsullar yüklənərkən xəta baş verdi');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [categoriesResult, vendorsResult] = await Promise.all([
        adminService.getCategories({ limit: 100 }),
        adminService.getVendors({ status: 'approved' })
      ]);

      if (categoriesResult.success && Array.isArray(categoriesResult.categories)) {
        const activeCategories = categoriesResult.categories.filter(cat => cat.isActive);
        setCategories(activeCategories);
      }

      if (vendorsResult.success && Array.isArray(vendorsResult.vendors)) {
        setVendors(vendorsResult.vendors);
      }
    } catch (error) {
      console.error('Filters loading error:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setFilters(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  const handleStatusUpdate = async (productId, newStatus) => {
    if (!window.confirm(`Məhsul statusunu "${getStatusText(newStatus)}" olaraq dəyişmək istəyirsiniz?`)) {
      return;
    }

    try {
      const result = await adminService.updateProductStatus(productId, {
        status: newStatus
      });
      
      if (result.success) {
        loadProducts();
        alert('Məhsul statusu yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Status yeniləmə xətası');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bu məhsulu silmək istədiyinizə əminsiniz?')) {
      return;
    }

    try {
      const result = await adminService.deleteProduct(productId);
      
      if (result.success) {
        loadProducts();
        alert('Məhsul silindi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silinmə xətası');
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'active': 'Aktiv',
      'inactive': 'Deaktiv', 
      'pending': 'Gözləyir',
      'rejected': 'Rədd edilib',
      'draft': 'Qaralama',
      'out_of_stock': 'Stokda yox',
      'discontinued': 'Dayandırılıb'
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status) => {
    const config = {
      'active': { bg: '#10b981', color: 'white', text: 'Aktiv', icon: '✅' },
      'inactive': { bg: '#6b7280', color: 'white', text: 'Deaktiv', icon: '❌' },
      'pending': { bg: '#f59e0b', color: 'white', text: 'Gözləyir', icon: '⏳' },
      'rejected': { bg: '#ef4444', color: 'white', text: 'Rədd edilib', icon: '🚫' },
      'draft': { bg: '#8b5cf6', color: 'white', text: 'Qaralama', icon: '📝' },
      'out_of_stock': { bg: '#f97316', color: 'white', text: 'Stokda yox', icon: '📦' },
      'discontinued': { bg: '#64748b', color: 'white', text: 'Dayandırılıb', icon: '⛔' }
    };
    
    const style = config[status] || config.inactive;
    
    return (
      <span className={`status-badge status-${status}`}>
        <span className="status-icon">{style.icon}</span>
        <span className="status-text">{style.text}</span>
      </span>
    );
  };

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('az-AZ').format(amount) + '₼';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('az-AZ', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      category: 'all',
      vendor: 'all',
      search: '',
      priceMin: '',
      priceMax: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    });
  };

  // Quick Stats
  const getQuickStats = () => {
    if (!Array.isArray(products)) return { total: 0, active: 0, lowStock: 0, pending: 0 };
    
    return {
      total: pagination.totalProducts || 0,
      active: products.filter(p => p.status === 'active').length,
      lowStock: products.filter(p => 
        (p.inventory?.stock || p.stock || 0) <= (p.inventory?.lowStockThreshold || p.lowStockThreshold || 5)
      ).length,
      pending: products.filter(p => p.status === 'pending').length
    };
  };

  const stats = getQuickStats();

  if (isLoading) {
    return (
      <div className="admin-products">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>Məhsullar yüklənir...</h3>
          <p>Zəhmət olmasa gözləyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-products">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">
              <span className="title-icon">📦</span>
              Məhsul İdarəetməsi
            </h1>
            <p className="page-subtitle">
              Mağazanızdakı bütün məhsulları idarə edin
            </p>
          </div>
          <div className="header-actions">
            <Link to="/admin/products/new" className="btn btn-primary">
              <span className="btn-icon">➕</span>
              Yeni Məhsul
            </Link>
            <button onClick={loadProducts} className="btn btn-secondary">
              <span className="btn-icon">🔄</span>
              Yenilə
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Ümumi məhsul</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats.active}</div>
            <div className="stat-label">Aktiv məhsul</div>
          </div>
        </div>
        <div className="stat-card low-stock">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.lowStock}</div>
            <div className="stat-label">Az stoklu</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Gözləyən</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>🔍 Filtrlər</h3>
          <div className="filter-actions">
            <button onClick={clearFilters} className="btn btn-outline">
              <span className="btn-icon">🗑️</span>
              Filtrləri təmizlə
            </button>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                📋
              </button>
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                🔳
              </button>
            </div>
          </div>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="all">Bütün statuslar</option>
              <option value="active">✅ Aktiv</option>
              <option value="inactive">❌ Deaktiv</option>
              <option value="pending">⏳ Gözləyən</option>
              <option value="rejected">🚫 Rədd edilmiş</option>
              <option value="draft">📝 Qaralama</option>
              <option value="out_of_stock">📦 Stokda yox</option>
              <option value="discontinued">⛔ Dayandırılıb</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Kateqoriya</label>
            <select 
              value={filters.category} 
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="all">Bütün kateqoriyalar</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.icon && `${category.icon} `}{category.name}
                  {category.productCount !== undefined && ` (${category.productCount})`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Satıcı</label>
            <select 
              value={filters.vendor} 
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
              className="filter-select"
            >
              <option value="all">Bütün satıcılar</option>
              {vendors.map(vendor => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Axtarış</label>
            <input
              type="text"
              placeholder="Məhsul adı və ya SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Min qiymət</label>
            <input
              type="number"
              placeholder="0"
              value={filters.priceMin}
              onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Max qiymət</label>
            <input
              type="number"
              placeholder="∞"
              value={filters.priceMax}
              onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Sıralama</label>
            <select 
              value={`${filters.sortBy}-${filters.sortOrder}`} 
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
              }}
              className="filter-select"
            >
              <option value="createdAt-desc">📅 Ən yeni</option>
              <option value="createdAt-asc">📅 Ən köhnə</option>
              <option value="name-asc">🔤 Ad (A-Z)</option>
              <option value="name-desc">🔤 Ad (Z-A)</option>
              <option value="price-asc">💰 Qiymət (Aşağı)</option>
              <option value="price-desc">💰 Qiymət (Yuxarı)</option>
              <option value="stock-asc">📦 Stok (Az)</option>
              <option value="stock-desc">📦 Stok (Çox)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Səhifə ölçüsü</label>
            <select 
              value={filters.limit} 
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="filter-select"
            >
              <option value="10">10 məhsul</option>
              <option value="20">20 məhsul</option>
              <option value="50">50 məhsul</option>
              <option value="100">100 məhsul</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-alert">
          <div className="alert-content">
            <div className="alert-icon">❌</div>
            <div className="alert-text">
              <h4>Xəta baş verdi</h4>
              <p>{error}</p>
            </div>
            <button onClick={loadProducts} className="btn btn-sm btn-primary">
              Yenidən cəhd et
            </button>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="products-section">
        <div className="section-header">
          <h3>📋 Məhsullar</h3>
          <div className="section-info">
            Səhifə {pagination.currentPage} / {pagination.totalPages} 
            ({Array.isArray(products) ? products.length : 0} məhsul göstərilir)
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" />
                  </th>
                  <th className="product-col">Məhsul</th>
                  <th className="sku-col">SKU</th>
                  <th className="category-col">Kateqoriya</th>
                  <th className="vendor-col">Satıcı</th>
                  <th className="price-col">Qiymət</th>
                  <th className="stock-col">Stok</th>
                  <th className="status-col">Status</th>
                  <th className="date-col">Tarix</th>
                  <th className="actions-col">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product._id} className="product-row">
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedProducts.includes(product._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product._id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                            }
                          }}
                        />
                      </td>
                      <td>
                        <div className="product-info">
                          <div className="product-image">
                            <img 
                              src={product.images?.[0]?.url || product.images?.[0] || '/placeholder.jpg'} 
                              alt={product.name}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyOEMyNC40MTgzIDI4IDI4IDI0LjQxODMgMjggMjBDMjggMTUuNTgxNyAyNC40MTgzIDEyIDIwIDEyQzE1LjU4MTcgMTIgMTIgMTUuNTgxNyAxMiAyMEMxMiAyNC40MTgzIDE1LjU4MTcgMjggMjAgMjhaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                          </div>
                          <div className="product-details">
                            <Link to={`/admin/products/${product._id}`} className="product-name">
                              {product.name}
                            </Link>
                            <div className="product-meta">
                              {product.brand && <span className="product-brand">{product.brand}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="product-sku">{product.sku || '-'}</code>
                      </td>
                      <td>
                        {product.category?.name ? (
                          <div className="category-info">
                            <span className="category-icon">
                              {product.category.icon || '📁'}
                            </span>
                            <span className="category-name">{product.category.name}</span>
                          </div>
                        ) : (
                          <span className="no-category">Yoxdur</span>
                        )}
                      </td>
                      <td>
                        <div className="vendor-info">
                          {product.vendor?.businessName || 
                           (product.vendor ? `${product.vendor.firstName} ${product.vendor.lastName}` : '-')}
                        </div>
                      </td>
                      <td>
                        <div className="price-info">
                          <div className="current-price">
                            {formatPrice(product.pricing?.sellingPrice || product.price)}
                          </div>
                          {(product.pricing?.discountPrice || product.discountPrice) && (
                            <div className="original-price">
                              {formatPrice(product.pricing?.originalPrice || product.originalPrice)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={`stock-info ${
                          (product.inventory?.stock || product.stock || 0) <= 
                          (product.inventory?.lowStockThreshold || product.lowStockThreshold || 5) ? 'low-stock' : 'normal-stock'
                        }`}>
                          <div className="stock-number">
                            {product.inventory?.stock || product.stock || 0}
                          </div>
                          <div className="stock-label">ədəd</div>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(product.status)}
                      </td>
                      <td>
                        <div className="date-info">
                          {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/admin/products/${product._id}`} className="action-btn view">
                            <span className="action-icon">👁️</span>
                            <span className="action-text">Bax</span>
                          </Link>
                          
                          <Link to={`/admin/products/${product._id}/edit`} className="action-btn edit">
                            <span className="action-icon">✏️</span>
                            <span className="action-text">Redaktə</span>
                          </Link>
                          
                          {product.status === 'active' && (
                            <button 
                              onClick={() => handleStatusUpdate(product._id, 'inactive')}
                              className="action-btn deactivate"
                              title="Deaktiv et"
                            >
                              <span className="action-icon">🔴</span>
                            </button>
                          )}
                          
                          {product.status === 'inactive' && (
                            <button 
                              onClick={() => handleStatusUpdate(product._id, 'active')}
                              className="action-btn activate"
                              title="Aktiv et"
                            >
                              <span className="action-icon">🟢</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleDeleteProduct(product._id)}
                            className="action-btn delete"
                            title="Sil"
                          >
                            <span className="action-icon">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="no-data">
                      <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>Məhsul tapılmadı</h3>
                        <p>
                          {error ? 
                            'Məhsullar yüklənərkən xəta baş verdi' :
                            (filters.search || filters.status !== 'all' || filters.category !== 'all' ? 
                              'Axtarış kriteriyalarına uyğun məhsul tapılmadı' : 
                              'Hələ məhsul yoxdur')
                          }
                        </p>
                        {!error && (
                          <Link to="/admin/products/new" className="btn btn-primary">
                            İlk məhsulunuzu əlavə edin
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // Grid View
          <div className="products-grid">
            {Array.isArray(products) && products.length > 0 ? (
              products.map((product) => (
                <div key={product._id} className="product-card">
                  <div className="card-header">
                    <input 
                      type="checkbox" 
                      checked={selectedProducts.includes(product._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product._id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                        }
                      }}
                    />
                    {getStatusBadge(product.status)}
                  </div>
                  
                  <div className="card-image">
                    <img 
                      src={product.images?.[0]?.url || product.images?.[0] || '/placeholder.jpg'} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCA4NEM3My4yNTQ4IDg0IDg0IDczLjI1NDggODQgNjBDODQgNDYuNzQ1MiA3My4yNTQ4IDM2IDYwIDM2QzQ2Ljc0NTIgMzYgMzYgNDYuNzQ1MiAzNiA2MEMzNiA3My4yNTQ4IDQ2Ljc0NTIgODQgNjAgODRaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  
                  <div className="card-content">
                    <Link to={`/admin/products/${product._id}`} className="card-title">
                      {product.name}
                    </Link>
                    
                    <div className="card-meta">
                      {product.sku && <code>{product.sku}</code>}
                      {product.category && (
                        <span className="card-category">
                          {product.category.icon} {product.category.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="card-price">
                      {formatPrice(product.pricing?.sellingPrice || product.price)}
                    </div>
                    
                    <div className="card-stock">
                      <span className={`stock-badge ${
                        (product.inventory?.stock || product.stock || 0) <= 5 ? 'low' : 'normal'
                      }`}>
                        📦 {product.inventory?.stock || product.stock || 0} ədəd
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <Link to={`/admin/products/${product._id}`} className="card-btn view">
                      👁️
                    </Link>
                    <Link to={`/admin/products/${product._id}/edit`} className="card-btn edit">
                      ✏️
                    </Link>
                    <button 
                      onClick={() => handleDeleteProduct(product._id)}
                      className="card-btn delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>Məhsul tapılmadı</h3>
                <p>
                  {error ? 
                    'Məhsullar yüklənərkən xəta baş verdi' :
                    (filters.search || filters.status !== 'all' || filters.category !== 'all' ? 
                      'Axtarış kriteriyalarına uyğun məhsul tapılmadı' : 
                      'Hələ məhsul yoxdur')
                  }
                </p>
                {!error && (
                  <Link to="/admin/products/new" className="btn btn-primary">
                    İlk məhsulunuzu əlavə edin
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination-section">
          <div className="pagination-info">
            <span>
              {pagination.totalProducts} məhsuldan {((pagination.currentPage - 1) * filters.limit) + 1}-
              {Math.min(pagination.currentPage * filters.limit, pagination.totalProducts)} arası göstərilir
            </span>
          </div>
          
          <div className="pagination-controls">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={!pagination.hasPrevPage}
              className="pagination-btn first"
            >
              ⏮️ İlk
            </button>
            
            <button 
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="pagination-btn prev"
            >
              ◀️ Əvvəlki
            </button>
            
            <div className="pagination-pages">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                const startPage = Math.max(1, pagination.currentPage - 2);
                const pageNumber = startPage + index;
                
                if (pageNumber > pagination.totalPages) return null;
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`pagination-btn page ${pageNumber === pagination.currentPage ? 'active' : ''}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="pagination-btn next"
            >
              Sonrakı ▶️
            </button>
            
            <button 
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              className="pagination-btn last"
            >
              Son ⏭️
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <span className="bulk-count">{selectedProducts.length}</span> məhsul seçildi
          </div>
          <div className="bulk-buttons">
            <button 
              onClick={() => {
                selectedProducts.forEach(id => handleStatusUpdate(id, 'active'));
                setSelectedProducts([]);
              }}
              className="bulk-btn activate"
            >
              ✅ Aktiv et
            </button>
            <button 
              onClick={() => {
                selectedProducts.forEach(id => handleStatusUpdate(id, 'inactive'));
                setSelectedProducts([]);
              }}
              className="bulk-btn deactivate"
            >
              ❌ Deaktiv et
            </button>
            <button 
              onClick={() => {
                if (window.confirm(`${selectedProducts.length} məhsulu silmək istədiyinizə əminsiniz?`)) {
                  selectedProducts.forEach(id => handleDeleteProduct(id));
                  setSelectedProducts([]);
                }
              }}
              className="bulk-btn delete"
            >
              🗑️ Sil
            </button>
            <button 
              onClick={() => setSelectedProducts([])}
              className="bulk-btn cancel"
            >
              ❌ Seçimi ləğv et
            </button>
          </div>
        </div>
      )}

      {/* Additional Actions */}
      <div className="additional-actions">
        <div className="action-section">
          <h4>📊 Hesabatlar və Export</h4>
          <div className="action-buttons">
            <button className="action-btn export-excel">
              📊 Excel-ə export et
            </button>
            <button className="action-btn export-csv">
              📄 CSV-yə export et
            </button>
            <button className="action-btn import-excel">
              📁 Excel-dən import et
            </button>
          </div>
        </div>

        <div className="action-section">
          <h4>⚡ Tez əməliyyatlar</h4>
          <div className="action-buttons">
            <button 
              onClick={() => handleFilterChange('status', 'out_of_stock')}
              className="action-btn low-stock"
            >
              ⚠️ Az stoklu məhsullar
            </button>
            <button 
              onClick={() => handleFilterChange('status', 'pending')}
              className="action-btn pending"
            >
              ⏳ Gözləyən məhsullar
            </button>
            <button 
              onClick={() => {
                setFilters(prev => ({ ...prev, sortBy: 'createdAt', sortOrder: 'desc' }));
              }}
              className="action-btn recent"
            >
              🆕 Ən yeni məhsullar
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <Link to="/admin/products/new" className="fab">
        <span className="fab-icon">➕</span>
      </Link>

      <style jsx>{`
        
      `}</style>
    </div>
  );
};

export default AdminProducts;