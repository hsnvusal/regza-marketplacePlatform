// routes/uploadRoutes.js - Backend upload routes
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Middleware - Bütün upload route-ları üçün auth tələb et
router.use(authMiddleware);

// 📤 Tək şəkil yükləmə
router.post('/image', uploadController.uploadImage);

// 📤 Çoxlu şəkil yükləmə
router.post('/images', uploadController.uploadMultipleImages);

// 🗑️ Şəkil silmə
router.delete('/image', uploadController.deleteImage);

// 📊 Şəkil məlumatları
router.get('/image/:publicId', uploadController.getImageInfo);

// 📁 Folder şəkilləri
router.get('/folder/:folder', uploadController.getImagesByFolder);

// 🔄 Şəkil transformasiyası
router.get('/transform/:publicId', uploadController.transformImage);

// ⚡ Şəkil optimizasiyası
router.get('/optimize/:publicId', uploadController.optimizeImage);

// 🗑️ Bulk şəkil silmə (Admin only)
router.delete('/bulk', adminMiddleware, uploadController.bulkDeleteImages);

// 📈 Upload progress
router.get('/progress/:uploadId', uploadController.getUploadProgress);

// ❤️ Health check
router.get('/health', uploadController.healthCheck);

module.exports = router;

// routes/index.js - Ana route faylına əlavə et
/*
const uploadRoutes = require('./uploadRoutes');

// Upload routes
app.use('/api/upload', uploadRoutes);
*/