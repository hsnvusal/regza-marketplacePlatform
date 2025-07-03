// src/admin/pages/AdminCategories.jsx - DÜZƏLDİLMİŞ VERSİYA
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import './AdminCategories.css';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Form state - BACKEND FORMATINA UYĞUNLAŞDIRILDI
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    parent: '', // ✅ Backend parent field istifadə edir
    isActive: true,
    isFeatured: false,
    showInMenu: true,
    color: '#3182ce',
    sortOrder: 0
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ DÜZƏLİŞ: Service method istifadə et
      const result = await adminService.getCategories();
      console.log('Categories API response:', result); // Debug üçün
      
      if (result.success) {
        // ✅ DÜZƏLİŞ: Response struktur yoxla və handle et
        const categoriesData = result.categories || result.data?.categories || [];
        console.log('Categories data:', categoriesData);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } else {
        throw new Error(result.error || result.message || 'Kategoriyalar yüklənə bilmədi');
      }
    } catch (err) {
      console.error('Categories loading error:', err);
      setError(err.message);
      setCategories([]); // ✅ Error halında boş array
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Kategoriya adı tələb olunur';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Kategoriya adı ən azı 2 simvol olmalıdır';
    }

    if (!formData.description.trim()) {
      errors.description = 'Açıqlama tələb olunur';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Açıqlama ən azı 10 simvol olmalıdır';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      let result;
      
      // ✅ DÜZƏLİŞ: Backend formatına uyğun data göndər
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon.trim() || '📁',
        parent: formData.parent || null, // Backend parent field
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        showInMenu: formData.showInMenu,
        color: formData.color,
        sortOrder: parseInt(formData.sortOrder) || 0
      };

      console.log('Submitting category data:', submitData); // Debug

      if (editingCategory) {
        result = await adminService.updateCategory(editingCategory._id, submitData);
      } else {
        result = await adminService.createCategory(submitData);
      }

      console.log('Submit result:', result); // Debug

      if (result.success) {
        alert(result.message || (editingCategory ? 'Kategoriya yeniləndi!' : 'Kategoriya yaradıldı!'));
        resetForm();
        await loadCategories(); // Reload categories
      } else {
        throw new Error(result.error || result.message || 'Əməliyyat uğursuz oldu');
      }
    } catch (error) {
      console.error('Category save error:', error);
      alert('Xəta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      parent: '', // ✅ parent field
      isActive: true,
      isFeatured: false,
      showInMenu: true,
      color: '#3182ce',
      sortOrder: 0
    });
    setFormErrors({});
    setShowAddForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    console.log('Editing category:', category); // Debug
    
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      parent: category.parent?._id || category.parent || '', // ✅ Backend parent structure
      isActive: category.isActive !== false,
      isFeatured: category.isFeatured || false,
      showInMenu: category.showInMenu !== false,
      color: category.color || '#3182ce',
      sortOrder: category.sortOrder || 0
    });
    setEditingCategory(category);
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Bu kategoriyani silmək istədiyinizə əminsiniz?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await adminService.deleteCategory(categoryId);
      if (result.success) {
        alert(result.message || 'Kategoriya silindi!');
        await loadCategories();
      } else {
        throw new Error(result.error || result.message || 'Silinmə uğursuz oldu');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silinmə xətası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (categoryId, field, newValue) => {
    try {
      const statusData = { [field]: newValue };
      console.log('Updating status:', { categoryId, statusData }); // Debug
      
      const result = await adminService.updateCategoryStatus(categoryId, statusData);
      if (result.success) {
        await loadCategories(); // Reload categories
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Status dəyişdirilərkən xəta: ' + error.message);
    }
  };

  // ✅ DÜZƏLİŞ: Parent kategoriya tapmaq üçün düzgün method
  const getParentCategoryName = (parentId) => {
    if (!parentId) return 'Əsas Kategoriya';
    const parent = categories.find(cat => cat._id === parentId);
    return parent ? parent.name : 'Əsas Kategoriya';
  };

  // ✅ DÜZƏLİŞ: Alt kategoriyaları tapmaq
  const getSubCategories = (parentId) => {
    return categories.filter(cat => 
      cat.parent === parentId || 
      cat.parent?._id === parentId
    );
  };

  // ✅ DÜZƏLİŞ: Əsas kategoriyaları tap
  const getMainCategories = () => {
    return categories.filter(cat => 
      !cat.parent || 
      cat.parent === null
    );
  };

  if (loading && categories.length === 0) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Kategoriyalar yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-categories">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>📁 Kategoriyalar</h1>
          <p>Məhsul kategoriyalarını idarə edin</p>
          {/* ✅ DÜZƏLİŞ: Debug məlumatı əlavə et */}
          <small style={{ color: '#666' }}>
            Yükləndi: {categories.length} kategoriya
          </small>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => loadCategories()}
            className="btn btn-secondary"
            disabled={loading}
          >
            🔄 {loading ? 'Yüklənir...' : 'Yenilə'}
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            ➕ Yeni Kategoriya
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="alert-close">✕</button>
        </div>
      )}

      {/* Debug info - development üçün */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          background: '#f0f0f0', 
          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong><br />
          Categories length: {categories.length}<br />
          Loading: {loading.toString()}<br />
          Error: {error || 'none'}<br />
          Main categories: {getMainCategories().length}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-modal-header">
              <h3>{editingCategory ? '✏️ Kategoriyani Redaktə Et' : '➕ Yeni Kategoriya'}</h3>
              <button onClick={resetForm} className="close-btn">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Kategoriya Adı *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={formErrors.name ? 'error' : ''}
                    placeholder="Məs: Elektronika"
                    required
                    maxLength="100"
                  />
                  {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="icon">İkon (Emoji)</label>
                  <input
                    type="text"
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    placeholder="📱"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Açıqlama *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={formErrors.description ? 'error' : ''}
                  placeholder="Kategoriya açıqlaması"
                  rows="3"
                  required
                  maxLength="500"
                />
                {formErrors.description && <span className="error-message">{formErrors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parent">Ana Kategoriya</label>
                  <select
                    id="parent"
                    name="parent"
                    value={formData.parent}
                    onChange={handleInputChange}
                  >
                    <option value="">Əsas Kategoriya</option>
                    {getMainCategories()
                      .filter(cat => !editingCategory || cat._id !== editingCategory._id)
                      .map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="sortOrder">Sıralama</label>
                  <input
                    type="number"
                    id="sortOrder"
                    name="sortOrder"
                    value={formData.sortOrder}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="color">Rəng</label>
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Aktiv kategoriya
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Öne çıxarılmış
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="showInMenu"
                    checked={formData.showInMenu}
                    onChange={handleInputChange}
                  />
                  <span className="checkmark"></span>
                  Menyuda göstər
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn btn-cancel">
                  ❌ Ləğv et
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '⏳ Gözləyin...' : (editingCategory ? '💾 Yenilə' : '✅ Yarat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="categories-container">
        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>Hələ heç bir kategoriya yoxdur</h3>
            <p>İlk kategoriyani yaradın</p>
            <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
              ➕ Kategoriya Yarat
            </button>
          </div>
        ) : (
          <div className="categories-grid">
            {getMainCategories().map(category => (
              <div key={category._id} className="category-card">
                <div className="category-header">
                  <div className="category-info">
                    <div 
                      className="category-icon"
                      style={{ backgroundColor: category.color || '#3182ce' }}
                    >
                      {category.icon || '📁'}
                    </div>
                    <div className="category-details">
                      <h3>{category.name}</h3>
                      <p>{category.description}</p>
                      {category.slug && (
                        <small className="category-slug">/{category.slug}</small>
                      )}
                    </div>
                  </div>
                  <div className="category-actions">
                    <button
                      onClick={() => handleStatusToggle(category._id, 'isActive', !category.isActive)}
                      className={`status-btn ${category.isActive ? 'active' : 'inactive'}`}
                      title={category.isActive ? 'Deaktiv et' : 'Aktiv et'}
                    >
                      {category.isActive ? '✅' : '❌'}
                    </button>
                    <button
                      onClick={() => handleStatusToggle(category._id, 'isFeatured', !category.isFeatured)}
                      className={`featured-btn ${category.isFeatured ? 'featured' : 'normal'}`}
                      title={category.isFeatured ? 'Öne çıxarılmışlıqdan çıxar' : 'Öne çıxar'}
                    >
                      {category.isFeatured ? '⭐' : '☆'}
                    </button>
                    <button onClick={() => handleEdit(category)} className="edit-btn">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(category._id)} className="delete-btn">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Sub Categories */}
                {getSubCategories(category._id).length > 0 && (
                  <div className="sub-categories">
                    <h4>Alt Kategoriyalar:</h4>
                    <div className="sub-categories-list">
                      {getSubCategories(category._id).map(subCat => (
                        <div key={subCat._id} className="sub-category-item">
                          <span className="sub-cat-icon">{subCat.icon || '📄'}</span>
                          <span className="sub-cat-name">{subCat.name}</span>
                          <div className="sub-cat-actions">
                            <button
                              onClick={() => handleStatusToggle(subCat._id, 'isActive', !subCat.isActive)}
                              className={`mini-status-btn ${subCat.isActive ? 'active' : 'inactive'}`}
                            >
                              {subCat.isActive ? '✅' : '❌'}
                            </button>
                            <button onClick={() => handleEdit(subCat)} className="mini-edit-btn">
                              ✏️
                            </button>
                            <button onClick={() => handleDelete(subCat._id)} className="mini-delete-btn">
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="category-stats">
                  <span className="stat-item">
                    📊 {getSubCategories(category._id).length} alt kategoriya
                  </span>
                  <span className="stat-item">
                    🎯 Sıra: {category.sortOrder || 0}
                  </span>
                  {category.productCount !== undefined && (
                    <span className="stat-item">
                      📦 {category.productCount} məhsul
                    </span>
                  )}
                  <span className="stat-item">
                    {category.isActive ? '🟢 Aktiv' : '🔴 Deaktiv'}
                  </span>
                  {category.isFeatured && (
                    <span className="stat-item">
                      ⭐ Öne çıxarılmış
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;