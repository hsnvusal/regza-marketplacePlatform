// controllers/uploadController.js - Backend upload controller
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cloudinary konfiqurasiyası
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer konfiqurasiyası
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Yalnız şəkil fayllarına icazə ver
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Yalnız şəkil faylları qəbul edilir'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Maksimum 10 fayl
  }
});

// Şəkil yükləmə middleware
const uploadMiddleware = upload.single('image');

const uploadController = {
  // Tək şəkil yükləmə
  uploadImage: async (req, res) => {
    try {
      uploadMiddleware(req, res, async (err) => {
        if (err) {
          console.error('❌ Multer error:', err);
          return res.status(400).json({
            success: false,
            error: err.message || 'Fayl yükləmə xətası'
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'Fayl seçilməyib'
          });
        }

        try {
          // Cloudinary-ə yüklə
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: req.body.folder || 'products',
            public_id: `${req.body.type || 'product'}_${Date.now()}`,
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          });

          // Temp faylı sil
          fs.unlinkSync(req.file.path);

          console.log('✅ Image uploaded to Cloudinary:', result.public_id);

          res.json({
            success: true,
            id: result.public_id,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            created_at: result.created_at
          });

        } catch (cloudinaryError) {
          console.error('❌ Cloudinary upload error:', cloudinaryError);
          
          // Temp faylı sil
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          res.status(500).json({
            success: false,
            error: 'Şəkil server-ə yüklənə bilmədi: ' + cloudinaryError.message
          });
        }
      });

    } catch (error) {
      console.error('❌ Upload controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Server xətası: ' + error.message
      });
    }
  },

  // Çoxlu şəkil yükləmə
  uploadMultipleImages: async (req, res) => {
    try {
      const uploadMultiple = upload.array('images', 10);
      
      uploadMultiple(req, res, async (err) => {
        if (err) {
          console.error('❌ Multiple upload error:', err);
          return res.status(400).json({
            success: false,
            error: err.message || 'Fayllar yükləmə xətası'
          });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Fayl seçilməyib'
          });
        }

        const results = [];
        const errors = [];

        for (const file of req.files) {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: req.body.folder || 'products',
              public_id: `${req.body.type || 'product'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            });

            results.push({
              success: true,
              file: file.originalname,
              id: result.public_id,
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              size: result.bytes
            });

            // Temp faylı sil
            fs.unlinkSync(file.path);

          } catch (uploadError) {
            console.error('❌ Single file upload error:', uploadError);
            errors.push({
              file: file.originalname,
              error: uploadError.message
            });

            // Temp faylı sil
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

        const successful = results.filter(r => r.success);
        const failed = errors.length;

        res.json({
          success: failed === 0,
          results: results,
          errors: errors,
          summary: {
            total: req.files.length,
            successful: successful.length,
            failed: failed,
            successRate: Math.round((successful.length / req.files.length) * 100)
          }
        });
      });

    } catch (error) {
      console.error('❌ Multiple upload controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Server xətası: ' + error.message
      });
    }
  },

  // Şəkil silmə
  deleteImage: async (req, res) => {
    try {
      const { publicId } = req.body;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: 'Public ID tələb olunur'
        });
      }

      // Cloudinary-dən sil
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        console.log('✅ Image deleted from Cloudinary:', publicId);
        res.json({
          success: true,
          message: 'Şəkil uğurla silindi',
          publicId: publicId
        });
      } else {
        console.log('⚠️ Image not found on Cloudinary:', publicId);
        res.status(404).json({
          success: false,
          error: 'Şəkil tapılmadı'
        });
      }

    } catch (error) {
      console.error('❌ Delete image error:', error);
      res.status(500).json({
        success: false,
        error: 'Şəkil silinərkən xəta baş verdi: ' + error.message
      });
    }
  },

  // Şəkil məlumatları əldə et
  getImageInfo: async (req, res) => {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: 'Public ID tələb olunur'
        });
      }

      // Cloudinary-dən məlumat əldə et
      const result = await cloudinary.api.resource(publicId);

      res.json({
        success: true,
        data: {
          id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          created_at: result.created_at,
          folder: result.folder
        }
      });

    } catch (error) {
      console.error('❌ Get image info error:', error);
      
      if (error.http_code === 404) {
        res.status(404).json({
          success: false,
          error: 'Şəkil tapılmadı'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Şəkil məlumatları əldə edilərkən xəta: ' + error.message
        });
      }
    }
  },

  // Folder-dəki bütün şəkilləri əldə et
  getImagesByFolder: async (req, res) => {
    try {
      const { folder } = req.params;
      const { limit = 50, nextCursor } = req.query;

      const options = {
        type: 'upload',
        prefix: folder + '/',
        max_results: parseInt(limit)
      };

      if (nextCursor) {
        options.next_cursor = nextCursor;
      }

      const result = await cloudinary.api.resources(options);

      const images = result.resources.map(resource => ({
        id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        size: resource.bytes,
        created_at: resource.created_at,
        folder: resource.folder
      }));

      res.json({
        success: true,
        images: images,
        total: result.total_count,
        hasMore: !!result.next_cursor,
        nextCursor: result.next_cursor
      });

    } catch (error) {
      console.error('❌ Get images by folder error:', error);
      res.status(500).json({
        success: false,
        error: 'Folder şəkilləri əldə edilərkən xəta: ' + error.message
      });
    }
  },

  // Şəkil transformasiyası
  transformImage: async (req, res) => {
    try {
      const { publicId } = req.params;
      const { width, height, crop = 'fill', quality = 'auto:good' } = req.query;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: 'Public ID tələb olunur'
        });
      }

      // Transformation parametrləri
      const transformations = [];

      if (width || height) {
        transformations.push({
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          crop: crop
        });
      }

      transformations.push({ quality });
      transformations.push({ fetch_format: 'auto' });

      // Transformasiya edilmiş URL yarat
      const transformedUrl = cloudinary.url(publicId, {
        transformation: transformations
      });

      res.json({
        success: true,
        originalUrl: cloudinary.url(publicId),
        transformedUrl: transformedUrl,
        transformations: transformations
      });

    } catch (error) {
      console.error('❌ Transform image error:', error);
      res.status(500).json({
        success: false,
        error: 'Şəkil transformasiyası xətası: ' + error.message
      });
    }
  },

  // Şəkil optimizasiyası
  optimizeImage: async (req, res) => {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          error: 'Public ID tələb olunur'
        });
      }

      // Müxtəlif ölçülər üçün optimizasiya edilmiş URL-lər
      const sizes = {
        thumbnail: cloudinary.url(publicId, {
          transformation: [
            { width: 150, height: 150, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }),
        small: cloudinary.url(publicId, {
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }),
        medium: cloudinary.url(publicId, {
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }),
        large: cloudinary.url(publicId, {
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        }),
        original: cloudinary.url(publicId, {
          transformation: [
            { quality: 'auto:best' },
            { fetch_format: 'auto' }
          ]
        })
      };

      res.json({
        success: true,
        publicId: publicId,
        sizes: sizes
      });

    } catch (error) {
      console.error('❌ Optimize image error:', error);
      res.status(500).json({
        success: false,
        error: 'Şəkil optimizasiyası xətası: ' + error.message
      });
    }
  },

  // Bulk delete
  bulkDeleteImages: async (req, res) => {
    try {
      const { publicIds } = req.body;

      if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Public ID array tələb olunur'
        });
      }

      const results = [];
      const errors = [];

      for (const publicId of publicIds) {
        try {
          const result = await cloudinary.uploader.destroy(publicId);
          
          if (result.result === 'ok') {
            results.push({
              publicId: publicId,
              success: true,
              status: 'deleted'
            });
          } else {
            results.push({
              publicId: publicId,
              success: false,
              status: 'not_found'
            });
          }

        } catch (deleteError) {
          console.error('❌ Single delete error:', deleteError);
          errors.push({
            publicId: publicId,
            error: deleteError.message
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success).length + errors.length;

      res.json({
        success: failed === 0,
        results: results,
        errors: errors,
        summary: {
          total: publicIds.length,
          successful: successful.length,
          failed: failed,
          successRate: Math.round((successful.length / publicIds.length) * 100)
        }
      });

    } catch (error) {
      console.error('❌ Bulk delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk silmə xətası: ' + error.message
      });
    }
  },

  // Upload progress tracking (WebSocket üçün)
  getUploadProgress: async (req, res) => {
    try {
      const { uploadId } = req.params;
      
      // Redis və ya database-dən progress məlumatı əldə et
      // Bu nümunə üçün sadə response
      res.json({
        success: true,
        uploadId: uploadId,
        progress: 100, // Mock data
        status: 'completed',
        message: 'Upload tamamlandı'
      });

    } catch (error) {
      console.error('❌ Get upload progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Progress məlumatı əldə edilərkən xəta: ' + error.message
      });
    }
  },

  // Health check
  healthCheck: async (req, res) => {
    try {
      // Cloudinary bağlantısını yoxla
      const pingResult = await cloudinary.api.ping();
      
      res.json({
        success: true,
        service: 'Upload Service',
        status: 'healthy',
        cloudinary: pingResult.status === 'ok' ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(500).json({
        success: false,
        service: 'Upload Service',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

module.exports = uploadController;