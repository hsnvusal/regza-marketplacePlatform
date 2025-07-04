// ImageUpload.js - Sadələşdirilmiş versiya
import React, { useState, useRef } from 'react';
import adminService from '../services/adminService';

const ImageUpload = ({ 
  images = [], 
  onImagesChange, 
  maxImages = 10, 
  maxSize = 5 * 1024 * 1024,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Şəkil yükləmə funksiyası
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Maksimum şəkil sayını yoxla
    if (images.length + files.length > maxImages) {
      setError(`Maksimum ${maxImages} şəkil yükləyə bilərsiniz`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Faylları validasiya et
      for (const file of files) {
        const validation = adminService.validateImageFile(file, maxSize);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      }

      const newImages = [];

      // Hər bir faylı yüklə
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempId = `temp_${Date.now()}_${i}`;
        
        try {
          // Progress tracking üçün
          setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

          // Preview URL yarat
          const previewUrl = URL.createObjectURL(file);

          // FormData yarat
          const formData = new FormData();
          formData.append('image', file);
          formData.append('type', 'product');
          formData.append('folder', 'products');

          // Şəkli serverə yüklə
          const uploadResult = await adminService.uploadImage(formData, (progress) => {
            setUploadProgress(prev => ({ ...prev, [tempId]: progress }));
          });

          if (uploadResult.success) {
            const imageObj = {
              id: uploadResult.data.id || tempId,
              url: uploadResult.data.url,
              publicId: uploadResult.data.publicId,
              name: file.name,
              size: file.size,
              type: file.type,
              preview: previewUrl,
              uploaded: true,
              isMain: images.length === 0 && newImages.length === 0 // İlk şəkli əsas et
            };

            newImages.push(imageObj);
            console.log('✅ Image uploaded successfully:', imageObj);
          } else {
            // Preview URL-i təmizlə
            URL.revokeObjectURL(previewUrl);
            throw new Error(uploadResult.error || 'Şəkil yükləmə xətası');
          }

        } catch (uploadError) {
          console.error('❌ Image upload failed:', file.name, uploadError);
          setError(`${file.name} yüklənərkən xəta: ${uploadError.message}`);
          
          // Progress-i təmizlə
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[tempId];
            return updated;
          });
        }
      }

      // Yeni şəkilləri əlavə et
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        onImagesChange(updatedImages);
        console.log('✅ Images added to form:', newImages.length);
      }

    } catch (error) {
      console.error('❌ File selection error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress({});
      // Input-u təmizlə
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Şəkli sil
  const removeImage = async (imageId) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;

    try {
      // Server-dən sil (əgər upload edilib)
      if (imageToRemove.uploaded && imageToRemove.publicId) {
        await adminService.deleteImage(imageToRemove.publicId);
      }

      // Preview URL-i təmizlə
      if (imageToRemove.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      // Array-dən sil
      const updatedImages = images.filter(img => img.id !== imageId);
      
      // Əgər silinən şəkil əsas idisə, yeni əsas şəkil təyin et
      if (imageToRemove.isMain && updatedImages.length > 0) {
        updatedImages[0].isMain = true;
      }

      onImagesChange(updatedImages);
      console.log('✅ Image removed:', imageId);

    } catch (error) {
      console.error('❌ Remove image error:', error);
      setError('Şəkil silinərkən xəta baş verdi');
    }
  };

  // Əsas şəkli təyin et
  const setMainImage = (imageId) => {
    const updatedImages = images.map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    onImagesChange(updatedImages);
  };

  return (
    <div className="image-upload-section">
      {error && (
        <div className="error-alert">
          <span className="error-icon">❌</span>
          <span className="error-text">{error}</span>
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {/* Upload Area */}
      <div className="upload-area">
        <input
          ref={fileInputRef}
          type="file"
          id="image-upload"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleFileSelect}
          className="file-input"
          disabled={uploading || images.length >= maxImages}
        />
        <label htmlFor="image-upload" className="upload-label">
          <div className="upload-content">
            <div className="upload-icon">
              {uploading ? '⏳' : '📷'}
            </div>
            <div className="upload-text">
              <h4>
                {uploading ? 'Şəkillər yüklənir...' : 'Şəkil yükləyin'}
              </h4>
              <p>
                {uploading ? 
                  `${Object.keys(uploadProgress).length} şəkil yüklənir` :
                  'Kliklə seçin və ya sürükləyin'
                }
              </p>
              <small>
                JPEG, PNG, WebP - Maksimum 5MB - {images.length}/{maxImages} şəkil
              </small>
            </div>
          </div>
          
          {uploading && (
            <div className="upload-progress">
              {Object.entries(uploadProgress).map(([id, progress]) => (
                <div key={id} className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <span className="progress-text">{progress}%</span>
                </div>
              ))}
            </div>
          )}
        </label>
      </div>

      {/* Images Preview */}
      {images.length > 0 && (
        <div className="images-preview">
          <div className="preview-header">
            <h4>Yüklənmiş Şəkillər ({images.length})</h4>
            <button 
              onClick={() => {
                images.forEach(img => {
                  if (img.preview) URL.revokeObjectURL(img.preview);
                });
                onImagesChange([]);
              }}
              className="clear-all-btn"
              type="button"
            >
              🗑️ Hamısını sil
            </button>
          </div>

          <div className="images-grid">
            {images.map((image, index) => (
              <div key={image.id} className="image-item">
                <div className="image-preview">
                  <img 
                    src={image.url || image.preview} 
                    alt={image.name}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCA4NEM3My4yNTQ4IDg0IDg0IDczLjI1NDggODQgNjBDODQgNDYuNzQ1MiA3My4yNTQ4IDM2IDYwIDM2QzQ2Ljc0NTIgMzYgMzYgNDYuNzQ1MiAzNiA2MEMzNiA3My4yNTQ4IDQ2Ljc0NTIgODQgNjAgODRaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo=';
                    }}
                    loading="lazy"
                  />
                  
                  {/* Image Status */}
                  <div className="image-status">
                    {image.uploaded ? '✅' : '⏳'}
                  </div>

                  {/* Image Overlay */}
                  <div className="image-overlay">
                    <button
                      type="button"
                      onClick={() => setMainImage(image.id)}
                      className={`overlay-btn main ${image.isMain ? 'active' : ''}`}
                      title="Əsas şəkil et"
                    >
                      ⭐
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="overlay-btn remove"
                      title="Şəkli sil"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Image Info */}
                <div className="image-info">
                  <div className="image-name" title={image.name}>
                    {image.name}
                  </div>
                  <div className="image-meta">
                    <span className="image-size">
                      {adminService.formatFileSize(image.size)}
                    </span>
                    {image.isMain && (
                      <span className="main-badge">Əsas</span>
                    )}
                    {!image.uploaded && (
                      <span className="uploading-badge">Yüklənir...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="upload-instructions">
        <h5>📋 Şəkil yükləmə qaydaları:</h5>
        <ul>
          <li>✅ Dəstəklənən formatlar: JPEG, PNG, WebP</li>
          <li>📏 Maksimum fayl ölçüsü: 5MB</li>
          <li>🔢 Maksimum şəkil sayı: {maxImages}</li>
          <li>⭐ İlk şəkil avtomatik olaraq əsas şəkil olur</li>
        </ul>
      </div>

      <style jsx>{`
        .image-upload-section {
          margin: 1.5rem 0;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: #fed7d7;
          border: 1px solid #feb2b2;
          border-radius: 8px;
          color: #9b2c2c;
          margin-bottom: 1rem;
        }

        .error-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #9b2c2c;
          cursor: pointer;
          font-size: 1.25rem;
        }

        .upload-area {
          position: relative;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s ease;
          background: #f8fafc;
          margin-bottom: 1.5rem;
        }

        .upload-area:hover {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .file-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .upload-label {
          cursor: pointer;
          display: block;
        }

        .upload-label:hover .upload-icon {
          transform: scale(1.1);
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .upload-icon {
          font-size: 3rem;
          transition: transform 0.2s ease;
        }

        .upload-text h4 {
          margin: 0 0 0.5rem;
          color: #2d3748;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .upload-text p {
          margin: 0 0 0.5rem;
          color: #4a5568;
          font-size: 1rem;
        }

        .upload-text small {
          color: #718096;
          font-size: 0.875rem;
        }

        .upload-progress {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .progress-bar {
          position: relative;
          height: 24px;
          background: #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .images-preview {
          margin-top: 2rem;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .preview-header h4 {
          margin: 0;
          color: #2d3748;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .clear-all-btn {
          padding: 0.5rem 1rem;
          background: #fed7d7;
          color: #9b2c2c;
          border: 1px solid #feb2b2;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .clear-all-btn:hover {
          background: #feb2b2;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1rem;
        }

        .image-item {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .image-item:hover {
          transform: translateY(-2px);
        }

        .image-preview {
          position: relative;
          padding-top: 100%;
          overflow: hidden;
        }

        .image-preview img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-status {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          background: rgba(255, 255, 255, 0.9);
          padding: 0.25rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .image-item:hover .image-overlay {
          opacity: 1;
        }

        .overlay-btn {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .overlay-btn:hover {
          background: white;
          transform: scale(1.1);
        }

        .overlay-btn.main.active {
          background: #fbbf24;
          color: white;
        }

        .overlay-btn.remove:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .image-info {
          padding: 0.75rem;
        }

        .image-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #2d3748;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .image-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .image-size {
          font-size: 0.75rem;
          color: #718096;
        }

        .main-badge {
          background: #fbbf24;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .uploading-badge {
          background: #3b82f6;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .upload-instructions {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #f0f4ff;
          border-radius: 8px;
        }

        .upload-instructions h5 {
          margin: 0 0 0.75rem;
          color: #2d3748;
          font-size: 1rem;
          font-weight: 600;
        }

        .upload-instructions ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #4a5568;
        }

        .upload-instructions li {
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .images-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.75rem;
          }

          .upload-area {
            padding: 1.5rem;
          }

          .upload-icon {
            font-size: 2rem;
          }

          .preview-header {
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageUpload;