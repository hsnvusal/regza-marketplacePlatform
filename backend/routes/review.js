const express = require('express');
const { body, param, query } = require('express-validator');
const {
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
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createReviewValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Düzgün məhsul ID daxil edin'),
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Başlıq 5-100 simvol arası olmalıdır'),
  
  body('comment')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Şərh 10-2000 simvol arası olmalıdır'),
  
  body('ratings.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Ümumi reytinq 1-5 arası olmalıdır'),
  
  body('ratings.quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Keyfiyyət reytinqi 1-5 arası olmalıdır'),
  
  body('ratings.value')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Dəyər reytinqi 1-5 arası olmalıdır'),
  
  body('ratings.delivery')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Çatdırılma reytinqi 1-5 arası olmalıdır'),
  
  body('isRecommended')
    .optional()
    .isBoolean()
    .withMessage('Tövsiyə sahəsi boolean olmalıdır'),
  
  body('pros')
    .optional()
    .isArray()
    .withMessage('Müsbət cəhətlər array formatında olmalıdır'),
  
  body('cons')
    .optional()
    .isArray()
    .withMessage('Mənfi cəhətlər array formatında olmalıdır'),
  
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('Düzgün sifariş ID daxil edin')
];

const updateReviewValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Başlıq 5-100 simvol arası olmalıdır'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Şərh 10-2000 simvol arası olmalıdır'),
  
  body('ratings.overall')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Ümumi reytinq 1-5 arası olmalıdır')
];

const voteValidation = [
  body('voteType')
    .isIn(['helpful', 'not_helpful'])
    .withMessage('Vote tipi helpful və ya not_helpful ola bilər')
];

const vendorResponseValidation = [
  body('response')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Vendor cavabı 10-1000 simvol arası olmalıdır')
];

const reportValidation = [
  body('reason')
    .isIn(['spam', 'inappropriate', 'fake', 'offensive', 'other'])
    .withMessage('Düzgün report səbəbi seçin')
];

const moderationValidation = [
  body('status')
    .isIn(['approved', 'rejected', 'hidden'])
    .withMessage('Status approved, rejected və ya hidden ola bilər'),
  
  body('moderationNote')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation qeydi 500 simvoldan çox ola bilməz')
];

const reviewQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Səhifə nömrəsi müsbət tam rəqəm olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit 1-50 arası olmalıdır'),
  
  query('sortBy')
    .optional()
    .isIn(['newest', 'oldest', 'highest_rating', 'lowest_rating', 'most_helpful'])
    .withMessage('Düzgün sıralama seçin'),
  
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Reytinq filtri 1-5 arası olmalıdır'),
  
  query('verifiedOnly')
    .optional()
    .isBoolean()
    .withMessage('VerifiedOnly boolean olmalıdır')
];

const reviewIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Düzgün review ID formatı daxil edin')
];

const productIdValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Düzgün məhsul ID formatı daxil edin')
];

// ===========================================
// PUBLIC ROUTES - Authentication tələb olunmur
// ===========================================

// @route   GET /api/reviews/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Public
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Reviews API Routes Documentation',
      routes: {
        public: {
          'GET /api/reviews/product/:productId': 'Məhsul reviewlərini al',
          'GET /api/reviews/:id': 'Review detayı',
          'GET /api/reviews/info/routes': 'Route siyahısı (dev only)'
        },
        customer: {
          'POST /api/reviews': 'Review yarat',
          'GET /api/reviews/my-reviews': 'Öz reviewlərini al',
          'PUT /api/reviews/:id': 'Review yenilə (24 saat ərzində)',
          'DELETE /api/reviews/:id': 'Review sil',
          'POST /api/reviews/:id/vote': 'Helpful/Not helpful vote ver',
          'POST /api/reviews/:id/report': 'Review-ı report et'
        },
        vendor: {
          'GET /api/reviews/vendor/my-reviews': 'Vendor reviewlərini al',
          'POST /api/reviews/:id/vendor-response': 'Review-a cavab ver'
        },
        admin: {
          'GET /api/reviews/admin/all': 'Bütün reviewlər (admin)',
          'PUT /api/reviews/:id/moderate': 'Review moderation',
          'note': 'Admin bütün customer/vendor əməliyyatlarını da görə bilər'
        }
      },
      authentication: {
        header: 'Authorization: Bearer TOKEN_HERE',
        note: 'Protected route-lar authentication tələb edir',
        roles: {
          customer: 'Review yaza, vote verə, report edə bilər',
          vendor: 'Customer işlərinə əlavə olaraq vendor cavabı verə bilər',
          admin: 'Bütün əməliyyatları + moderation edə bilər'
        }
      },
      ratingSystem: {
        overall: '1-5 ulduz (tələb olunur)',
        quality: '1-5 ulduz (ixtiyari)',
        value: '1-5 ulduz (ixtiyari)', 
        delivery: '1-5 ulduz (ixtiyari)',
        note: 'İxtiyari reytinqlər verilməzsə overall ilə eyni olur'
      },
      reviewStatuses: {
        pending: 'Gözləyir (moderation)',
        approved: 'Təsdiqləndi və görünür',
        rejected: 'Rədd edildi',
        hidden: 'Gizlədildi (spam/report səbəbi ilə)'
      },
      validation: {
        createReview: {
          required: [
            'productId (MongoDB ObjectId)',
            'title (5-100 simvol)',
            'comment (10-2000 simvol)',
            'ratings.overall (1-5)'
          ],
          optional: [
            'ratings.quality/value/delivery (1-5)',
            'isRecommended (boolean)',
            'pros/cons (array of strings)',
            'orderId (verified purchase üçün)',
            'images (array of image objects)'
          ]
        },
        voteReview: {
          required: ['voteType'],
          values: ['helpful', 'not_helpful'],
          restrictions: [
            'Öz review-una vote verə bilməzsiniz',
            'Bir review-a yalnız bir dəfə vote verə bilərsiniz (dəyişə bilərsiniz)'
          ]
        },
        vendorResponse: {
          required: ['response (10-1000 simvol)'],
          restrictions: [
            'Yalnız öz məhsulunuzun review-una cavab verə bilərsiniz',
            'Bir review-a yalnız bir cavab verə bilərsiniz'
          ]
        },
        reportReview: {
          required: ['reason'],
          values: ['spam', 'inappropriate', 'fake', 'offensive', 'other'],
          restrictions: [
            'Öz review-unuzu report edə bilməzsiniz',
            '3+ report olarsa review auto-hide olur'
          ]
        }
      },
      queryParameters: {
        productReviews: {
          page: 'Səhifə nömrəsi (default: 1)',
          limit: 'Səhifə başına review sayı (default: 10, max: 50)',
          sortBy: 'newest|oldest|highest_rating|lowest_rating|most_helpful (default: newest)',
          rating: '1-5 (reytinqə görə filtrlə)',
          verifiedOnly: 'true (yalnız verified purchase reviewlər)'
        },
        vendorReviews: {
          'all_product_filters': 'Yuxarıdakı bütün filtrlər istifadə edilə bilər',
          status: 'pending|approved|rejected|hidden (default: approved)'
        },
        adminReviews: {
          'all_filters': 'Bütün filtrlər + status filtri',
          status: 'all|pending|approved|rejected|hidden (default: all)'
        }
      },
      businessRules: {
        reviewCreation: [
          'Hər istifadəçi bir məhsula yalnız bir review yaza bilər',
          'Verified purchase (orderId ilə) review-ları daha yüksək prioritetə malikdir',
          'Auto-moderation spam məzmunu yoxlayır',
          'Spam yoxdursa auto-approve olur'
        ],
        reviewModification: [
          'Review yalnız 24 saat ərzində yenilənə bilər',
          'Yalnız öz review-unu yeniləyə bilər',
          'Yenilənən review yenidən moderation-a gedir (pending status)',
          'Reytinq dəyişikliyi məhsulun ümumi reytinqini yeniləyir'
        ],
        reviewDeletion: [
          'Yalnız öz review-unu silə bilər',
          'Silindikdə məhsulun reytinqi yenilənir',
          'Admin istənilən review-ı silə bilər'
        ],
        helpfulVotes: [
          'Bir istifadəçi bir review-a yalnız bir vote verə bilər',
          'Vote-u dəyişə bilər (helpful -> not_helpful və ya əksi)',
          'Öz review-una vote verə bilməz'
        ],
        vendorResponse: [
          'Yalnız öz məhsulunun review-una cavab verə bilər',
          'Bir review-a yalnız bir cavab verə bilər',
          'Cavab 10-1000 simvol arası olmalıdır'
        ]
      },
      examples: {
        createReview: {
          url: 'POST /api/reviews',
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json'
          },
          body: {
            productId: '675a1234567890abcdef1234',
            title: 'Çox yaxşı məhsul, tövsiyə edirəm',
            comment: 'Bu məhsulu 2 həftədir istifadə edirəm. Keyfiyyəti həqiqətən yaxşıdır, gözləntilərimi doğrultdu. Çatdırılma da çox sürətli idi.',
            ratings: {
              overall: 5,
              quality: 5,
              value: 4,
              delivery: 5
            },
            isRecommended: true,
            pros: ['Yüksək keyfiyyət', 'Sürətli çatdırılma', 'Gözəl dizayn'],
            cons: ['Qiymət bir az baha ola bilərdi'],
            orderId: '675a1234567890abcdef5678'
          }
        },
        voteReview: {
          url: 'POST /api/reviews/:reviewId/vote',
          body: {
            voteType: 'helpful'
          }
        },
        vendorResponse: {
          url: 'POST /api/reviews/:reviewId/vendor-response',
          body: {
            response: 'Təşəkkür edirik gözəl review üçün! Sizin məmnuniyyətiniz bizim üçün ən vacib məsələdir. Gələcəkdə də keyfiyyətli xidmət göstərməyə davam edəcəyik.'
          }
        },
        reportReview: {
          url: 'POST /api/reviews/:reviewId/report',
          body: {
            reason: 'spam'
          }
        }
      },
      responseFormat: {
        success: {
          success: true,
          message: 'Success message',
          data: 'Response data object',
          pagination: 'Pagination info (for paginated responses)'
        },
        error: {
          success: false,
          message: 'Error message',
          errors: 'Validation errors array (if applicable)'
        }
      },
      webhooks: {
        note: 'Review sistemində webhook event-ləri',
        events: [
          'review.created - Yeni review yaradılanda',
          'review.approved - Review təsdiqlənəndə',
          'review.vendor_responded - Vendor cavab verəndə',
          'review.reported - Review report ediləndə'
        ]
      }
    });
  });
}

// @route   GET /api/reviews/product/:productId
// @desc    Məhsul reviewlərini al
// @access  Public
router.get('/product/:productId', 
  [productIdValidation, reviewQueryValidation], 
  getProductReviews
);

// @route   GET /api/reviews/:id
// @desc    Review detayı
// @access  Public
router.get('/:id', reviewIdValidation, getReview);

// ===========================================
// PROTECTED ROUTES - Authentication tələb olunur
// ===========================================

// Bundan sonrakı bütün route-lar authentication tələb edir
router.use(protect);

// @route   POST /api/reviews
// @desc    Review yarat
// @access  Private
router.post('/', createReviewValidation, createReview);

// @route   GET /api/reviews/my-reviews
// @desc    İstifadəçinin reviewlərini al
// @access  Private
router.get('/my-reviews', reviewQueryValidation, getMyReviews);

// @route   PUT /api/reviews/:id
// @desc    Review yenilə (yalnız öz review-u)
// @access  Private
router.put('/:id', 
  [reviewIdValidation, ...updateReviewValidation], 
  updateReview
);

// @route   DELETE /api/reviews/:id
// @desc    Review sil (yalnız öz review-u)
// @access  Private
router.delete('/:id', reviewIdValidation, deleteReview);

// @route   POST /api/reviews/:id/vote
// @desc    Review-ə helpful/not helpful vote ver
// @access  Private
router.post('/:id/vote', 
  [reviewIdValidation, ...voteValidation], 
  voteReview
);

// @route   POST /api/reviews/:id/report
// @desc    Review-ı report et
// @access  Private
router.post('/:id/report', 
  [reviewIdValidation, ...reportValidation], 
  reportReview
);

// ===========================================
// VENDOR ROUTES
// ===========================================

// @route   GET /api/reviews/vendor/my-reviews
// @desc    Vendor reviewlərini al
// @access  Private (Vendor)
router.get('/vendor/my-reviews', 
  authorize('vendor', 'admin'), 
  reviewQueryValidation, 
  getVendorReviews
);

// @route   POST /api/reviews/:id/vendor-response
// @desc    Vendor cavabı əlavə et
// @access  Private (Vendor)
router.post('/:id/vendor-response', 
  authorize('vendor', 'admin'),
  [reviewIdValidation, ...vendorResponseValidation], 
  addVendorResponse
);

// ===========================================
// ADMIN ROUTES
// ===========================================

// @route   GET /api/reviews/admin/all
// @desc    Admin - bütün reviewlər
// @access  Private (Admin)
router.get('/admin/all', 
  authorize('admin'), 
  reviewQueryValidation, 
  getAllReviews
);

// @route   PUT /api/reviews/:id/moderate
// @desc    Admin - review moderation
// @access  Private (Admin)
router.put('/:id/moderate', 
  authorize('admin'),
  [reviewIdValidation, ...moderationValidation], 
  moderateReview
);

// ===========================================
// ROUTE INFO - Development üçün
// ===========================================

// @route   GET /api/reviews/info/routes
// @desc    Mövcud route-ları göstər (development üçün)
// @access  Public
if (process.env.NODE_ENV === 'development') {
  router.get('/info/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Reviews API Routes Documentation',
      routes: {
        public: {
          'GET /api/reviews/product/:productId': 'Məhsul reviewlərini al',
          'GET /api/reviews/:id': 'Review detayı',
          'GET /api/reviews/info/routes': 'Route siyahısı (dev only)'
        },
        customer: {
          'POST /api/reviews': 'Review yarat',
          'GET /api/reviews/my-reviews': 'Öz reviewlərini al',
          'PUT /api/reviews/:id': 'Review yenilə (24 saat ərzində)',
          'DELETE /api/reviews/:id': 'Review sil',
          'POST /api/reviews/:id/vote': 'Helpful/Not helpful vote ver',
          'POST /api/reviews/:id/report': 'Review-ı report et'
        },
        vendor: {
          'GET /api/reviews/vendor/my-reviews': 'Vendor reviewlərini al',
          'POST /api/reviews/:id/vendor-response': 'Review-a cavab ver'
        },
        admin: {
          'GET /api/reviews/admin/all': 'Bütün reviewlər (admin)',
          'PUT /api/reviews/:id/moderate': 'Review moderation',
          'note': 'Admin bütün customer/vendor əməliyyatlarını da görə bilər'
        }
      },
      authentication: {
        header: 'Authorization: Bearer TOKEN_HERE',
        note: 'Protected route-lar authentication tələb edir',
        roles: {
          customer: 'Review yaza, vote verə, report edə bilər',
          vendor: 'Customer işlərinə əlavə olaraq vendor cavabı verə bilər',
          admin: 'Bütün əməliyyatları + moderation edə bilər'
        }
      },
      ratingSystem: {
        overall: '1-5 ulduz (tələb olunur)',
        quality: '1-5 ulduz (ixtiyari)',
        value: '1-5 ulduz (ixtiyari)', 
        delivery: '1-5 ulduz (ixtiyari)',
        note: 'İxtiyari reytinqlər verilməzsə overall ilə eyni olur'
      },
      reviewStatuses: {
        pending: 'Gözləyir (moderation)',
        approved: 'Təsdiqləndi və görünür',
        rejected: 'Rədd edildi',
        hidden: 'Gizlədildi (spam/report səbəbi ilə)'
      },
      validation: {
        createReview: {
          required: [
            'productId (MongoDB ObjectId)',
            'title (5-100 simvol)',
            'comment (10-2000 simvol)',
            'ratings.overall (1-5)'
          ],
          optional: [
            'ratings.quality/value/delivery (1-5)',
            'isRecommended (boolean)',
            'pros/cons (array of strings)',
            'orderId (verified purchase üçün)',
            'images (array of image objects)'
          ]
        },
        voteReview: {
          required: ['voteType'],
          values: ['helpful', 'not_helpful'],
          restrictions: [
            'Öz review-una vote verə bilməzsiniz',
            'Bir review-a yalnız bir dəfə vote verə bilərsiniz (dəyişə bilərsiniz)'
          ]
        },
        vendorResponse: {
          required: ['response (10-1000 simvol)'],
          restrictions: [
            'Yalnız öz məhsulunuzun review-una cavab verə bilərsiniz',
            'Bir review-a yalnız bir cavab verə bilərsiniz'
          ]
        },
        reportReview: {
          required: ['reason'],
          values: ['spam', 'inappropriate', 'fake', 'offensive', 'other'],
          restrictions: [
            'Öz review-unuzu report edə bilməzsiniz',
            '3+ report olarsa review auto-hide olur'
          ]
        }
      },
      queryParameters: {
        productReviews: {
          page: 'Səhifə nömrəsi (default: 1)',
          limit: 'Səhifə başına review sayı (default: 10, max: 50)',
          sortBy: 'newest|oldest|highest_rating|lowest_rating|most_helpful (default: newest)',
          rating: '1-5 (reytinqə görə filtrlə)',
          verifiedOnly: 'true (yalnız verified purchase reviewlər)'
        },
        vendorReviews: {
          'all_product_filters': 'Yuxarıdakı bütün filtrlər istifadə edilə bilər',
          status: 'pending|approved|rejected|hidden (default: approved)'
        },
        adminReviews: {
          'all_filters': 'Bütün filtrlər + status filtri',
          status: 'all|pending|approved|rejected|hidden (default: all)'
        }
      },
      businessRules: {
        reviewCreation: [
          'Hər istifadəçi bir məhsula yalnız bir review yaza bilər',
          'Verified purchase (orderId ilə) review-ları daha yüksək prioritetə malikdir',
          'Auto-moderation spam məzmunu yoxlayır',
          'Spam yoxdursa auto-approve olur'
        ],
        reviewModification: [
          'Review yalnız 24 saat ərzində yenilənə bilər',
          'Yalnız öz review-unu yeniləyə bilər',
          'Yenilənən review yenidən moderation-a gedir (pending status)',
          'Reytinq dəyişikliyi məhsulun ümumi reytinqini yeniləyir'
        ],
        reviewDeletion: [
          'Yalnız öz review-unu silə bilər',
          'Silindikdə məhsulun reytinqi yenilənir',
          'Admin istənilən review-ı silə bilər'
        ],
        helpfulVotes: [
          'Bir istifadəçi bir review-a yalnız bir vote verə bilər',
          'Vote-u dəyişə bilər (helpful -> not_helpful və ya əksi)',
          'Öz review-una vote verə bilməz'
        ],
        vendorResponse: [
          'Yalnız öz məhsulunun review-una cavab verə bilər',
          'Bir review-a yalnız bir cavab verə bilər',
          'Cavab 10-1000 simvol arası olmalıdır'
        ]
      },
      examples: {
        createReview: {
          url: 'POST /api/reviews',
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json'
          },
          body: {
            productId: '675a1234567890abcdef1234',
            title: 'Çox yaxşı məhsul, tövsiyə edirəm',
            comment: 'Bu məhsulu 2 həftədir istifadə edirəm. Keyfiyyəti həqiqətən yaxşıdır, gözləntilərimi doğrultdu. Çatdırılma da çox sürətli idi.',
            ratings: {
              overall: 5,
              quality: 5,
              value: 4,
              delivery: 5
            },
            isRecommended: true,
            pros: ['Yüksək keyfiyyət', 'Sürətli çatdırılma', 'Gözəl dizayn'],
            cons: ['Qiymət bir az baha ola bilərdi'],
            orderId: '675a1234567890abcdef5678'
          }
        },
        voteReview: {
          url: 'POST /api/reviews/:reviewId/vote',
          body: {
            voteType: 'helpful'
          }
        },
        vendorResponse: {
          url: 'POST /api/reviews/:reviewId/vendor-response',
          body: {
            response: 'Təşəkkür edirik gözəl review üçün! Sizin məmnuniyyətiniz bizim üçün ən vacib məsələdir. Gələcəkdə də keyfiyyətli xidmət göstərməyə davam edəcəyik.'
          }
        },
        reportReview: {
          url: 'POST /api/reviews/:reviewId/report',
          body: {
            reason: 'spam'
          }
        }
      },
      responseFormat: {
        success: {
          success: true,
          message: 'Success message',
          data: 'Response data object',
          pagination: 'Pagination info (for paginated responses)'
        },
        error: {
          success: false,
          message: 'Error message',
          errors: 'Validation errors array (if applicable)'
        }
      },
      webhooks: {
        note: 'Review sistemində webhook event-ləri',
        events: [
          'review.created - Yeni review yaradılanda',
          'review.approved - Review təsdiqlənəndə',
          'review.vendor_responded - Vendor cavab verəndə',
          'review.reported - Review report ediləndə'
        ]
      }
    });
  });
}

module.exports = router;