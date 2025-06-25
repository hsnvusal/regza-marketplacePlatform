// src/admin/pages/AdminProducts.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
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
    loadProducts();
    loadFilters();
  }, [filters]);

  const loadProducts = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getProducts(filters);
      
      if (result.success) {
        setProducts(result.products);
        setPagination(result.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Products loading error:', error);
      setError('Məhsullar yüklənərkən xəta baş verdi');
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
      
      if (categoriesResult.success) {
        setCategories(categoriesResult.categories);
      }
      
      if (vendorsResult.success) {
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
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleStatusUpdate = async (productId, newStatus) => {
    if (!window.confirm(`Məhsul statusunu "${newStatus}" olaraq dəyişmək istəyirsiniz?`)) {
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

  const getStatusBadge = (status) => {
    const config = {
      'active': { bg: '#10b981', color: 'white', text: 'Aktiv' },
      'inactive': { bg: '#6b7280', color: 'white', text: 'Deaktiv' },
      'pending': { bg: '#f59e0b', color: 'white', text: 'Gözləyir' },
      'rejected': { bg: '#ef4444', color: 'white', text: 'Rədd edilib' }
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
    return adminService.formatPrice(amount);
  };

  const formatDate = (date) => {
    return adminService.formatDate(date, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
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
                {vendor.businessName}
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
        <div className="error-message">
          ❌ {error}
          <button onClick={loadProducts} className="retry-btn">
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
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="product-info">
                      <img 
                        src={product.images?.[0] || '/placeholder.jpg'} 
                        alt={product.name}
                        className="product-thumbnail"
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
                  <td className="product-sku">{product.sku}</td>
                  <td className="product-category">
                    {product.category?.name || '-'}
                  </td>
                  <td className="product-vendor">
                    {product.vendor?.businessName || '-'}
                  </td>
                  <td className="product-price">
                    <div className="price-info">
                      <span className="current-price">{formatPrice(product.price)}</span>
                      {product.discountPrice && (
                        <span className="discount-price">{formatPrice(product.discountPrice)}</span>
                      )}
                    </div>
                  </td>
                  <td className="product-stock">
                    <span className={`stock-badge ${product.stock <= product.lowStockThreshold ? 'low' : 'normal'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>{getStatusBadge(product.status)}</td>
                  <td className="product-date">{formatDate(product.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/products/${product._id}`} className="view-btn">
                        👁️ Bax
                      </Link>
                      
                      <Link to={`/admin/products/${product._id}/edit`} className="edit-btn">
                        ✏️ Redaktə
                      </Link>
                      
                      {/* Quick Status Actions */}
                      {product.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(product._id, 'active')}
                            className="quick-action-btn approve"
                            title="Təsdiqlə"
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(product._id, 'rejected')}
                            className="quick-action-btn reject"
                            title="Rədd et"
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
                        >
                          🔴
                        </button>
                      )}
                      
                      {product.status === 'inactive' && (
                        <button 
                          onClick={() => handleStatusUpdate(product._id, 'active')}
                          className="quick-action-btn activate"
                          title="Aktiv et"
                        >
                          🟢
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteProduct(product._id)}
                        className="delete-btn"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">
                  {filters.search || filters.status !== 'all' || filters.category !== 'all' ? 
                    'Axtarış kriteriyalarına uyğun məhsul tapılmadı' : 
                    'Hələ məhsul yoxdur'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-btn"
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
            <span className="summary-value">{products.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Aktiv məhsullar:</span>
            <span className="summary-value">
              {products.filter(p => p.status === 'active').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Az stoklu məhsullar:</span>
            <span className="summary-value">
              {products.filter(p => p.stock <= p.lowStockThreshold).length}
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <h4>Toplu əməliyyatlar:</h4>
        <div className="bulk-buttons">
          <button className="bulk-btn export">
            📊 Excel-ə export et
          </button>
          <button className="bulk-btn import">
            📁 Excel-dən import et
          </button>
          <button className="bulk-btn low-stock">
            ⚠️ Az stoklu məhsulları göstər
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;