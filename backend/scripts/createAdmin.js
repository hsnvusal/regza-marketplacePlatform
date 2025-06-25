// scripts/createAdmin.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/database');
require('dotenv').config();

const createFirstAdmin = async () => {
  try {
    // Database bağlantısı
    await connectDB();
    console.log('📡 Database bağlantısı quruldu');

    // Mövcud admin var mı yoxla
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin artıq mövcuddur:', existingAdmin.email);
      process.exit(0);
    }

    // Admin məlumatları
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'vusalhesenov361@gmail.com', // Dəyişdirin
      password: await bcrypt.hash('Vusal361', 10), // Güclü şifrə qoyun
      role: 'admin',
      isActive: true,
      phone: '+994513664011',
      avatar: null,
      address: {
        country: 'Azerbaijan',
        city: 'Baku',
        district: 'Nizami',
        street: 'Admin Street 1',
        postalCode: 'AZ1000'
      },
      createdAt: new Date(),
      lastLogin: null
    };

    // Admin yarat
    const admin = await User.create(adminData);
    
    console.log('🎉 İlk admin uğurla yaradıldı!');
    console.log('📧 Email:', admin.email);
    console.log('⚠️  Şifrəni dərhal dəyişdirin!');
    console.log('👤 Admin ID:', admin._id);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Admin yaradılmasında xəta:', error);
    process.exit(1);
  }
};

// Skripti çalışdır
createFirstAdmin();