const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Sadə connection options
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📄 Database: ${conn.connection.name}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Ətraflı debug məlumatı
    if (error.message.includes('buffermaxentries')) {
      console.log('🔧 Həll yolu: Mongoose versiyasını endirin');
      console.log('   npm install mongoose@7.0.0');
    }
    
    if (error.message.includes('authentication')) {
      console.log('🔧 Username və ya password yanlışdır');
    }
    
    if (error.message.includes('network')) {
      console.log('🔧 IP address whitelist yoxlayın');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;