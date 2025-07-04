const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateAdminFields = async () => {
  try {
    // Database bağlantısı
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📡 Database bağlantısı quruldu');

    // Admin hesabını bul
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ Admin hesabı bulunamadı');
      process.exit(1);
    }

    console.log('📧 Mevcut admin:', admin.email);
    console.log('👤 Mevcut firstName:', admin.firstName);
    console.log('👤 Mevcut lastName:', admin.lastName);

    // firstName ve lastName alanlarını güncelle
    let updated = false;
    
    if (!admin.firstName) {
      admin.firstName = 'Admin';
      updated = true;
    }
    
    if (!admin.lastName) {
      admin.lastName = 'User';
      updated = true;
    }

    if (updated) {
      await admin.save();
      console.log('✅ Admin hesabı güncellendi!');
      console.log('📝 Yeni firstName:', admin.firstName);
      console.log('📝 Yeni lastName:', admin.lastName);
      console.log('📝 Full name:', admin.fullName);
      console.log('📝 Initials:', admin.initials);
    } else {
      console.log('✅ Admin hesabı zaten güncel');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Güncelleme hatası:', error);
    process.exit(1);
  }
};

// Skripti çalıştır
updateAdminFields(); 