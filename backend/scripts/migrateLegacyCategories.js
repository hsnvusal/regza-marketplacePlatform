// scripts/migrateLegacyCategories.js - Düzəldilmiş versiya
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Load environment variables
require('dotenv').config();

// Legacy kategoriyaları və müvafiq yeni adları
const LEGACY_CATEGORY_MAPPING = {
  'electronics': 'Elektronika',
  'clothing': 'Geyim və Moda',
  'home-garden': 'Ev və Bağ',
  'books': 'Kitablar',
  'gaming': 'Oyun və Əyləncə',
  'beauty': 'Gözəllik və Sağlamlıq',
  'sports': 'İdman və Outdoor',
  'automotive': 'Avtomobil',
  'food': 'Qida və İçki',
  'toys': 'Oyuncaq və Uşaq'
};

async function migrateLegacyCategories() {
  try {
    console.log('🚀 Legacy kategoriya məhsulları migration-ı başlayır...');

    // 1. Əvvəlcə yeni kategoriyaları yarat (əgər yoxdursa)
    console.log('📦 Yeni kategoriyaları yaradır...');
    
    const categoryMap = {};
    
    for (const [legacyKey, newName] of Object.entries(LEGACY_CATEGORY_MAPPING)) {
      let category = await Category.findOne({ name: newName });
      
      if (!category) {
        category = await Category.create({
          name: newName,
          description: `${newName} kategoriyası`,
          isActive: true,
          isFeatured: true,
          showInMenu: true,
          sortOrder: Object.keys(categoryMap).length + 1
        });
        
        console.log(`✅ Yeni kategoriya yaradıldı: ${newName}`);
      } else {
        console.log(`ℹ️  Kategoriya artıq mövcuddur: ${newName}`);
      }
      
      categoryMap[legacyKey] = category._id;
    }

    // 2. Legacy kategoriyalı məhsulları tap və yenilə
    console.log('🔄 Legacy məhsulları yenilənir...');
    
    const legacyProducts = await Product.find({
      categoryLegacy: { $exists: true, $ne: null },
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });

    console.log(`📊 Tapılan legacy məhsul sayı: ${legacyProducts.length}`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const product of legacyProducts) {
      try {
        const legacyCategory = product.categoryLegacy;
        const newCategoryId = categoryMap[legacyCategory];
        
        if (newCategoryId) {
          await Product.findByIdAndUpdate(product._id, {
            category: newCategoryId,
            // Legacy field-i də qoruyaq (backward compatibility üçün)
            categoryLegacy: legacyCategory
          });
          
          migratedCount++;
          console.log(`✅ Məhsul yeniləndi: ${product.name} -> ${LEGACY_CATEGORY_MAPPING[legacyCategory]}`);
        } else {
          console.log(`⚠️  Uyğun kategoriya tapılmadı: ${legacyCategory} (Məhsul: ${product.name})`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Məhsul yenilənmədi (${product.name}):`, error.message);
        errorCount++;
      }
    }

    // 3. Category-lər üçün məhsul sayını yenilə
    console.log('📈 Kategoriya məhsul sayları yenilənir...');
    
    for (const categoryId of Object.values(categoryMap)) {
      const productCount = await Product.countDocuments({
        category: categoryId,
        status: 'active'
      });
      
      await Category.findByIdAndUpdate(categoryId, {
        productCount: productCount
      });
      
      console.log(`📊 Kategoriya məhsul sayı yeniləndi: ${productCount}`);
    }

    // 4. Nəticələri göstər
    console.log('\n🎉 Migration tamamlandı!');
    console.log(`✅ Uğurla köçürülən məhsul: ${migratedCount}`);
    console.log(`❌ Xəta olan məhsul: ${errorCount}`);
    console.log(`📦 Yaradılan/İstifadə edilən kategoriya: ${Object.keys(categoryMap).length}`);

    // 5. Verification - yoxlama
    console.log('\n🔍 Doğrulama nəticələri:');
    
    const totalProducts = await Product.countDocuments();
    const productsWithNewCategory = await Product.countDocuments({ 
      category: { $exists: true, $ne: null } 
    });
    const productsWithLegacyOnly = await Product.countDocuments({
      categoryLegacy: { $exists: true, $ne: null },
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });

    console.log(`📊 Ümumi məhsul sayı: ${totalProducts}`);
    console.log(`✅ Yeni kategoriyalı məhsul: ${productsWithNewCategory}`);
    console.log(`⚠️  Hələ legacy kategoriyalı məhsul: ${productsWithLegacyOnly}`);

    return {
      success: true,
      migratedCount,
      errorCount,
      totalProducts,
      productsWithNewCategory,
      productsWithLegacyOnly
    };

  } catch (error) {
    console.error('❌ Migration xətası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ayrıca problematik məhsulları düzəlt
async function fixProblematicProducts() {
  try {
    console.log('🔧 Problematik məhsullar düzəldilir...');

    // 1. Category field-i olmayan amma categoryLegacy olan məhsullar
    const problematicProducts = await Product.find({
      $or: [
        { category: null, categoryLegacy: { $exists: true, $ne: null } },
        { category: { $exists: false }, categoryLegacy: { $exists: true, $ne: null } }
      ]
    });

    console.log(`🔍 Tapılan problematik məhsul: ${problematicProducts.length}`);

    for (const product of problematicProducts) {
      try {
        const legacyCategory = product.categoryLegacy;
        const newCategoryName = LEGACY_CATEGORY_MAPPING[legacyCategory];
        
        if (newCategoryName) {
          const category = await Category.findOne({ name: newCategoryName });
          
          if (category) {
            await Product.findByIdAndUpdate(product._id, {
              category: category._id
            });
            
            console.log(`✅ Düzəldildi: ${product.name} -> ${newCategoryName}`);
          }
        }
      } catch (error) {
        console.error(`❌ Düzəldilmədi (${product.name}):`, error.message);
      }
    }

    // 2. Boş və ya null category field-ləri olan məhsulları təmizlə
    try {
      const result = await Product.updateMany(
        { 
          $or: [
            { category: '' },
            { category: 'null' },
            { category: 'undefined' }
          ]
        },
        { $unset: { category: 1 } }
      );

      console.log(`🧹 Təmizlənən boş category field: ${result.modifiedCount}`);
    } catch (cleanupError) {
      console.log('⚠️  Cleanup xətası (normal hal):', cleanupError.message);
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Fix problematic products xətası:', error);
    return { success: false, error: error.message };
  }
}

// ✅ DÜZƏLTMƏ: Main execution function
async function runMigration() {
  console.log('🔍 Environment variables yoxlanılır...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  
  // MongoDB URI options - server-lə eyni connection
  const MONGODB_URIS = [
    process.env.MONGODB_URI,                                    // .env faylından
    process.env.MONGO_URI,                                      // Alternative env name
    process.env.DATABASE_URL,                                   // Alternative env name
    'mongodb://localhost:27017/regza',                          // Default database name
    'mongodb://localhost:27017/regza-db',                       // Alternative DB name
    'mongodb://127.0.0.1:27017/regza',                         // IPv4 explicit
    'mongodb://127.0.0.1:27017/regza-db',                      // IPv4 alternative
  ];

  // İlk mövcud URI-ni tap
  let mongoUri = MONGODB_URIS.find(uri => uri && uri.startsWith('mongodb'));
  
  if (!mongoUri) {
    console.error('❌ MongoDB URI tapılmadı!');
    console.log('📋 .env faylını yoxlayın və aşağıdakı satırlardan birini əlavə edin:');
    console.log('MONGODB_URI=mongodb://localhost:27017/regza');
    console.log('# və ya');
    console.log('MONGODB_URI=mongodb://localhost:27017/regza-db');
    process.exit(1);
  }
  
  console.log(`🔗 MongoDB URI tapıldı: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

  // Connection options
  const connectionOptions = {};

  // MongoDB Atlas URI-si üçün əlavə options
  if (mongoUri.includes('mongodb+srv')) {
    console.log('☁️  MongoDB Atlas connection istifadə edilir');
  }

  try {
    await mongoose.connect(mongoUri, connectionOptions);
    
    console.log('✅ MongoDB-yə uğurla qoşuldu');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Mövcud collections yoxla
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('📋 Mövcud collections:', collections.map(c => c.name).join(', '));
      
      // Product collection mövcudluğunu yoxla
      const productExists = collections.some(c => c.name === 'products');
      if (!productExists) {
        console.log('⚠️  Products collection tapılmadı. Test məhsul yaradılır...');
        
        // Test üçün bir məhsul yarat
        const testProduct = await Product.create({
          name: 'Test Məhsul',
          description: 'Migration test məhsulu',
          sku: 'TEST-' + Date.now(),
          categoryLegacy: 'electronics',
          pricing: {
            costPrice: 10,
            sellingPrice: 20
          },
          inventory: {
            stock: 100
          }
        });
        
        console.log('✅ Test məhsul yaradıldı:', testProduct.name);
      } else {
        // Mövcud məhsul sayını göstər
        const productCount = await Product.countDocuments();
        console.log(`📦 Mövcud məhsul sayı: ${productCount}`);
        
        // Legacy categoriyalı məhsulları yoxla
        const legacyProductCount = await Product.countDocuments({
          categoryLegacy: { $exists: true, $ne: null }
        });
        console.log(`🏷️  Legacy kategoriyalı məhsul sayı: ${legacyProductCount}`);
        
        // Yeni category field-ləri olan məhsulları yoxla
        const newCategoryProductCount = await Product.countDocuments({
          category: { $exists: true, $ne: null }
        });
        console.log(`🆕 Yeni kategory field-i olan məhsul sayı: ${newCategoryProductCount}`);
      }
    } catch (collectionsError) {
      console.log('⚠️  Collections yoxlanmasında xəta:', collectionsError.message);
    }
    
    console.log('\n🚀 Migration başlayır...');
    const result = await migrateLegacyCategories();
    
    if (result.success) {
      console.log('\n🔧 Problematik məhsullar düzəldilir...');
      await fixProblematicProducts();
    }
    
    console.log('\n🎉 Migration tamamlandı!');
    console.log('📊 Final nəticələr:', {
      migratedProducts: result.migratedCount || 0,
      errors: result.errorCount || 0,
      totalProducts: result.totalProducts || 0
    });
    
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı bağlandı');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ MongoDB qoşulma xətası:', error.message);
    
    // Daha detallı error info
    if (error.message.includes('buffermaxentries')) {
      console.error('\n🔧 Mongoose version problemi! Köhnə options istifadə edilir');
      console.error('Package.json-da mongoose version yoxlayın');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 MongoDB server işləmir! Aşağıdakıları yoxlayın:');
      console.error('1. Server-də MongoDB işləyir? npm run start işləyirsə, port conflict ola bilər');
      console.error('2. .env faylında MONGODB_URI düzgün yazılıb?');
      console.error('3. Database adı düzgündür? (regza, regza-db, vs.)');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🔧 MongoDB host tapılmır! Host adını yoxlayın');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('\n🔧 MongoDB server seçimi uğursuz! URI və ya server problemi');
    }
    
    console.error(`\n📝 Cəhd edilən URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
    console.error('\n💡 Həll üçün:');
    console.error('1. .env faylında MONGODB_URI düzgün yazmışsınız:');
    console.error('   MONGODB_URI=mongodb+srv://hsnvusal:vusal361@regza-cluster.hyvyjmr.mongodb.net/marketplace-pro?retryWrites=true&w=majority');
    console.error('2. MongoDB Atlas cluster-i active-dir?');
    console.error('3. IP whitelist-də local IP var?');
    
    process.exit(1);
  }
}

// Direct execution
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateLegacyCategories,
  fixProblematicProducts,
  LEGACY_CATEGORY_MAPPING
};