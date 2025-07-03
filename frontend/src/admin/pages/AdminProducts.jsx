// src/admin/pages/AdminProducts.jsx - Düzəldilmiş versiya
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';

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
      // DÜZƏLTMƏ: Response structure düzgün handle et
      const result = await adminService.getProducts(filters);
      
      if (result.success) {
        // Safety check: products array-in mövcudluğunu yoxla
        setProducts(Array.isArray(result.products) ? result.products : []);
        
        // Pagination məlumatlarını düzgün təyin et
        setPagination({
          totalProducts: result.pagination?.totalProducts || result.pagination?.total || 0,
          currentPage: result.pagination?.currentPage || result.pagination?.current || 1,
          totalPages: result.pagination?.totalPages || result.pagination?.pages || 1,
          hasPrevPage: result.pagination?.hasPrevPage || result.pagination?.hasPrev || false,
          hasNextPage: result.pagination?.hasNextPage || result.pagination?.hasNext || false
        });
      } else {
        setError(result.error || 'Məhsullar yüklənərkən xəta baş verdi');
        // DÜZƏLTMƏ: Error halında boş array təyin et
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
        adminService.getCategories(),
        adminService.getVendors({ status: 'approved' })
      ]);
      
      if (categoriesResult.success && Array.isArray(categoriesResult.categories)) {
        setCategories(categoriesResult.categories);
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

  // DÜZƏLTMƏ: Status text helper function əlavə et
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
      'active': { bg: '#10b981', color: 'white', text: 'Aktiv' },
      'inactive': { bg: '#6b7280', color: 'white', text: 'Deaktiv' },
      'pending': { bg: '#f59e0b', color: 'white', text: 'Gözləyir' },
      'rejected': { bg: '#ef4444', color: 'white', text: 'Rədd edilib' },
      'draft': { bg: '#8b5cf6', color: 'white', text: 'Qaralama' },
      'out_of_stock': { bg: '#f97316', color: 'white', text: 'Stokda yox' },
      'discontinued': { bg: '#64748b', color: 'white', text: 'Dayandırılıb' }
    };
    
    const style = config[status] || config.inactive;
    
    return (
      <span 
        className="status-badge"
        style={{ 
          backgroundColor: style.bg, 
          color: style.color,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        {style.text}
      </span>
    );
  };

  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '-';
    return adminService.formatPrice(amount);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return adminService.formatDate(date, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  // DÜZƏLTMƏ: Loading state-i daha yaxşı handle et
  if (isLoading) {
    return (
      <div className="admin-loading" style={{ textAlign: 'center', padding: '50px' }}>
        <div className="loading-spinner"></div>
        <p>Məhsullar yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-products">
      {/* Header & Actions */}
      <div className="products-header">
        <div className="header-left">
          <h2>📦 Məhsul İdarəetməsi</h2>
          <div className="products-stats">
            <span className="stat-item">
              Ümumi: {pagination.totalProducts || 0}
            </span>
            <span className="stat-item">
              Səhifə: {pagination.currentPage || 1} / {pagination.totalPages || 1}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <Link to="/admin/products/new" className="add-product-btn">
            ➕ Yeni Məhsul
          </Link>
          <button onClick={loadProducts} className="refresh-btn">
            🔄 Yenilə
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="products-filters">
        <div className="filter-row">
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">Bütün statuslar</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Deaktiv</option>
            <option value="pending">Gözləyən</option>
            <option value="rejected">Rədd edilmiş</option>
            <option value="draft">Qaralama</option>
            <option value="out_of_stock">Stokda yox</option>
            <option value="discontinued">Dayandırılıb</option>
          </select>
          
          <select 
            value={filters.category} 
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="all">Bütün kateqoriyalar</option>
            {categories.map(category => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          
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
          
          <input
            type="text"
            placeholder="Məhsul adı və ya SKU..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-search"
          />
        </div>
        
        <div className="filter-row">
          <input
            type="number"
            placeholder="Min qiymət"
            value={filters.priceMin}
            onChange={(e) => handleFilterChange('priceMin', e.target.value)}
            className="filter-price"
          />
          
          <input
            type="number"
            placeholder="Max qiymət"
            value={filters.priceMax}
            onChange={(e) => handleFilterChange('priceMax', e.target.value)}
            className="filter-price"
          />
          
          <select 
            value={`${filters.sortBy}-${filters.sortOrder}`} 
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
            }}
            className="filter-select"
          >
            <option value="createdAt-desc">Ən yeni</option>
            <option value="createdAt-asc">Ən köhnə</option>
            <option value="name-asc">Ad (A-Z)</option>
            <option value="name-desc">Ad (Z-A)</option>
            <option value="price-asc">Qiymət (Aşağı)</option>
            <option value="price-desc">Qiymət (Yuxarı)</option>
            <option value="stock-asc">Stok (Az)</option>
            <option value="stock-desc">Stok (Çox)</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: '#fed7d7', 
          color: '#9b2c2c', 
          padding: '10px', 
          borderRadius: '4px', 
          margin: '10px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>❌ {error}</span>
          <button onClick={loadProducts} className="retry-btn" style={{
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Yenidən cəhd edin
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>Məhsul</th>
              <th>SKU</th>
              <th>Kateqoriya</th>
              <th>Satıcı</th>
              <th>Qiymət</th>
              <th>Stok</th>
              <th>Status</th>
              <th>Tarix</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {/* DÜZƏLTMƏ: products array-in mövcudluğunu yoxla */}
            {Array.isArray(products) && products.length > 0 ? (
              products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="product-info">
                      <img 
                        src={product.images?.[0]?.url || product.images?.[0] || '/placeholder.jpg'} 
                        alt={product.name}
                        className="product-thumbnail"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <div>
                        <Link to={`/admin/products/${product._id}`} className="product-name">
                          {product.name}
                        </Link>
                        <div className="product-meta">
                          {product.brand && <span>Marka: {product.brand}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="product-sku">{product.sku || '-'}</td>
                  <td className="product-category">
                    {product.category?.name || '-'}
                  </td>
                  <td className="product-vendor">
                    {product.vendor?.businessName || 
                     (product.vendor ? `${product.vendor.firstName} ${product.vendor.lastName}` : '-')}
                  </td>
                  <td className="product-price">
                    <div className="price-info">
                      <span className="current-price">
                        {formatPrice(product.pricing?.sellingPrice || product.price)}
                      </span>
                      {(product.pricing?.discountPrice || product.discountPrice) && (
                        <span className="discount-price">
                          {formatPrice(product.pricing?.discountPrice || product.discountPrice)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="product-stock">
                    <span className={`stock-badge ${
                      (product.inventory?.stock || product.stock || 0) <= 
                      (product.inventory?.lowStockThreshold || product.lowStockThreshold || 5) ? 'low' : 'normal'
                    }`}>
                      {product.inventory?.stock || product.stock || 0}
                    </span>
                  </td>
                  <td>{getStatusBadge(product.status)}</td>
                  <td className="product-date">{formatDate(product.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/products/${product._id}`} className="view-btn" style={{
                        padding: '4px 8px',
                        margin: '2px',
                        textDecoration: 'none',
                        backgroundColor: '#3182ce',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        👁️ Bax
                      </Link>
                      
                      <Link to={`/admin/products/${product._id}/edit`} className="edit-btn" style={{
                        padding: '4px 8px',
                        margin: '2px',
                        textDecoration: 'none',
                        backgroundColor: '#805ad5',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        ✏️ Redaktə
                      </Link>
                      
                      {/* Quick Status Actions */}
                      {product.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(product._id, 'active')}
                            className="quick-action-btn approve"
                            title="Təsdiqlə"
                            style={{
                              padding: '4px 8px',
                              margin: '2px',
                              backgroundColor: '#e53e3e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ❌
                          </button>
                        </>
                      )}
                      
                      {product.status === 'active' && (
                        <button 
                          onClick={() => handleStatusUpdate(product._id, 'inactive')}
                          className="quick-action-btn deactivate"
                          title="Deaktiv et"
                          style={{
                            padding: '4px 8px',
                            margin: '2px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🔴
                        </button>
                      )}
                      
                      {product.status === 'inactive' && (
                        <button 
                          onClick={() => handleStatusUpdate(product._id, 'active')}
                          className="quick-action-btn activate"
                          title="Aktiv et"
                          style={{
                            padding: '4px 8px',
                            margin: '2px',
                            backgroundColor: '#38a169',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🟢
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteProduct(product._id)}
                        className="delete-btn"
                        title="Sil"
                        style={{
                          padding: '4px 8px',
                          margin: '2px',
                          backgroundColor: '#e53e3e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data" style={{ textAlign: 'center', padding: '20px' }}>
                  {error ? 
                    'Məhsullar yüklənərkən xəta baş verdi' :
                    (filters.search || filters.status !== 'all' || filters.category !== 'all' ? 
                      'Axtarış kriteriyalarına uyğun məhsul tapılmadı' : 
                      'Hələ məhsul yoxdur')
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '10px', 
          margin: '20px 0' 
        }}>
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: pagination.hasPrevPage ? '#3182ce' : '#e2e8f0',
              color: pagination.hasPrevPage ? 'white' : '#a0aec0',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed'
            }}
          >
            ← Əvvəlki
          </button>
          
          <div className="pagination-info">
            Səhifə {pagination.currentPage} / {pagination.totalPages}
          </div>
          
          <button 
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="pagination-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: pagination.hasNextPage ? '#3182ce' : '#e2e8f0',
              color: pagination.hasNextPage ? 'white' : '#a0aec0',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
            }}
          >
            Sonrakı →
          </button>
        </div>
      )}

      {/* Products Summary */}
      <div className="products-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Ümumi məhsullar:</span>
            <span className="summary-value">{pagination.totalProducts || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Bu səhifədə:</span>
            <span className="summary-value">{Array.isArray(products) ? products.length : 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Aktiv məhsullar:</span>
            <span className="summary-value">
              {Array.isArray(products) ? products.filter(p => p.status === 'active').length : 0}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Az stoklu məhsullar:</span>
            <span className="summary-value">
              {Array.isArray(products) ? products.filter(p => 
                (p.inventory?.stock || p.stock || 0) <= (p.inventory?.lowStockThreshold || p.lowStockThreshold || 5)
              ).length : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <h4>Toplu əməliyyatlar:</h4>
        <div className="bulk-buttons">
          <button className="bulk-btn export" style={{
            padding: '8px 16px',
            margin: '5px',
            backgroundColor: '#38a169',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            📊 Excel-ə export et
          </button>
          <button className="bulk-btn import" style={{
            padding: '8px 16px',
            margin: '5px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            📁 Excel-dən import et
          </button>
          <button 
            className="bulk-btn low-stock"
            onClick={() => handleFilterChange('status', 'out_of_stock')}
            style={{
              padding: '8px 16px',
              margin: '5px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ⚠️ Az stoklu məhsulları göstər
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;