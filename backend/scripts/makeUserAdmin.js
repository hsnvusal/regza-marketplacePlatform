// scripts/makeUserAdmin.js
const mongoose = require('mongoose');

// Manual konfiqurasiya
const config = {
  MONGODB_URI: 'mongodb+srv://hsnvusal:vusal361@regza-cluster.hyvyjmr.mongodb.net/marketplace-pro?retryWrites=true&w=majority',
  USER_EMAIL: 'vusalhesenov361@gmail.com' // Sizin email
};

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  phone: String,
  avatar: String,
  address: Object,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const makeUserAdmin = async () => {
  try {
    console.log('🔄 Database-ə bağlanılır...');
    
    // Database bağlantısı
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Database bağlantısı uğurlu');

    // İstifadəçini tap
    const user = await User.findOne({ email: config.USER_EMAIL.toLowerCase() });
    
    if (!user) {
      console.log('❌ Bu email ilə istifadəçi tapılmadı:', config.USER_EMAIL);
      console.log('💡 Əvvəlcə bu email ilə qeydiyyatdan keçməlisiniz');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('👤 İstifadəçi tapıldı:');
    console.log('📧 Email:', user.email);
    console.log('👤 Ad:', user.firstName, user.lastName);
    console.log('🏷️  Cari rol:', user.role);
    console.log('🆔 ID:', user._id);

    if (user.role === 'admin') {
      console.log('✅ Bu istifadəçi artıq admin-dir!');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🔄 İstifadəçini admin edirəm...');

    // Role-u admin et
    user.role = 'admin';
    await user.save();
    
    console.log('\n🎉 İSTİFADƏÇİ ADMIN EDİLDİ!');
    console.log('═══════════════════════════════════');
    console.log('📧 Email:', user.email);
    console.log('👤 Ad:', user.firstName, user.lastName);
    console.log('🏷️  Yeni rol:', user.role);
    console.log('🆔 ID:', user._id);
    console.log('═══════════════════════════════════');
    console.log('🔗 Admin Panel: http://localhost:3000/admin/login');
    console.log('💡 Mövcud şifrənizlə daxil ola bilərsiniz');
    console.log('\n✅ Database bağlantısı bağlandı');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Rol dəyişdirilməsində xəta:');
    console.error('═══════════════════════════════════');
    console.error('🔍 Xəta:', error.message);
    console.error('📋 Stack:', error.stack);
    
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Script çalışdır
console.log('🚀 İstifadəçini admin etmə scripti başlayır...');
console.log('📧 Target Email:', config.USER_EMAIL);
console.log('🗄️  Database:', config.MONGODB_URI.split('@')[1]?.split('/')[1] || 'Unknown');
console.log('');

makeUserAdmin();