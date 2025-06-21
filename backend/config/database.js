// config/database.js - UPDATED VERSİYA (Deprecated options removed)
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable tapılmadı!');
      console.log('📝 .env faylında MONGODB_URI əlavə edin');
      process.exit(1);
    }

    console.log('🔄 MongoDB-ə qoşulur...');
    
    // ✅ UPDATED CONNECTION OPTIONS (deprecated options removed)
    const options = {
      // Keep only supported options in newer Mongoose versions
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      
      // Remove deprecated options:
      // ❌ useNewUrlParser: true - no longer needed
      // ❌ useUnifiedTopology: true - no longer needed  
      // ❌ bufferCommands: false - now handled differently
      // ❌ bufferMaxEntries: 0 - deprecated
      
      // Keep essential options
      retryWrites: true,
      w: 'majority',
      heartbeatFrequencyMS: 10000
    };

    // MongoDB-ə bağlan
    const conn = await mongoose.connect(mongoUri, options);

    console.log('✅ MongoDB bağlantısı uğurlu!');
    console.log(`📄 Database: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`🔌 Ready State: ${conn.connection.readyState}`);
    
    // Atlas cluster məlumatları
    if (mongoUri.includes('mongodb+srv')) {
      console.log('☁️ MongoDB Atlas cluster istifadə edilir');
    }

    return conn;

  } catch (error) {
    console.error('❌ MongoDB bağlantı xətası:', error.message);
    
    // Spesifik xəta tipləri üçün məsləhətlər
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication xətası:');
      console.error('   - Username və password-u yoxlayın');
      console.error('   - MongoDB Atlas-da database user yaradın');
      console.error('   - Password-da xüsusi simvollar varsa URL encode edin');
    }
    
    if (error.message.includes('network')) {
      console.error('🌐 Network xətası:');
      console.error('   - Internet bağlantınızı yoxlayın');
      console.error('   - MongoDB Atlas IP whitelist-ni yoxlayın');
      console.error('   - 0.0.0.0/0 əlavə edin (development üçün)');
    }
    
    process.exit(1);
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose MongoDB-ə bağlandı');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose MongoDB-dən ayrıldı');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔵 Mongoose yenidən bağlandı');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Graceful shutdown başlayır...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB bağlantısı bağlandı');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown xətası:', error);
    process.exit(1);
  }
});

module.exports = connectDB;