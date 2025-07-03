// scripts/seedCategories.js - .env path problemi həlli
const path = require('path');

// .env faylını parent directory-dən oxu (backend root-dan)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');

// Model-i düzgün yoldan import et
const Category = require(path.join(__dirname, '../models/Category'));

console.log('🔍 Environment Debug:');
console.log('📂 Script directory:', __dirname);
console.log('📂 .env path:', path.join(__dirname, '../.env'));
console.log('🔗 MONGO_URI:', process.env.MONGO_URI || 'NOT FOUND');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');

// Fallback connection string-lər
const MONGO_URI = process.env.MONGO_URI || 
                  process.env.MONGODB_URI || 
                  'mongodb://localhost:27017/marketplace';

console.log('🎯 Final MONGO_URI:', MONGO_URI);

const categories = [
  {
    name: 'Elektronika',
    description: 'Telefon, laptop və digər elektron cihazlar',
    icon: 'fas fa-laptop',
    color: '#007bff',
    isFeatured: true,
    sortOrder: 1,
    isActive: true,
    showInMenu: true
  },
  {
    name: 'Geyim',
    description: 'Kişi, qadın və uşaq geyimləri',
    icon: 'fas fa-tshirt',
    color: '#28a745',
    isFeatured: true,
    sortOrder: 2,
    isActive: true,
    showInMenu: true
  },
  {
    name: 'Ev və Bağ',
    description: 'Ev əşyaları və bağçılıq məhsulları',
    icon: 'fas fa-home',
    color: '#ffc107',
    isFeatured: true,
    sortOrder: 3,
    isActive: true,
    showInMenu: true
  },
  {
    name: 'Kitablar',
    description: 'Ədəbiyyat, tədris kitabları və jurnallar',
    icon: 'fas fa-book',
    color: '#6f42c1',
    isFeatured: true,
    sortOrder: 4,
    isActive: true,
    showInMenu: true
  },
  {
    name: 'Oyunlar',
    description: 'Video oyunlar və oyun aksesuarları',
    icon: 'fas fa-gamepad',
    color: '#e83e8c',
    isFeatured: true,
    sortOrder: 5,
    isActive: true,
    showInMenu: true
  },
  {
    name: 'Gözəllik',
    description: 'Kosmetika və şəxsi baxım məhsulları',
    icon: 'fas fa-spa',
    color: '#fd7e14',
    isFeatured: true,
    sortOrder: 6,
    isActive: true,
    showInMenu: true
  }
];

async function seedCategories() {
  try {
    console.log('\n🚀 Kategoriya seed prosesi başlayır...');

    // MongoDB connection seçimləri
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 saniyə
      connectTimeoutMS: 10000,
      maxPoolSize: 1, // Script üçün 1 connection kifayətdir
    };

    console.log('📞 MongoDB-yə qoşulur...');
    console.log('🔗 Connection string:', MONGO_URI.replace(/\/\/.*:.*@/, '//***:***@')); // Password gizlət
    
    await mongoose.connect(MONGO_URI, connectionOptions);
    console.log('✅ MongoDB qoşumu uğurlu');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🏠 Host:', mongoose.connection.host);
    console.log('🚪 Port:', mongoose.connection.port);

    // Mövcud kategoriyaları say
    const existingCount = await Category.countDocuments();
    console.log(`\n📊 Mövcud kategoriya sayı: ${existingCount}`);

    // Mövcud kategoriyaları sil
    if (existingCount > 0) {
      console.log('🗑️ Köhnə kategoriyalar silinir...');
      const deleteResult = await Category.deleteMany({});
      console.log(`✅ ${deleteResult.deletedCount} kategoriya silindi`);
    }

    // Yeni kategoriyaları əlavə et
    console.log('📝 Yeni kategoriyalar əlavə edilir...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} əsas kategoriya yaradıldı`);

    // Alt kategoriyalar əlavə et
    const elektronika = createdCategories.find(c => c.name === 'Elektronika');
    const geyim = createdCategories.find(c => c.name === 'Geyim');
    
    if (elektronika && geyim) {
      console.log('📱 Alt kategoriyalar əlavə edilir...');
      
      const subCategories = [
        // Elektronika alt kategoriyaları
        {
          name: 'Telefonlar',
          parent: elektronika._id,
          description: 'Ağıllı telefonlar və aksesuarlar',
          icon: 'fas fa-mobile-alt',
          color: '#007bff',
          sortOrder: 1,
          isActive: true,
          showInMenu: true
        },
        {
          name: 'Laptoplar',
          parent: elektronika._id,
          description: 'Noutbuklar və kompüterlər',
          icon: 'fas fa-laptop',
          color: '#007bff',
          sortOrder: 2,
          isActive: true,
          showInMenu: true
        },
        {
          name: 'TV və Audio',
          parent: elektronika._id,
          description: 'Televizorlar və audio sistemlər',
          icon: 'fas fa-tv',
          color: '#007bff',
          sortOrder: 3,
          isActive: true,
          showInMenu: true
        },
        
        // Geyim alt kategoriyaları
        {
          name: 'Kişi Geyimi',
          parent: geyim._id,
          description: 'Kişilər üçün geyim və aksesuarlar',
          icon: 'fas fa-male',
          color: '#28a745',
          sortOrder: 1,
          isActive: true,
          showInMenu: true
        },
        {
          name: 'Qadın Geyimi',
          parent: geyim._id,
          description: 'Qadınlar üçün geyim və aksesuarlar',
          icon: 'fas fa-female',
          color: '#28a745',
          sortOrder: 2,
          isActive: true,
          showInMenu: true
        },
        {
          name: 'Uşaq Geyimi',
          parent: geyim._id,
          description: 'Uşaqlar üçün geyim və aksesuarlar',
          icon: 'fas fa-child',
          color: '#28a745',
          sortOrder: 3,
          isActive: true,
          showInMenu: true
        }
      ];
      
      const createdSubCategories = await Category.insertMany(subCategories);
      console.log(`✅ ${createdSubCategories.length} alt kategoriya yaradıldı`);
    }

    // Final statistika
    const totalCategories = await Category.countDocuments();
    const mainCategories = await Category.countDocuments({ parent: null });
    const subCategories = await Category.countDocuments({ parent: { $ne: null } });
    const featuredCategories = await Category.countDocuments({ isFeatured: true });

    console.log('\n📊 Nəticə statistikası:');
    console.log(`   📁 Ümumi kategoriya sayı: ${totalCategories}`);
    console.log(`   🏠 Əsas kategoriya sayı: ${mainCategories}`);
    console.log(`   📂 Alt kategoriya sayı: ${subCategories}`);
    console.log(`   ⭐ Seçilmiş kategoriya sayı: ${featuredCategories}`);

    // Test üçün bəzi kategoriyaları göstər
    console.log('\n📋 Yaradılan kategoriyalar (ilk 5):');
    const sampleCategories = await Category.find({}).limit(5).sort({ level: 1, sortOrder: 1 });
    sampleCategories.forEach(cat => {
      const indent = '  '.repeat(cat.level || 0);
      const icon = cat.isFeatured ? '⭐' : cat.parent ? '📂' : '📁';
      console.log(`   ${indent}${icon} ${cat.name} (${cat.slug})`);
    });

    console.log('\n🎉 Kategoriya seed prosesi uğurla tamamlandı!');
    console.log('🔗 Test edə biləcəyiniz URL-lər:');
    console.log('   - GET /api/categories');
    console.log('   - GET /api/categories/tree');
    console.log('   - GET /api/categories/featured');
    console.log('   - GET /api/categories/elektronika');

  } catch (error) {
    console.error('\n❌ Seed xətası:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('\nValidation xətaları:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  - ${key}: ${error.errors[key].message}`);
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 MongoDB connection uğursuz:');
      console.error('   1. MongoDB server işləyir?');
      console.error('   2. Connection string düzgündür?');
      console.error('   3. .env faylı mövcuddur?');
    }
    
    process.exit(1);
  } finally {
    // Connection-u bağla
    try {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection bağlandı');
    } catch (err) {
      console.error('Connection bağlama xətası:', err.message);
    }
    process.exit(0);
  }
}

// Script-i işə sal
if (require.main === module) {
  seedCategories();
}

module.exports = seedCategories;