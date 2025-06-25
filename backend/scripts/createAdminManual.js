// scripts/createAdminManual.js
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Manual konfiqurasiya
const config = {
  MONGODB_URI: 'mongodb+srv://hsnvusal:vusal361@regza-cluster.hyvyjmr.mongodb.net/marketplace-pro?retryWrites=true&w=majority',
  ADMIN_EMAIL: 'vusalhesenov361@gmail.com',
  ADMIN_PASSWORD: 'Vusal361!',
  ADMIN_FIRST_NAME: 'Vusal',
  ADMIN_LAST_NAME: 'Hesenov'
};

// User Schema (model import etmək əvəzinə)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  phone: String,
  avatar: String,
  address: {
    country: String,
    city: String,
    district: String,
    street: String,
    postalCode: String
  },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const createAdmin = async () => {
  try {
    console.log('🔄 Database-ə bağlanılır...');
    
    // Database bağlantısı
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Database bağlantısı uğurlu');

    // Mövcud admin yoxla
    const existingAdmin = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { email: config.ADMIN_EMAIL }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin artıq mövcuddur:');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Role:', existingAdmin.role);
      console.log('🆔 ID:', existingAdmin._id);
      
      if (existingAdmin.role !== 'admin') {
        console.log('🔄 Bu istifadəçini admin edirəm...');
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ İstifadəçi admin edildi!');
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🔄 Admin yaradılır...');

    // Şifrəni hash et
    const hashedPassword = await bcrypt.hash(config.ADMIN_PASSWORD, 12);

    // Admin yarat
    const admin = await User.create({
      firstName: config.ADMIN_FIRST_NAME,
      lastName: config.ADMIN_LAST_NAME,
      email: config.ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      phone: '+994501234567',
      address: {
        country: 'Azerbaijan',
        city: 'Baku',
        district: 'Nizami',
        street: 'Admin Street 1',
        postalCode: 'AZ1000'
      },
      createdAt: new Date()
    });
    
    console.log('\n🎉 ADMIN UĞURLA YARADILDI!');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:', admin.email);
    console.log('🔒 Şifrə:', config.ADMIN_PASSWORD);
    console.log('👤 Role:', admin.role);
    console.log('🆔 ID:', admin._id);
    console.log('═══════════════════════════════════');
    console.log('⚠️  TƏHLÜKƏSIZLIK: Şifrəni dərhal dəyişdirin!');
    console.log('🔗 Login URL: http://localhost:3000/admin/login');
    console.log('\n✅ Database bağlantısı bağlandı');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Admin yaradılmasında xəta:');
    console.error('═══════════════════════════════════');
    
    if (error.code === 11000) {
      console.error('📧 Bu email artıq istifadə olunur:', config.ADMIN_EMAIL);
      console.error('💡 Həll: Fərqli email istifadə edin və ya mövcud istifadəçini admin edin');
    } else if (error.name === 'ValidationError') {
      console.error('📝 Validation xətası:', error.message);
    } else if (error.name === 'MongoNetworkError') {
      console.error('🌐 Database bağlantı xətası. MongoDB URI-ni yoxlayın');
    } else {
      console.error('🔍 Xəta:', error.message);
      console.error('📋 Stack:', error.stack);
    }
    
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Script çalışdır
console.log('🚀 Admin yaratma scripti başlayır...');
console.log('📧 Email:', config.ADMIN_EMAIL);
console.log('👤 Ad:', config.ADMIN_FIRST_NAME, config.ADMIN_LAST_NAME);
console.log('🗄️  Database:', config.MONGODB_URI.split('@')[1]?.split('/')[1] || 'Unknown');
console.log('');

createAdmin();