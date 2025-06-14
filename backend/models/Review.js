const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Əsas məlumatlar
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Review məhsul üçün olmalıdır']
  },
  
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review yazıcısı tələb olunur']
  },
  
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Vendor məlumatı tələb olunur']
  },
  
  // Review məzmunu
  title: {
    type: String,
    required: [true, 'Review başlığı tələb olunur'],
    trim: true,
    maxlength: [100, 'Başlıq 100 simvoldan çox ola bilməz'],
    minlength: [5, 'Başlıq ən azı 5 simvol olmalıdır']
  },
  
  comment: {
    type: String,
    required: [true, 'Review şərhi tələb olunur'],
    trim: true,
    maxlength: [2000, 'Şərh 2000 simvoldan çox ola bilməz'],
    minlength: [10, 'Şərh ən azı 10 simvol olmalıdır']
  },
  
  // Reytinqlər (1-5 ulduz)
  ratings: {
    overall: {
      type: Number,
      required: [true, 'Ümumi reytinq tələb olunur'],
      min: [1, 'Reytinq ən azı 1 ulduz olmalıdır'],
      max: [5, 'Reytinq maksimum 5 ulduz ola bilər']
    },
    quality: {
      type: Number,
      min: [1, 'Keyfiyyət reytinqi ən azı 1 ulduz olmalıdır'],
      max: [5, 'Keyfiyyət reytinqi maksimum 5 ulduz ola bilər']
    },
    value: {
      type: Number,
      min: [1, 'Dəyər reytinqi ən azı 1 ulduz olmalıdır'],
      max: [5, 'Dəyər reytinqi maksimum 5 ulduz ola bilər']
    },
    delivery: {
      type: Number,
      min: [1, 'Çatdırılma reytinqi ən azı 1 ulduz olmalıdır'],
      max: [5, 'Çatdırılma reytinqi maksimum 5 ulduz ola bilər']
    }
  },
  
  // Review şəkilləri
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Review image'
    },
    caption: {
      type: String,
      maxlength: [200, 'Şəkil açıqlaması 200 simvoldan çox ola bilməz']
    }
  }],
  
  // Verified purchase yoxlanışı
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  orderItem: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // Review statusu
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'hidden'],
      message: 'Status pending, approved, rejected və ya hidden ola bilər'
    },
    default: 'pending'
  },
  
  // Moderation məlumatları
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationNote: {
      type: String,
      maxlength: [500, 'Moderation qeydi 500 simvoldan çox ola bilməz']
    },
    autoModerated: {
      type: Boolean,
      default: false
    }
  },
  
  // Helpful votes (faydalı hesab edilən reviewlər)
  helpfulVotes: {
    helpful: {
      type: Number,
      default: 0,
      min: [0, 'Faydalı səs sayı mənfi ola bilməz']
    },
    notHelpful: {
      type: Number,
      default: 0,
      min: [0, 'Faydasız səs sayı mənfi ola bilməz']
    },
    voters: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['helpful', 'not_helpful']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Vendor cavabı
  vendorResponse: {
    response: {
      type: String,
      maxlength: [1000, 'Vendor cavabı 1000 simvoldan çox ola bilməz']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  
  // Spam və abuse yoxlanışı
  reportedBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'fake', 'offensive', 'other']
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // SEO və axtarış
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Review metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    location: {
      country: String,
      city: String
    }
  },
  
  // Review məlumatları
  isRecommended: {
    type: Boolean,
    default: null // true: tövsiyə edir, false: tövsiyə etmir, null: deyilməyib
  },
  
  pros: [{
    type: String,
    trim: true,
    maxlength: [100, 'Müsbət cəhət 100 simvoldan çox ola bilməz']
  }],
  
  cons: [{
    type: String,
    trim: true,
    maxlength: [100, 'Mənfi cəhət 100 simvoldan çox ola bilməz']
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.metadata?.ipAddress;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.metadata?.ipAddress;
      return ret;
    }
  }
});

// Virtual fields
reviewSchema.virtual('helpfulRatio').get(function() {
  const total = this.helpfulVotes.helpful + this.helpfulVotes.notHelpful;
  return total > 0 ? Math.round((this.helpfulVotes.helpful / total) * 100) : 0;
});

reviewSchema.virtual('daysSinceReview').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

reviewSchema.virtual('averageRating').get(function() {
  const ratings = [];
  if (this.ratings.overall) ratings.push(this.ratings.overall);
  if (this.ratings.quality) ratings.push(this.ratings.quality);
  if (this.ratings.value) ratings.push(this.ratings.value);
  if (this.ratings.delivery) ratings.push(this.ratings.delivery);
  
  return ratings.length > 0 ? 
    Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : 0;
});

// Indexes for performance
reviewSchema.index({ product: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ vendor: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ verifiedPurchase: 1 });
reviewSchema.index({ 'ratings.overall': -1 });
reviewSchema.index({ createdAt: -1 });

// Compound indexes
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ product: 1, 'ratings.overall': -1 });
reviewSchema.index({ vendor: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); // Bir istifadəçi bir məhsula yalnız bir review yaza bilər

// Text search index
reviewSchema.index({ 
  title: 'text', 
  comment: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    comment: 5,
    tags: 1
  }
});

// Pre-save middleware - auto moderation
reviewSchema.pre('save', function(next) {
  if (this.isNew) {
    // Spam söz yoxlanışı (sadə versiya)
    const spamWords = ['spam', 'fake', 'terrible', 'worst', 'horrible'];
    const reviewText = (this.title + ' ' + this.comment).toLowerCase();
    
    const hasSpam = spamWords.some(word => reviewText.includes(word));
    
    if (hasSpam) {
      this.status = 'pending';
      this.moderation.autoModerated = true;
      this.moderation.moderationNote = 'Auto-flagged for potential spam content';
    } else {
      this.status = 'approved'; // Auto-approve əgər spam yoxdursa
    }
  }
  
  next();
});

// Post-save middleware - update product ratings
reviewSchema.post('save', async function(doc) {
  if (doc.status === 'approved') {
    await this.constructor.updateProductRatings(doc.product);
  }
});

// Post-remove middleware - update product ratings
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.status === 'approved') {
    await this.constructor.updateProductRatings(doc.product);
  }
});

// Static method - update product average rating
reviewSchema.statics.updateProductRatings = async function(productId) {
  try {
    const Product = require('./Product');
    
    const stats = await this.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$ratings.overall' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$ratings.overall'
          }
        }
      }
    ]);

    if (stats.length > 0) {
      const stat = stats[0];
      
      // Rating distribution hesablama
      const distribution = { five: 0, four: 0, three: 0, two: 0, one: 0 };
      stat.ratingDistribution.forEach(rating => {
        if (rating === 5) distribution.five++;
        else if (rating === 4) distribution.four++;
        else if (rating === 3) distribution.three++;
        else if (rating === 2) distribution.two++;
        else if (rating === 1) distribution.one++;
      });

      await Product.findByIdAndUpdate(productId, {
        'ratings.average': Math.round(stat.avgRating * 10) / 10,
        'ratings.count': stat.totalReviews,
        'ratings.distribution': distribution
      });
    } else {
      // Heç review yoxdursa sıfırla
      await Product.findByIdAndUpdate(productId, {
        'ratings.average': 0,
        'ratings.count': 0,
        'ratings.distribution': { five: 0, four: 0, three: 0, two: 0, one: 0 }
      });
    }
  } catch (error) {
    console.error('Product rating update xətası:', error);
  }
};

// Static method - get reviews by product
reviewSchema.statics.getProductReviews = function(productId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'newest',
    rating = null,
    verifiedOnly = false
  } = options;

  let sort = {};
  switch (sortBy) {
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'highest_rating':
      sort = { 'ratings.overall': -1, createdAt: -1 };
      break;
    case 'lowest_rating':
      sort = { 'ratings.overall': 1, createdAt: -1 };
      break;
    case 'most_helpful':
      sort = { 'helpfulVotes.helpful': -1, createdAt: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  let filter = {
    product: productId,
    status: 'approved'
  };

  if (rating) {
    filter['ratings.overall'] = rating;
  }

  if (verifiedOnly) {
    filter.verifiedPurchase = true;
  }

  return this.find(filter)
    .populate('user', 'firstName lastName avatar')
    .populate('vendorResponse.respondedBy', 'firstName lastName businessName')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

// Instance method - vote helpful
reviewSchema.methods.voteHelpful = function(userId, voteType) {
  // Əvvəlcə mövcud vote-u yoxla
  const existingVoteIndex = this.helpfulVotes.voters.findIndex(
    voter => voter.user.toString() === userId
  );

  if (existingVoteIndex > -1) {
    // Mövcud vote var, yenilə
    const oldVote = this.helpfulVotes.voters[existingVoteIndex].vote;
    
    // Köhnə vote-u azalt
    if (oldVote === 'helpful') {
      this.helpfulVotes.helpful = Math.max(0, this.helpfulVotes.helpful - 1);
    } else {
      this.helpfulVotes.notHelpful = Math.max(0, this.helpfulVotes.notHelpful - 1);
    }
    
    // Yeni vote əlavə et
    this.helpfulVotes.voters[existingVoteIndex] = {
      user: userId,
      vote: voteType,
      votedAt: new Date()
    };
  } else {
    // Yeni vote əlavə et
    this.helpfulVotes.voters.push({
      user: userId,
      vote: voteType,
      votedAt: new Date()
    });
  }

  // Vote saylarını yenilə
  if (voteType === 'helpful') {
    this.helpfulVotes.helpful++;
  } else {
    this.helpfulVotes.notHelpful++;
  }

  return this.save();
};

// Instance method - add vendor response
reviewSchema.methods.addVendorResponse = function(response, vendorId) {
  this.vendorResponse = {
    response,
    respondedAt: new Date(),
    respondedBy: vendorId
  };
  
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);