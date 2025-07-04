const connectDB = require('../config/database');
const User = require('../models/User');
require('dotenv').config();

const checkAdmin = async () => {
  try {
    await connectDB();
    console.log('📡 Database bağlandı');
    
    const users = await User.find({}).select('firstName lastName email role isActive');
    console.log('\n👥 Tüm kullanıcılar:');
    users.forEach(user => {
      console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}, Name: ${user.firstName} ${user.lastName}`);
    });
    
    const admin = await User.findOne({ email: 'vusalhesenov361@gmail.com' });
    if (admin) {
      console.log('\n🔧 Admin hesabı detayları:');
      console.log('📧 Email:', admin.email);
      console.log('👑 Role:', admin.role);
      console.log('✅ Active:', admin.isActive);
      console.log('👤 FirstName:', admin.firstName);
      console.log('👤 LastName:', admin.lastName);
      console.log('📝 Full Name:', admin.fullName);
    } else {
      console.log('\n❌ Admin hesabı bulunamadı!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
};

checkAdmin(); 