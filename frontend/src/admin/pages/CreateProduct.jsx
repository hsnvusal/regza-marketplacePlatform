// src/admin/pages/CreateProduct.jsx - Real image upload ilə
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/adminService';
import ImageUpload from '../components/ImageUpload'; // Yeni komponent

const CreateProduct = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    brand: '',
    category: '',
    vendor: '',
    status: 'draft',
    featured: false,
    pricing: {
      costPrice: '',
      sellingPrice: '',
      discountPrice: '',
      currency: 'AZN',
      taxable: true
    },
    inventory: {
      stock: '',
      lowStockThreshold: 5,
      trackQuantity: true
    },
    images: [], // Bu artıq real URL-ləri saxlayacaq
    tags: [],
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    }
  });

  useEffect(() => {
    loadFormData();
    
    // Cleanup function - component unmount olduqda preview URL-ləri təmizlə
    return () => {
      formData.images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const loadFormData = async () => {
    try {
      setFormLoading(true);
      setError('');

      const [categoriesResult, vendorsResult] = await Promise.all([
        adminService.getCategories({ limit: 100 }),
        adminService.getVendors({ status: 'approved' })
      ]);

      if (categoriesResult.success) {
        setCategories(categoriesResult.categories || []);
        console.log('✅ Categories loaded:', categoriesResult.categories?.length);
      } else {
        console.error('❌ Categories error:', categoriesResult.error);
      }

      if (vendorsResult.success) {
        setVendors(vendorsResult.vendors || []);
        console.log('✅ Vendors loaded:', vendorsResult.vendors?.length);
      } else {
        console.error('❌ Vendors error:', vendorsResult.error);
      }

    } catch (error) {
      console.error('❌ Form data loading error:', error);
      setError('Form məlumatları yüklənərkən xəta baş verdi: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Nested object fields (pricing.sellingPrice, inventory.stock, etc.)
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // 🆕 Şəkil dəyişikliyi handler-i
  const handleImagesChange = (newImages) => {
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
    console.log('📸 Images updated:', newImages.length);
  };

  // SKU avtomatik generasiya
  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const brandPrefix = formData.brand ? formData.brand.substring(0, 3).toUpperCase() : 'PRD';
    return `${brandPrefix}-${timestamp}-${random}`;
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name?.trim()) {
      errors.push('Məhsul adı tələb olunur');
    }

    if (!formData.description?.trim()) {
      errors.push('Məhsul təsviri tələb olunur');
    }

    if (!formData.sku?.trim()) {
      errors.push('SKU tələb olunur');
    }

    if (!formData.pricing?.sellingPrice || parseFloat(formData.pricing.sellingPrice) <= 0) {
      errors.push('Satış qiyməti tələb olunur və 0-dan böyük olmalıdır');
    }

    if (formData.pricing?.costPrice && parseFloat(formData.pricing.costPrice) < 0) {
      errors.push('Maya dəyəri mənfi ola bilməz');
    }

    if (formData.inventory?.stock && parseFloat(formData.inventory.stock) < 0) {
      errors.push('Stok miqdarı mənfi ola bilməz');
    }

    // Şəkil yoxlaması - ən azı bir şəkil upload edilməli
    const uploadedImages = formData.images.filter(img => img.uploaded);
    if (uploadedImages.length === 0) {
      errors.push('Ən azı bir şəkil yükləməlisiniz');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Form validation
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Hələ yüklənməmiş şəkillər var mı?
      const pendingImages = formData.images.filter(img => !img.uploaded);
      if (pendingImages.length > 0) {
        throw new Error(`${pendingImages.length} şəkil hələ yüklənir. Zəhmət olmasa gözləyin.`);
      }

      // Format product data
      const productData = {
        ...formData,
        pricing: {
          ...formData.pricing,
          costPrice: formData.pricing.costPrice ? parseFloat(formData.pricing.costPrice) : undefined,
          sellingPrice: parseFloat(formData.pricing.sellingPrice),
          discountPrice: formData.pricing.discountPrice ? parseFloat(formData.pricing.discountPrice) : undefined
        },
        inventory: {
          ...formData.inventory,
          stock: formData.inventory.stock ? parseInt(formData.inventory.stock) : 0,
          lowStockThreshold: parseInt(formData.inventory.lowStockThreshold) || 5
        },
        // Real uploaded images
        images: formData.images
          .filter(img => img.uploaded && img.url) // Yalnız upload edilmiş şəkillər
          .map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            name: img.name,
            size: img.size,
            type: img.type,
            isMain: img.isMain || index === 0, // İlk şəkil əsas olsun
            order: index
          }))
      };

      // Remove empty fields
      if (!productData.category) delete productData.category;
      if (!productData.vendor) delete productData.vendor;
      if (!productData.brand) delete productData.brand;

      console.log('📤 Submitting product data:', productData);

      const result = await adminService.createProduct(productData);
      
      if (result.success) {
        setSuccess('Məhsul uğurla yaradıldı!');
        console.log('✅ Product created successfully:', result.product);
        
        // Clean up preview URLs
        formData.images.forEach(img => {
          if (img.preview) {
            URL.revokeObjectURL(img.preview);
          }
        });
        
        setTimeout(() => {
          navigate('/admin/products');
        }, 2000);
      } else {
        console.error('❌ Product creation failed:', result.error);
        setError(result.error || 'Məhsul yaradılarkən xəta baş verdi');
        
        if (result.errors && result.errors.length > 0) {
          setError(result.error + ': ' + result.errors.join(', '));
        }
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      setError(error.message || 'Məhsul yaradılarkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clean up preview URLs
    formData.images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    navigate('/admin/products');
  };

  if (formLoading) {
    return (
      <div className="create-product">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>Form məlumatları yüklənir...</h3>
          <p>Zəhmət olmasa gözləyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-product">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">
              <span className="title-icon">➕</span>
              Yeni Məhsul Əlavə Et
            </h1>
            <p className="page-subtitle">
              Mağazanıza yeni məhsul əlavə edin
            </p>
          </div>
          <div className="header-actions">
            <button onClick={handleCancel} className="btn btn-secondary">
              <span className="btn-icon">❌</span>
              Ləğv et
            </button>
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">❌</div>
          <div className="alert-content">
            <h4>Xəta baş verdi</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">✅</div>
          <div className="alert-content">
            <h4>Uğurlu əməliyyat</h4>
            <p>{success}</p>
          </div>
        </div>
      )}

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="product-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3 className="section-title">📝 Əsas Məlumatlar</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Məhsul Adı *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Məhsul adını daxil edin..."
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sku">SKU *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="Unikal məhsul kodu..."
                  required
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, sku: generateSKU() }))}
                  className="generate-btn"
                  title="Avtomatik SKU generasiya et"
                >
                  🎲
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="brand">Marka</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="Məhsul markası..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Kateqoriya</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Kateqoriya seçin...</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.icon && `${category.icon} `}{category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <small className="form-hint text-warning">
                  Kateqoriya yüklənmədi. Səhifəni yeniləyin.
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="vendor">Satıcı</label>
              <select
                id="vendor"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Satıcı seçin...</option>
                {vendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.businessName || `${vendor.firstName} ${vendor.lastName}`}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <small className="form-hint text-warning">
                  Vendor yüklənmədi. Səhifəni yeniləyin.
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="draft">📝 Qaralama</option>
                <option value="active">✅ Aktiv</option>
                <option value="inactive">❌ Deaktiv</option>
                <option value="pending">⏳ Gözləyir</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Təsvir *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Məhsul haqqında ətraflı məlumat..."
              required
              rows="4"
              className="form-textarea"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                className="form-checkbox"
              />
              <span className="checkbox-text">🌟 Featured məhsul</span>
            </label>
          </div>
        </div>

        {/* 🆕 Image Upload Section with new component */}
        <div className="form-section">
          <ImageUpload
            images={formData.images}
            onImagesChange={handleImagesChange}
            maxImages={10}
            maxSize={5 * 1024 * 1024} // 5MB
            acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
            adminService={adminService}
          />
        </div>

        {/* Pricing Information */}
        <div className="form-section">
          <h3 className="section-title">💰 Qiymət Məlumatları</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pricing.costPrice">Maya Dəyəri</label>
              <input
                type="number"
                id="pricing.costPrice"
                name="pricing.costPrice"
                value={formData.pricing.costPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricing.sellingPrice">Satış Qiyməti *</label>
              <input
                type="number"
                id="pricing.sellingPrice"
                name="pricing.sellingPrice"
                value={formData.pricing.sellingPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricing.discountPrice">Endirimli Qiymət</label>
              <input
                type="number"
                id="pricing.discountPrice"
                name="pricing.discountPrice"
                value={formData.pricing.discountPrice}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricing.currency">Valyuta</label>
              <select
                id="pricing.currency"
                name="pricing.currency"
                value={formData.pricing.currency}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="AZN">₼ AZN</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="pricing.taxable"
                checked={formData.pricing.taxable}
                onChange={handleInputChange}
                className="form-checkbox"
              />
              <span className="checkbox-text">🧾 Vergi daxildir</span>
            </label>
          </div>
        </div>

        {/* Inventory Information */}
        <div className="form-section">
          <h3 className="section-title">📦 Inventar Məlumatları</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="inventory.stock">Stok Miqdarı</label>
              <input
                type="number"
                id="inventory.stock"
                name="inventory.stock"
                value={formData.inventory.stock}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="inventory.lowStockThreshold">Az Stok Hədi</label>
              <input
                type="number"
                id="inventory.lowStockThreshold"
                name="inventory.lowStockThreshold"
                value={formData.inventory.lowStockThreshold}
                onChange={handleInputChange}
                placeholder="5"
                min="0"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="inventory.trackQuantity"
                checked={formData.inventory.trackQuantity}
                onChange={handleInputChange}
                className="form-checkbox"
              />
              <span className="checkbox-text">📊 Stok miqdarını izlə</span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            <span className="btn-icon">❌</span>
            Ləğv et
          </button>
          
          <button
            type="submit"
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || formData.images.filter(img => img.uploaded).length === 0}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Yaradılır...
              </>
            ) : (
              <>
                <span className="btn-icon">✅</span>
                Məhsul Yarat
              </>
            )}
          </button>
        </div>
      </form>

      {/* Image Upload Status */}
      {formData.images.length > 0 && (
        <div className="upload-status">
          <div className="status-header">
            <h4>📊 Şəkil Statusu</h4>
          </div>
          <div className="status-content">
            <div className="status-item">
              <span className="status-label">Ümumi şəkil:</span>
              <span className="status-value">{formData.images.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Yüklənmiş:</span>
              <span className="status-value success">
                {formData.images.filter(img => img.uploaded).length}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Gözləyən:</span>
              <span className="status-value warning">
                {formData.images.filter(img => !img.uploaded).length}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Əsas şəkil:</span>
              <span className="status-value">
                {formData.images.find(img => img.isMain)?.name || 'Seçilməyib'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Styling */}
      <style jsx>{`
        .create-product {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
          background: #f7f9fc;
          min-height: 100vh;
        }

        .page-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          color: white;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          font-size: 2.2rem;
          background: rgba(255,255,255,0.2);
          padding: 0.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
        }

        .page-subtitle {
          color: rgba(255,255,255,0.9);
          margin: 0.5rem 0 0;
          font-size: 1.1rem;
          font-weight: 400;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .alert-error {
          background: #fed7d7;
          border: 1px solid #feb2b2;
          color: #9b2c2c;
        }

        .alert-success {
          background: #c6f6d5;
          border: 1px solid #9ae6b4;
          color: #22543d;
        }

        .alert-icon {
          font-size: 1.5rem;
        }

        .alert-content h4 {
          margin: 0 0 0.25rem;
          font-weight: 600;
        }

        .alert-content p {
          margin: 0;
        }

        .product-form {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .form-section {
          padding: 2rem;
          border-bottom: 1px solid #f1f3f4;
        }

        .form-section:last-child {
          border-bottom: none;
        }

        .section-title {
          margin: 0 0 2rem;
          color: #2d3748;
          font-size: 1.4rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.95rem;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          background: white;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-hint {
          color: #718096;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .text-warning {
          color: #d69e2e;
        }

        .checkbox-group {
          flex-direction: row;
          align-items: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-weight: 500;
          color: #4a5568;
        }

        .form-checkbox {
          width: 18px;
          height: 18px;
          accent-color: #667eea;
        }

        .checkbox-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .input-with-button {
          display: flex;
          gap: 0.5rem;
        }

        .input-with-button .form-input {
          flex: 1;
        }

        .generate-btn {
          padding: 0.875rem;
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1.1rem;
        }

        .generate-btn:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .form-actions {
          padding: 2rem;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.95rem;
          position: relative;
          overflow: hidden;
        }

        .btn-icon {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary.loading {
          color: rgba(255,255,255,0.8);
        }

        .btn-secondary {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f7fafc;
          border-color: #cbd5e0;
          transform: translateY(-1px);
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .upload-status {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .status-header h4 {
          margin: 0 0 1rem;
          color: #2d3748;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .status-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .status-label {
          font-weight: 500;
          color: #4a5568;
        }

        .status-value {
          font-weight: 600;
          color: #2d3748;
        }

        .status-value.success {
          color: #22543d;
        }

        .status-value.warning {
          color: #d69e2e;
        }

        @media (max-width: 768px) {
          .create-product {
            padding: 0.75rem;
          }

          .page-header {
            padding: 1.5rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
          }

          .page-title {
            font-size: 1.6rem;
            justify-content: center;
          }

          .title-icon {
            width: 50px;
            height: 50px;
            font-size: 1.8rem;
          }

          .form-section {
            padding: 1.5rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .form-actions {
            padding: 1.5rem;
            flex-direction: column;
          }

          .btn {
            justify-content: center;
          }

          .status-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 320px) {
          .input-with-button {
            flex-direction: column;
          }

          .generate-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateProduct;