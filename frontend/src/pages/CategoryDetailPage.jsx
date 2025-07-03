import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { categoryService } from '../services/categoryService';
import toastManager from '../utils/toastManager';

const CategoryDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Filter state
  const [currentFilters, setCurrentFilters] = useState({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: -1,
    minPrice: '',
    maxPrice: '',
    brand: '',
    inStock: true
  });

  // View mode state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Kategoriya və məhsulları yüklə
  useEffect(() => {
    if (slug) {
      loadCategoryData();
    }
  }, [slug]);

  // Məhsulları filter dəyişdikdə yenidən yüklə
  useEffect(() => {
    if (category) {
      loadProducts();
    }
  }, [currentFilters, category]);

  const loadCategoryData = async () => {
    try {
      setIsLoading(true);
      
      const response = await categoryService.getCategory(slug);
      
      if (response.success) {
        setCategory(response.data.category);
        setBreadcrumb(response.data.breadcrumb || []);
        console.log('✅ Kategoriya yükləndi:', response.data.category.name);
      } else {
        console.error('❌ Kategoriya tapılmadı:', response.error);
        toastManager.error('Kategoriya tapılmadı');
        navigate('/categories');
      }
    } catch (error) {
      console.error('❌ Kategoriya yükləmə xətası:', error);
      toastManager.error('Kategoriya yüklənərkən xəta baş verdi');
      navigate('/categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      
      const response = await categoryService.getCategoryProducts(slug, currentFilters);
      
      if (response.success) {
        setProducts(response.data.products || []);
        setFilters(response.data.filters || {});
        setPagination(response.data.pagination || {});
        console.log('✅ Məhsullar yükləndi:', response.data.products?.length);
      } else {
        console.error('❌ Məhsullar yüklənə bilmədi:', response.error);
        toastManager.error('Məhsullar yüklənərkən xəta baş verdi');
      }
    } catch (error) {
      console.error('❌ Məhsul yükləmə xətası:', error);
      toastManager.error('Məhsullar yüklənərkən xəta baş verdi');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setCurrentFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Filter dəyişdikdə səhifəni 1-ə qaytar
    }));
  };

  const clearFilters = () => {
    setCurrentFilters({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: -1,
      minPrice: '',
      maxPrice: '',
      brand: '',
      inStock: true
    });
  };

  // Məhsul kartı komponenti
  const ProductCard = ({ product }) => (
    <Link
      to={`/products/${product._id || product.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #f1f3f4',
        transition: 'all 0.3s ease',
        height: viewMode === 'grid' ? 'auto' : '200px'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-4px)';
        e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{
        display: viewMode === 'list' ? 'flex' : 'block',
        height: '100%'
      }}>
        {/* Məhsul şəkli */}
        <div style={{
          width: viewMode === 'list' ? '200px' : '100%',
          height: viewMode === 'list' ? '100%' : '250px',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <img
            src={product.mainImage || product.images?.[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image'}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          
          {/* Badge-lər */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {product.featured && (
              <span style={{
                background: '#ffc107',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                ⭐ Seçilmiş
              </span>
            )}
            {product.discountPercentage > 0 && (
              <span style={{
                background: '#dc3545',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                -{product.discountPercentage}%
              </span>
            )}
          </div>

          {/* Stok durumu */}
          {!product.isInStock && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(220, 53, 69, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              Stokda yoxdur
            </div>
          )}
        </div>

        {/* Məhsul məlumatları */}
        <div style={{
          padding: '1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Məhsul adı */}
          <h3 style={{
            fontSize: viewMode === 'list' ? '1.25rem' : '1.1rem',
            fontWeight: '600',
            margin: '0 0 0.5rem',
            color: '#2d3748',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.name}
          </h3>

          {/* Marka */}
          {product.brand && (
            <p style={{
              fontSize: '0.9rem',
              color: '#718096',
              margin: '0 0 0.75rem'
            }}>
              {product.brand}
            </p>
          )}

          {/* Qiymət */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#2d3748'
            }}>
              {product.finalPrice} {product.pricing?.currency || 'AZN'}
            </span>
            
            {product.pricing?.discountPrice && (
              <span style={{
                fontSize: '1rem',
                color: '#a0aec0',
                textDecoration: 'line-through'
              }}>
                {product.pricing.sellingPrice} {product.pricing.currency}
              </span>
            )}
          </div>

          {/* Reytinq */}
          {product.ratings?.average > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <i
                    key={star}
                    className="fas fa-star"
                    style={{
                      color: star <= product.ratings.average ? '#ffc107' : '#e2e8f0',
                      fontSize: '0.875rem'
                    }}
                  ></i>
                ))}
              </div>
              <span style={{
                fontSize: '0.875rem',
                color: '#718096'
              }}>
                ({product.ratings.count})
              </span>
            </div>
          )}

          {/* List view-də təsvir */}
          {viewMode === 'list' && product.shortDescription && (
            <p style={{
              fontSize: '0.9rem',
              color: '#718096',
              lineHeight: '1.5',
              margin: '0.5rem 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {product.shortDescription}
            </p>
          )}

          {/* Alt məlumatlar */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#a0aec0'
          }}>
            <span>SKU: {product.sku}</span>
            {product.inventory?.stock > 0 && (
              <span>Stok: {product.inventory.stock}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );

  if (isLoading) {
    return (
      <div style={{
        padding: '6rem 2rem 2rem',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#718096', fontSize: '1.1rem' }}>
            Kategoriya yüklənir...
          </p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{
        padding: '6rem 2rem 2rem',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#4a5568', marginBottom: '1rem' }}>
            Kategoriya tapılmadı
          </h1>
          <Link 
            to="/categories"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '500'
            }}
          >
            Kategoriyalara qayıt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '6rem 2rem 2rem',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <nav style={{
            marginBottom: '2rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <Link 
                to="/"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Ana səhifə
              </Link>
              <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', color: '#a0aec0' }}></i>
              <Link 
                to="/categories"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Kategoriyalar
              </Link>
              
              {breadcrumb.map((item, index) => (
                <React.Fragment key={item._id}>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', color: '#a0aec0' }}></i>
                  {index === breadcrumb.length - 1 ? (
                    <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>
                      {item.name}
                    </span>
                  ) : (
                    <Link 
                      to={`/categories/${item.slug}`}
                      style={{
                        color: '#667eea',
                        textDecoration: 'none',
                        fontSize: '0.9rem'
                      }}
                    >
                      {item.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          </nav>
        )}

        {/* Kategoriya başlığı */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            marginBottom: '1rem'
          }}>
            {/* Kategoriya ikonu */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${category.color || '#667eea'}, ${category.color || '#764ba2'})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white'
            }}>
              {category.image ? (
                <img 
                  src={category.image} 
                  alt={category.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <i className={category.icon || 'fas fa-folder'}></i>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: '#2d3748',
                margin: '0 0 0.5rem'
              }}>
                {category.name}
              </h1>
              
              {category.description && (
                <p style={{
                  fontSize: '1.1rem',
                  color: '#718096',
                  margin: '0 0 1rem',
                  lineHeight: '1.6'
                }}>
                  {category.description}
                </p>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#f7fafc',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  color: '#4a5568',
                  fontWeight: '500'
                }}>
                  <i className="fas fa-box"></i>
                  {category.productCount || 0} məhsul
                </span>

                {category.children && category.children.length > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#f7fafc',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    color: '#4a5568',
                    fontWeight: '500'
                  }}>
                    <i className="fas fa-folder"></i>
                    {category.children.length} alt kategoriya
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Alt kategoriyalar */}
          {category.children && category.children.length > 0 && (
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '1rem'
              }}>
                Alt Kategoriyalar
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {category.children.map(child => (
                  <Link
                    key={child._id}
                    to={`/categories/${child.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: '#4a5568',
                      transition: 'all 0.2s',
                      border: '1px solid #e2e8f0'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#edf2f7';
                      e.target.style.borderColor = '#cbd5e0';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <i 
                      className={child.icon || 'fas fa-folder'} 
                      style={{ color: child.color || '#667eea' }}
                    ></i>
                    <span style={{ fontWeight: '500' }}>{child.name}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.8rem',
                      color: '#a0aec0'
                    }}>
                      {child.productCount || 0}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Məhsullar bölməsi */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}>
          
          {/* Sol sidebar - Filterlər */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: '100px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#2d3748',
                margin: 0
              }}>
                Filterlər
              </h3>
              <button
                onClick={clearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Təmizlə
              </button>
            </div>

            {/* Qiymət aralığı */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#4a5568',
                marginBottom: '1rem'
              }}>
                Qiymət Aralığı
              </h4>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={currentFilters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={currentFilters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {filters.priceRange && filters.priceRange.length > 0 && (
                <p style={{
                  fontSize: '0.8rem',
                  color: '#a0aec0',
                  margin: 0
                }}>
                  {filters.priceRange[0]?.minPrice} - {filters.priceRange[0]?.maxPrice} AZN
                </p>
              )}
            </div>

            {/* Marka filtri */}
            {filters.brands && filters.brands.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  marginBottom: '1rem'
                }}>
                  Marka
                </h4>
                
                <select
                  value={currentFilters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">Bütün markalar</option>
                  {filters.brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stok filtri */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#4a5568'
              }}>
                <input
                  type="checkbox"
                  checked={currentFilters.inStock}
                  onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                />
                Yalnız stokda olan məhsullar
              </label>
            </div>
          </div>

          {/* Sağ tərəf - Məhsullar */}
          <div>
            {/* Toolbar */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Nəticə sayı */}
              <div style={{ fontSize: '0.9rem', color: '#4a5568' }}>
                {pagination.total ? (
                  <>
                    {pagination.total} məhsuldan {((pagination.current - 1) * currentFilters.limit) + 1}-
                    {Math.min(pagination.current * currentFilters.limit, pagination.total)} arası göstərilir
                  </>
                ) : (
                  'Məhsul tapılmadı'
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Sıralama */}
                <select
                  value={`${currentFilters.sortBy}_${currentFilters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    handleFilterChange('sortBy', sortBy);
                    handleFilterChange('sortOrder', parseInt(sortOrder));
                  }}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="createdAt_-1">Ən yenilər</option>
                  <option value="pricing.sellingPrice_1">Qiymət: Az-Çox</option>
                  <option value="pricing.sellingPrice_-1">Qiymət: Çox-Az</option>
                  <option value="ratings.average_-1">Ən yüksək reytinq</option>
                  <option value="stats.purchases_-1">Ən çox satılan</option>
                  <option value="name_1">A-Z</option>
                  <option value="name_-1">Z-A</option>
                </select>

                {/* View mode */}
                <div style={{
                  display: 'flex',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: viewMode === 'grid' ? '#667eea' : 'white',
                      color: viewMode === 'grid' ? 'white' : '#4a5568',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <i className="fas fa-th"></i>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: viewMode === 'list' ? '#667eea' : 'white',
                      color: viewMode === 'list' ? 'white' : '#4a5568',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Məhsullar grid/list */}
            {isLoadingProducts ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #667eea',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }}></div>
                  <p style={{ color: '#718096' }}>Məhsullar yüklənir...</p>
                </div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === 'grid' 
                    ? 'repeat(auto-fill, minmax(280px, 1fr))' 
                    : '1fr',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {products.map(product => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '2rem'
                  }}>
                    {/* Əvvəlki səhifə */}
                    <button
                      onClick={() => handleFilterChange('page', pagination.current - 1)}
                      disabled={!pagination.hasPrev}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: pagination.hasPrev ? 'white' : '#f8fafc',
                        color: pagination.hasPrev ? '#4a5568' : '#a0aec0',
                        cursor: pagination.hasPrev ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem'
                      }}
                    >
                      <i className="fas fa-chevron-left"></i> Əvvəlki
                    </button>

                    {/* Səhifə nömrələri */}
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.current <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.current >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.current - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handleFilterChange('page', pageNum)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: pageNum === pagination.current ? '#667eea' : 'white',
                            color: pageNum === pagination.current ? 'white' : '#4a5568',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: pageNum === pagination.current ? '600' : '400'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Növbəti səhifə */}
                    <button
                      onClick={() => handleFilterChange('page', pagination.current + 1)}
                      disabled={!pagination.hasNext}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: pagination.hasNext ? 'white' : '#f8fafc',
                        color: pagination.hasNext ? '#4a5568' : '#a0aec0',
                        cursor: pagination.hasNext ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem'
                      }}
                    >
                      Növbəti <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Məhsul tapılmadı */
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <i 
                  className="fas fa-search" 
                  style={{ 
                    fontSize: '4rem', 
                    color: '#a0aec0',
                    marginBottom: '1.5rem',
                    display: 'block'
                  }}
                ></i>
                <h3 style={{
                  fontSize: '1.5rem',
                  color: '#4a5568',
                  marginBottom: '1rem'
                }}>
                  Bu kategoriyada məhsul tapılmadı
                </h3>
                <p style={{ 
                  color: '#718096',
                  marginBottom: '2rem',
                  lineHeight: '1.6'
                }}>
                  Seçdiyiniz filterlərə uyğun məhsul mövcud deyil. Filterləri dəyişərək yenidən cəhd edin.
                </p>
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#5a67d8'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
                >
                  Filterləri təmizlə
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS animasiyası */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive design */
        @media (max-width: 1024px) {
          .category-detail-container {
            grid-template-columns: 1fr !important;
          }
          .category-detail-sidebar {
            position: static !important;
            max-height: none !important;
          }
        }
        
        @media (max-width: 768px) {
          .category-detail-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .category-detail-toolbar > div {
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CategoryDetailPage;