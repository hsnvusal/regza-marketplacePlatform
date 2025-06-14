const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Məhsul üçün review yarat
// @route   POST /api/reviews
// @access  Private
const createReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.error(res, 'Məlumat doğrulaması uğursuz', 400, errors.array());
  }

  const {
    productId,
    title,
    comment,
    ratings,
    images,
    isRecommended,
    pros,
    cons,
    orderId
  } = req.body;

  try {
    // 1. Məhsulun mövcudluğunu yoxla
    const product = await Product.findById(productId);
    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // 2. İstifadəçinin artıq review yazıb-yazmadığını yoxla
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });

    if (existingReview) {
      return ApiResponse.error(res, 'Bu məhsul üçün artıq review yazmısınız', 400);
    }

    // 3. Verified purchase yoxlanışı
    let verifiedPurchase = false;
    let orderItem = null;

    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        customer: req.user.id,
        status: { $in: ['delivered', 'completed'] }
      });

      if (order) {
        // Sifarişdə bu məhsulun olub-olmadığını yoxla
        const hasProduct = order.vendorOrders.some(vendorOrder =>
          vendorOrder.items.some(item => item.product.toString() === productId)
        );

        if (hasProduct) {
          verifiedPurchase = true;
          orderItem = orderId;
        }
      }
    }

    // 4. Review məlumatlarını hazırla
    const reviewData = {
      product: productId,
      user: req.user.id,
      vendor: product.vendor,
      title: title.trim(),
      comment: comment.trim(),
      ratings: {
        overall: ratings.overall,
        quality: ratings.quality || ratings.overall,
        value: ratings.value || ratings.overall,
        delivery: ratings.delivery || ratings.overall
      },
      images: images || [],
      verifiedPurchase,
      orderItem,
      isRecommended: isRecommended !== undefined ? isRecommended : null,
      pros: pros || [],
      cons: cons || [],
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop'
      }
    };

    // 5. Review yarat
    const review = await Review.create(reviewData);

    // 6. Populate məlumatları
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'firstName lastName avatar')
      .populate('product', 'name sku images pricing')
      .populate('vendor', 'firstName lastName businessName');

    console.log(`✅ Yeni review yaradıldı: ${product.name} - ${req.user.email} - ${ratings.overall}/5`);

    // 7. Email notification (vendor-ə)
    try {
      const emailService = require('../utils/emailService');
      // TODO: Review notification email template yaradılacaq
      console.log(`📧 Review notification email göndəriləcək: ${product.vendor.email}`);
    } catch (emailError) {
      console.error('📧 Review email xətası:', emailError.message);
    }

    ApiResponse.success(res, {
      review: populatedReview
    }, 'Review uğurla yaradıldı', 201);

  } catch (error) {
    console.error('Review yaratma xətası:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat doğrulaması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Review yaradılarkən xəta baş verdi', 500);
  }
});

// @desc    Məhsul reviewlərini al
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'newest';
  const rating = req.query.rating ? parseInt(req.query.rating) : null;
  const verifiedOnly = req.query.verifiedOnly === 'true';

  try {
    // Məhsulun mövcudluğunu yoxla
    const product = await Product.findById(productId);
    if (!product) {
      return ApiResponse.error(res, 'Məhsul tapılmadı', 404);
    }

    // Reviews al
    const reviews = await Review.getProductReviews(productId, {
      page,
      limit,
      sortBy,
      rating,
      verifiedOnly
    });

    // Total count
    const totalFilter = {
      product: productId,
      status: 'approved'
    };
    
    if (rating) totalFilter['ratings.overall'] = rating;
    if (verifiedOnly) totalFilter.verifiedPurchase = true;
    
    const total = await Review.countDocuments(totalFilter);

    // Review statistikaları
    const stats = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$ratings.overall' },
          totalReviews: { $sum: 1 },
          verifiedReviews: {
            $sum: { $cond: ['$verifiedPurchase', 1, 0] }
          },
          recommendedCount: {
            $sum: { $cond: [{ $eq: ['$isRecommended', true] }, 1, 0] }
          },
          ratingDistribution: {
            $push: '$ratings.overall'
          }
        }
      }
    ]);

    let reviewStats = {
      avgRating: 0,
      totalReviews: 0,
      verifiedReviews: 0,
      recommendationRate: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    if (stats.length > 0) {
      const stat = stats[0];
      reviewStats.avgRating = Math.round(stat.avgRating * 10) / 10;
      reviewStats.totalReviews = stat.totalReviews;
      reviewStats.verifiedReviews = stat.verifiedReviews;
      
      if (stat.totalReviews > 0) {
        reviewStats.recommendationRate = Math.round((stat.recommendedCount / stat.totalReviews) * 100);
      }

      // Rating distribution
      stat.ratingDistribution.forEach(rating => {
        reviewStats.ratingDistribution[rating]++;
      });
    }

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    ApiResponse.paginated(res, reviews, pagination, 'Məhsul reviewləri alındı', {
      stats: reviewStats,
      filters: {
        sortBy,
        rating,
        verifiedOnly
      }
    });

  } catch (error) {
    console.error('Product reviews alma xətası:', error);
    return ApiResponse.error(res, 'Reviewlər alınarkən xəta baş verdi', 500);
  }
});

// @desc    Review detayı al
// @route   GET /api/reviews/:id
// @access  Public
const getReview = asyncHandler(async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'firstName lastName avatar')
      .populate('product', 'name sku images pricing')
      .populate('vendor', 'firstName lastName businessName')
      .populate('vendorResponse.respondedBy', 'firstName lastName businessName')
      .populate('helpfulVotes.voters.user', 'firstName lastName');

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    if (review.status !== 'approved') {
      return ApiResponse.error(res, 'Review hələ təsdiqlənməyib', 403);
    }

    ApiResponse.success(res, { review }, 'Review detayı alındı');

  } catch (error) {
    console.error('Review detay xətası:', error);
    
    if (error.kind === 'ObjectId') {
      return ApiResponse.error(res, 'Yanlış review ID formatı', 400);
    }
    
    return ApiResponse.error(res, 'Review detayı alınarkən xəta baş verdi', 500);
  }
});

// @desc    İstifadəçinin reviewlərini al
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name sku images pricing')
      .populate('vendor', 'firstName lastName businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ user: req.user.id });

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    ApiResponse.paginated(res, reviews, pagination, 'Sizin reviewləriniz alındı');

  } catch (error) {
    console.error('İstifadəçi reviewləri xətası:', error);
    return ApiResponse.error(res, 'Reviewlər alınarkən xəta baş verdi', 500);
  }
});

// @desc    Review-ə helpful/not helpful vote ver
// @route   POST /api/reviews/:id/vote
// @access  Private
const voteReview = asyncHandler(async (req, res) => {
  const { voteType } = req.body;

  if (!['helpful', 'not_helpful'].includes(voteType)) {
    return ApiResponse.error(res, 'Vote tipi helpful və ya not_helpful ola bilər', 400);
  }

  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    if (review.status !== 'approved') {
      return ApiResponse.error(res, 'Review hələ təsdiqlənməyib', 403);
    }

    // Öz review-una vote verə bilməz
    if (review.user.toString() === req.user.id) {
      return ApiResponse.error(res, 'Öz review-unuza vote verə bilməzsiniz', 400);
    }

    await review.voteHelpful(req.user.id, voteType);

    console.log(`✅ Review vote: ${review._id} - ${voteType} - ${req.user.email}`);

    ApiResponse.success(res, {
      review: {
        id: review._id,
        helpfulVotes: review.helpfulVotes,
        helpfulRatio: review.helpfulRatio
      }
    }, 'Vote uğurla verildi');

  } catch (error) {
    console.error('Review vote xətası:', error);
    return ApiResponse.error(res, 'Vote verilərkən xəta baş verdi', 500);
  }
});

// @desc    Review-ı yenilə (yalnız öz review-u)
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = asyncHandler(async (req, res) => {
  const { title, comment, ratings, isRecommended, pros, cons } = req.body;

  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    // Yalnız öz review-unu yeniləyə bilər
    if (review.user.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu review-ı yeniləmək icazəniz yoxdur', 403);
    }

    // 24 saatdan çox olmuş review-ları yeniləmək olmaz
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (review.createdAt < oneDayAgo) {
      return ApiResponse.error(res, 'Review yaradılıb 24 saatdan çox vaxt keçib, yeniləmək olmaz', 400);
    }

    // Yenilənəcək sahələr
    const updateFields = {};
    if (title) updateFields.title = title.trim();
    if (comment) updateFields.comment = comment.trim();
    if (ratings) {
      updateFields.ratings = {
        overall: ratings.overall,
        quality: ratings.quality || ratings.overall,
        value: ratings.value || ratings.overall,
        delivery: ratings.delivery || ratings.overall
      };
    }
    if (isRecommended !== undefined) updateFields.isRecommended = isRecommended;
    if (pros) updateFields.pros = pros;
    if (cons) updateFields.cons = cons;

    // Status-u pending et (yenidən moderation lazım)
    updateFields.status = 'pending';

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName avatar')
     .populate('product', 'name sku images pricing');

    console.log(`✅ Review yeniləndi: ${updatedReview._id} - ${req.user.email}`);

    ApiResponse.success(res, { review: updatedReview }, 'Review uğurla yeniləndi');

  } catch (error) {
    console.error('Review yeniləmə xətası:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return ApiResponse.error(res, 'Məlumat doğrulaması uğursuz', 400, messages);
    }
    
    return ApiResponse.error(res, 'Review yenilənərkən xəta baş verdi', 500);
  }
});

// @desc    Review-ı sil (yalnız öz review-u)
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    // Yalnız öz review-unu silə bilər
    if (review.user.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu review-ı silmək icazəniz yoxdur', 403);
    }

    await Review.findByIdAndDelete(req.params.id);

    console.log(`✅ Review silindi: ${req.params.id} - ${req.user.email}`);

    ApiResponse.success(res, {
      message: 'Review uğurla silindi'
    }, 'Review uğurla silindi');

  } catch (error) {
    console.error('Review silmə xətası:', error);
    return ApiResponse.error(res, 'Review silinərkən xəta baş verdi', 500);
  }
});

// @desc    Vendor cavabı əlavə et
// @route   POST /api/reviews/:id/vendor-response
// @access  Private (Vendor)
const addVendorResponse = asyncHandler(async (req, res) => {
  const { response } = req.body;

  if (!response || response.trim().length < 10) {
    return ApiResponse.error(res, 'Vendor cavabı ən azı 10 simvol olmalıdır', 400);
  }

  try {
    const review = await Review.findById(req.params.id)
      .populate('product', 'vendor');

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    if (review.status !== 'approved') {
      return ApiResponse.error(res, 'Review hələ təsdiqlənməyib', 403);
    }

    // Yalnız review-un vendor-i cavab verə bilər
    if (review.product.vendor.toString() !== req.user.id) {
      return ApiResponse.error(res, 'Bu review-a cavab vermək icazəniz yoxdur', 403);
    }

    await review.addVendorResponse(response.trim(), req.user.id);

    console.log(`✅ Vendor cavabı əlavə edildi: ${review._id} - ${req.user.email}`);

    ApiResponse.success(res, {
      review: {
        id: review._id,
        vendorResponse: review.vendorResponse
      }
    }, 'Vendor cavabı uğurla əlavə edildi');

  } catch (error) {
    console.error('Vendor response xətası:', error);
    return ApiResponse.error(res, 'Vendor cavabı əlavə edilərkən xəta baş verdi', 500);
  }
});

// @desc    Review-ı report et (spam, inappropriate və s.)
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const validReasons = ['spam', 'inappropriate', 'fake', 'offensive', 'other'];
  if (!validReasons.includes(reason)) {
    return ApiResponse.error(res, 'Düzgün report səbəbi seçin', 400);
  }

  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    // Öz review-unu report edə bilməz
    if (review.user.toString() === req.user.id) {
      return ApiResponse.error(res, 'Öz review-unuzu report edə bilməzsiniz', 400);
    }

    // Artıq report etmişmi yoxla
    const alreadyReported = review.reportedBy.find(
      report => report.user.toString() === req.user.id
    );

    if (alreadyReported) {
      return ApiResponse.error(res, 'Bu review-ı artıq report etmisiniz', 400);
    }

    review.reportedBy.push({
      user: req.user.id,
      reason,
      reportedAt: new Date()
    });

    // 3-dən çox report olarsa, auto-hide et
    if (review.reportedBy.length >= 3) {
      review.status = 'hidden';
      review.moderation.moderationNote = 'Auto-hidden due to multiple reports';
      review.moderation.autoModerated = true;
    }

    await review.save();

    console.log(`✅ Review report edildi: ${review._id} - ${reason} - ${req.user.email}`);

    ApiResponse.success(res, {
      message: 'Review uğurla report edildi'
    }, 'Review report edildi');

  } catch (error) {
    console.error('Review report xətası:', error);
    return ApiResponse.error(res, 'Review report edilərkən xəta baş verdi', 500);
  }
});

// @desc    Vendor reviewlərini al
// @route   GET /api/reviews/vendor/my-reviews
// @access  Private (Vendor)
const getVendorReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status || 'approved';

  try {
    const reviews = await Review.find({ 
      vendor: req.user.id,
      status: status
    })
      .populate('user', 'firstName lastName avatar')
      .populate('product', 'name sku images pricing')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ 
      vendor: req.user.id,
      status: status
    });

    // Vendor review statistikaları
    const stats = await Review.aggregate([
      {
        $match: {
          vendor: new mongoose.Types.ObjectId(req.user.id),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$ratings.overall' },
          totalReviews: { $sum: 1 },
          responseRate: {
            $avg: {
              $cond: [
                { $ne: ['$vendorResponse.response', null] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const vendorStats = stats.length > 0 ? {
      avgRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
      responseRate: Math.round(stats[0].responseRate * 100)
    } : {
      avgRating: 0,
      totalReviews: 0,
      responseRate: 0
    };

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    ApiResponse.paginated(res, reviews, pagination, 'Vendor reviewləri alındı', {
      stats: vendorStats
    });

  } catch (error) {
    console.error('Vendor reviews xətası:', error);
    return ApiResponse.error(res, 'Vendor reviewləri alınarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - bütün reviewlər
// @route   GET /api/reviews/admin/all
// @access  Private (Admin)
const getAllReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status || 'all';

  try {
    let filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const reviews = await Review.find(filter)
      .populate('user', 'firstName lastName email avatar')
      .populate('product', 'name sku images')
      .populate('vendor', 'firstName lastName businessName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(filter);

    // Admin statistikaları
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$ratings.overall' }
        }
      }
    ]);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    ApiResponse.paginated(res, reviews, pagination, 'Bütün reviewlər alındı', {
      stats,
      summary: {
        totalReviews: total
      }
    });

  } catch (error) {
    console.error('Admin reviews xətası:', error);
    return ApiResponse.error(res, 'Reviewlər alınarkən xəta baş verdi', 500);
  }
});

// @desc    Admin - review statusunu dəyiş
// @route   PUT /api/reviews/:id/moderate
// @access  Private (Admin)
const moderateReview = asyncHandler(async (req, res) => {
  const { status, moderationNote } = req.body;

  const validStatuses = ['approved', 'rejected', 'hidden'];
  if (!validStatuses.includes(status)) {
    return ApiResponse.error(res, 'Status approved, rejected və ya hidden ola bilər', 400);
  }

  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return ApiResponse.error(res, 'Review tapılmadı', 404);
    }

    review.status = status;
    review.moderation = {
      moderatedBy: req.user.id,
      moderatedAt: new Date(),
      moderationNote: moderationNote || '',
      autoModerated: false
    };

    await review.save();

    console.log(`✅ Review moderation: ${review._id} - ${status} - Admin: ${req.user.email}`);

    ApiResponse.success(res, {
      review: {
        id: review._id,
        status: review.status,
        moderation: review.moderation
      }
    }, 'Review moderation tamamlandı');

  } catch (error) {
    console.error('Review moderation xətası:', error);
    return ApiResponse.error(res, 'Review moderation edilərkən xəta baş verdi', 500);
  }
});

module.exports = {
  createReview,
  getProductReviews,
  getReview,
  getMyReviews,
  voteReview,
  updateReview,
  deleteReview,
  addVendorResponse,
  reportReview,
  getVendorReviews,
  getAllReviews,
  moderateReview
};