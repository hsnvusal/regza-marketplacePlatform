const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ad daxil edilməlidir'],
    trim: true,
    maxlength: [50, 'Ad 50 simvoldan çox ola bilməz'],
    minlength: [2, 'Ad ən azı 2 simvol olmalıdır']
  },
  lastName: {
    type: String,
    required: [true, 'Soyad daxil edilməlidir'],
    trim: true,
    maxlength: [50, 'Soyad 50 simvoldan çox ola bilməz'],
    minlength: [2, 'Soyad ən azı 2 simvol olmalıdır']
  },
  email: {
    type: String,
    required: [true, 'Email daxil edilməlidir'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Düzgün email formatı daxil edin'
    ]
  },
  password: {
    type: String,
    required: [true, 'Şifrə daxil edilməlidir'],
    minlength: [6, 'Şifrə ən azı 6 simvol olmalıdır'],
    select: false // Password default olaraq SELECT-də gəlməsin
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Düzgün telefon nömrəsi daxil edin']
  },
  avatar: {
    type: String,
    default: function() {
      return `https://ui-avatars.com/api/?name=${this.firstName}+${this.lastName}&background=667eea&color=ffffff&size=200`;
    }
  },
  role: {
    type: String,
    enum: {
      values: ['customer', 'vendor', 'admin'],
      message: 'Role customer, vendor və ya admin ola bilər'
    },
    default: 'customer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  
  // Address information
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'Azerbaijan',
      trim: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // User preferences
  preferences: {
    currency: {
      type: String,
      enum: ['AZN', 'USD', 'EUR', 'TRY'],
      default: 'AZN'
    },
    language: {
      type: String,
      enum: ['az', 'en', 'ru', 'tr'],
      default: 'az'
    },
    timezone: {
      type: String,
      default: 'Asia/Baku'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        newsletter: {
          type: Boolean,
          default: true
        },
        orderUpdates: {
          type: Boolean,
          default: true
        },
        promotions: {
          type: Boolean,
          default: true
        },
        security: {
          type: Boolean,
          default: true
        }
      },
      sms: {
        orderUpdates: {
          type: Boolean,
          default: false
        },
        security: {
          type: Boolean,
          default: false
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        orderUpdates: {
          type: Boolean,
          default: true
        },
        promotions: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  
  // Security and login tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: String,
    backupCodes: [String]
  },
  
  // Social login info
  socialLogins: {
    google: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    }
  },
  
  // Privacy settings
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    }
  },
  
  // User statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    wishlistItems: {
      type: Number,
      default: 0
    }
  },
  
  // Terms and conditions
  termsAccepted: {
    version: String,
    acceptedAt: Date
  },
  privacyPolicyAccepted: {
    version: String,
    acceptedAt: Date
  },
  
  // Marketing
  marketingConsent: {
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    phone: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpire;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpire;
    if (ret.twoFactorAuth) {
      delete ret.twoFactorAuth.secret;
      delete ret.twoFactorAuth.backupCodes;
    }
    return ret;
  }
},
  toObject: { 
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpire;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpire;
    if (ret.twoFactorAuth) {
      delete ret.twoFactorAuth.secret;
      delete ret.twoFactorAuth.backupCodes;
    }
    return ret;
  }
}
});

// Virtual fields
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }
  return null;
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ 'address.country': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Compound indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Text search index
userSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  email: 'text' 
});

// Pre-save middleware - şifrəni hash et
userSchema.pre('save', async function(next) {
  // Şifrə dəyişdirilibsə hash et
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware - email verify token yaratma
userSchema.pre('save', function(next) {
  if (this.isNew && !this.isEmailVerified) {
    this.emailVerificationToken = crypto.randomBytes(20).toString('hex');
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  }
  next();
});

// Instance method - şifrə yoxlama
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Şifrə yoxlanmasında xəta');
  }
};

// Instance method - JWT token yaratma
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role 
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

// Instance method - password reset token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpire = Date.now() + 10 * 60 * 1000; // 10 dəqiqə
  
  return resetToken;
};

// Instance method - email verification token
userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  
  return verificationToken;
};

// Instance method - hesabı kilidlə
userSchema.methods.lockAccount = function() {
  this.loginAttempts = 0;
  this.lockUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 saat
  return this.save();
};

// Instance method - hesabı aç
userSchema.methods.unlockAccount = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

// Instance method - login attempt artır
userSchema.methods.incLoginAttempts = function() {
  // Əgər lock vaxtı bitibsə, reset et
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 5 cəhddən sonra kilid
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // 2 saat
  }
  
  return this.updateOne(updates);
};

// Static method - email ilə istifadəçi tap
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
};

// Static method - aktiv istifadəçiləri say
userSchema.statics.getActiveUsersCount = function() {
  return this.countDocuments({ isActive: true });
};

// Static method - role-a görə istifadəçiləri tap
userSchema.statics.findByRole = function(role) {
  return this.find({ 
    role: role,
    isActive: true 
  });
};

// Post middleware - silinən istifadəçi üçün bağlı məlumatları sil
userSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    // Cart, Wishlist, Orders və s. sil
    const Cart = require('./Cart');
    const Wishlist = require('./Wishlist');
    const Order = require('./Order');
    const Review = require('./Review');
    
    await Promise.all([
      Cart.deleteMany({ user: doc._id }),
      Wishlist.deleteMany({ user: doc._id }),
      Order.updateMany(
        { customer: doc._id }, 
        { $set: { customerDeleted: true } }
      ),
      Review.updateMany(
        { user: doc._id }, 
        { $set: { userDeleted: true } }
      )
    ]);
  }
});

module.exports = mongoose.model('User', userSchema);