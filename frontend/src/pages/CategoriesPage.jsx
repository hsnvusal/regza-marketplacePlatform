import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoryService } from '../services/categoryService';
import toastManager from '../utils/toastManager';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Kategoriyaları yüklə
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Paralel olaraq bütün məlumatları yüklə
      const [categoriesRes, featuredRes, treeRes] = await Promise.all([
        categoryService.getCategories({ limit: 50 }),
        categoryService.getFeaturedCategories(6),
        categoryService.getCategoryTree()
      ]);

      setCategories(categoriesRes.data.categories || []);
      setFeaturedCategories(featuredRes.data.categories || []);
      setCategoryTree(treeRes.data.tree || []);

      console.log('✅ Kategoriyalar yükləndi:', {
        categories: categoriesRes.data.categories?.length,
        featured: featuredRes.data.categories?.length,
        tree: treeRes.data.tree?.length
      });

    } catch (error) {
      console.error('❌ Kategoriyalar yüklənə bilmədi:', error);
      toastManager.error('Kategoriyalar yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  // Axtarış
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await categoryService.searchCategories(query, 10);
      setSearchResults(response.data.categories || []);
    } catch (error) {
      console.error('❌ Axtarış xətası:', error);
      toastManager.error('Axtarış zamanı xəta baş verdi');
    } finally {
      setIsSearching(false);
    }
  };

  // Axtarış debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Kategoriya kartı komponenti
  const CategoryCard = ({ category, size = 'normal' }) => (
    <Link
      to={`/categories/${category.slug}`}
      className="category-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'white',
        borderRadius: '12px',
        padding: size === 'large' ? '2rem' : '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #f1f3f4',
        transition: 'all 0.3s ease',
        height: '100%',
        ':hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
        }
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
      <div style={{ textAlign: 'center' }}>
        {/* Kategoriya şəkli və ya ikonu */}
        <div style={{
          width: size === 'large' ? '80px' : '60px',
          height: size === 'large' ? '80px' : '60px',
          margin: '0 auto 1rem',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${category.color || '#667eea'}, ${category.color || '#764ba2'})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'large' ? '2rem' : '1.5rem',
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

        {/* Kategoriya adı */}
        <h3 style={{
          fontSize: size === 'large' ? '1.5rem' : '1.25rem',
          fontWeight: '600',
          margin: '0 0 0.5rem',
          color: '#2d3748'
        }}>
          {category.name}
        </h3>

        {/* Təsvir */}
        {category.description && (
          <p style={{
            fontSize: '0.9rem',
            color: '#718096',
            margin: '0 0 1rem',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {category.description}
          </p>
        )}

        {/* Məhsul sayı */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: '#f7fafc',
          borderRadius: '20px',
          fontSize: '0.875rem',
          color: '#4a5568',
          fontWeight: '500'
        }}>
          <i className="fas fa-box" style={{ fontSize: '0.75rem' }}></i>
          {category.productCount || 0} məhsul
        </div>

        {/* Alt kategoriyalar göstəricisi */}
        {category.children && category.children.length > 0 && (
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            color: '#a0aec0'
          }}>
            +{category.children.length} alt kategoriya
          </div>
        )}
      </div>
    </Link>
  );

  // Kategoriya ağacı komponenti
  const CategoryTreeItem = ({ category, level = 0 }) => (
    <div style={{ marginLeft: level * 20 }}>
      <Link
        to={`/categories/${category.slug}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          textDecoration: 'none',
          color: '#4a5568',
          borderRadius: '8px',
          transition: 'background-color 0.2s',
          ':hover': {
            backgroundColor: '#f7fafc'
          }
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f7fafc'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <i 
          className={category.icon || 'fas fa-folder'} 
          style={{ 
            color: category.color || '#667eea',
            fontSize: '1rem'
          }}
        ></i>
        <span style={{ fontWeight: level === 0 ? '600' : '500' }}>
          {category.name}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.8rem',
          color: '#a0aec0'
        }}>
          {category.productCount || 0}
        </span>
      </Link>
      
      {category.children && category.children.map(child => (
        <CategoryTreeItem 
          key={child._id} 
          category={child} 
          level={level + 1} 
        />
      ))}
    </div>
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
            Kategoriyalar yüklənir...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '6rem 2rem 2rem',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            color: '#2d3748',
            marginBottom: '1rem'
          }}>
            📂 Kategoriyalar
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: '#718096',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Bütün məhsul kategoriyalarını kəşf edin və axtardığınızı asanlıqla tapın
          </p>
        </div>

        {/* Axtarış */}
        <div style={{
          maxWidth: '500px',
          margin: '0 auto 3rem',
          position: 'relative'
        }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Kategoriya axtarın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 3rem 1rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#a0aec0'
            }}>
              {isSearching ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-search"></i>
              )}
            </div>
          </div>

          {/* Axtarış nəticələri */}
          {searchQuery && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              marginTop: '0.5rem',
              zIndex: 10,
              border: '1px solid #e2e8f0'
            }}>
              {searchResults.map(category => (
                <Link
                  key={category._id}
                  to={`/categories/${category.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: '1px solid #f7fafc',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f7fafc'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <i 
                    className={category.icon || 'fas fa-folder'} 
                    style={{ color: category.color || '#667eea' }}
                  ></i>
                  <span style={{ fontWeight: '500' }}>{category.name}</span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.9rem',
                    color: '#a0aec0'
                  }}>
                    {category.productCount || 0} məhsul
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Seçilmiş kategoriyalar */}
        {featuredCategories.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              ⭐ Seçilmiş Kategoriyalar
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem'
            }}>
              {featuredCategories.map(category => (
                <CategoryCard 
                  key={category._id} 
                  category={category} 
                  size="large" 
                />
              ))}
            </div>
          </div>
        )}

        {/* Bütün kategoriyalar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '3rem',
          alignItems: 'start'
        }}>
          
          {/* Sol sidebar - Kategoriya ağacı */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #f1f3f4',
            position: 'sticky',
            top: '100px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-sitemap"></i>
              Kategoriya Ağacı
            </h3>
            
            {categoryTree.map(category => (
              <CategoryTreeItem key={category._id} category={category} />
            ))}
          </div>

          {/* Sağ tərəf - Bütün kategoriyalar */}
          <div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: '2rem'
            }}>
              📋 Bütün Kategoriyalar ({categories.length})
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {categories.map(category => (
                <CategoryCard key={category._id} category={category} />
              ))}
            </div>

            {categories.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
              }}>
                <i 
                  className="fas fa-inbox" 
                  style={{ 
                    fontSize: '3rem', 
                    color: '#a0aec0',
                    marginBottom: '1rem',
                    display: 'block'
                  }}
                ></i>
                <h3 style={{
                  fontSize: '1.5rem',
                  color: '#4a5568',
                  marginBottom: '0.5rem'
                }}>
                  Kategoriya tapılmadı
                </h3>
                <p style={{ color: '#718096' }}>
                  Hələlik heç bir kategoriya mövcud deyil
                </p>
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
        
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
};

export default CategoriesPage;