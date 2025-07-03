// scripts/cleanAndResetDatabase.js - Database-i təmizlə və yenidən qur
const mongoose = require('mongoose');
require('dotenv').config();

// Models import et
const Category = require('../models/Category');
const Product = require('../models/Product');

// Database bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/regza', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 🗑️ STEP 1: Hər şeyi təmizlə
async function cleanDatabase() {
  try {
    console.log('🗑️ Database təmizlənir...');
    
    // Bütün kategoriyaları sil
    const deletedCategories = await Category.deleteMany({});
    console.log(`✅ ${deletedCategories.deletedCount} kategoriya silindi`);
    
    // Bütün məhsulları sil
    const deletedProducts = await Product.deleteMany({});
    console.log(`✅ ${deletedProducts.deletedCount} məhsul silindi`);
    
    console.log('🧹 Database tamamilə təmizləndi!');
    return true;
  } catch (error) {
    console.error('❌ Database təmizləmə xətası:', error);
    return false;
  }
}

// 📁 STEP 2: Yeni kategoriyalar yarat
async function createTestCategories() {
  try {
    console.log('📁 Yeni kategoriyalar yaradılır...');
    
    const categories = [
      {
        name: 'Elektronika',
        description: 'Telefonlar, kompüterlər və digər elektronik cihazlar',
        icon: '💻',
        color: '#3182ce',
        isActive: true,
        isFeatured: true,
        showInMenu: true,
        sortOrder: 1
      },
      {
        name: 'Geyim',
        description: 'Kişi və qadın geyimləri, ayaqqabılar',
        icon: '👕',
        color: '#805ad5',
        isActive: true,
        isFeatured: true,
        showInMenu: true,
        sortOrder: 2
      },
      {
        name: 'Ev və Bağ',
        description: 'Ev əşyaları, mebel və bağ alətləri',
        icon: '🏠',
        color: '#38a169',
        isActive: true,
        isFeatured: false,
        showInMenu: true,
        sortOrder: 3
      },
      {
        name: 'Kitablar',
        description: 'Hər növ kitab və jurnallar',
        icon: '📚',
        color: '#d69e2e',
        isActive: true,
        isFeatured: false,
        showInMenu: true,
        sortOrder: 4
      },
      {
        name: 'İdman',
        description: 'İdman avadanlıqları və geyimləri',
        icon: '⚽',
        color: '#e53e3e',
        isActive: true,
        isFeatured: true,
        showInMenu: true,
        sortOrder: 5
      }
    ];

    const createdCategories = [];
    
    for (let categoryData of categories) {
      const category = await Category.create(categoryData);
      createdCategories.push(category);
      console.log(`✅ Yaradıldı: ${category.name} (ID: ${category._id})`);
    }
    
    return createdCategories;
  } catch (error) {
    console.error('❌ Kategoriya yaratma xətası:', error);
    return [];
  }
}

// 📱 STEP 3: Alt kategoriyalar əlavə et
async function createSubCategories(parentCategories) {
  try {
    console.log('📱 Alt kategoriyalar əlavə edilir...');
    
    // Elektronika alt kategoriyaları
    const elektronika = parentCategories.find(cat => cat.name === 'Elektronika');
    if (elektronika) {
      const electronicsSubs = [
        {
          name: 'Telefonlar',
          description: 'Smartphone və mobil telefonlar',
          icon: '📱',
          color: '#3182ce',
          parent: elektronika._id,
          isActive: true,
          showInMenu: true,
          sortOrder: 1
        },
        {
          name: 'Kompüterlər',
          description: 'Laptop və masaüstü kompüterlər',
          icon: '💻',
          color: '#3182ce',
          parent: elektronika._id,
          isActive: true,
          showInMenu: true,
          sortOrder: 2
        },
        {
          name: 'Aksesuarlar',
          description: 'Elektronik aksessuarlar və hissələr',
          icon: '🔌',
          color: '#3182ce',
          parent: elektronika._id,
          isActive: true,
          showInMenu: true,
          sortOrder: 3
        }
      ];
      
      for (let subCat of electronicsSubs) {
        const sub = await Category.create(subCat);
        console.log(`   ↳ ${sub.name} (ID: ${sub._id})`);
      }
    }
    
    // Geyim alt kategoriyaları
    const geyim = parentCategories.find(cat => cat.name === 'Geyim');
    if (geyim) {
      const clothingSubs = [
        {
          name: 'Kişi Geyimləri',
          description: 'Kişi geyim və aksesuarları',
          icon: '👔',
          color: '#805ad5',
          parent: geyim._id,
          isActive: true,
          showInMenu: true,
          sortOrder: 1
        },
        {
          name: 'Qadın Geyimləri',
          description: 'Qadın geyim və aksesuarları',
          icon: '👗',
          color: '#805ad5',
          parent: geyim._id,
          isActive: true,
          showInMenu: true,
          sortOrder: 2
        }
      ];
      
      for (let subCat of clothingSubs) {
        const sub = await Category.create(subCat);
        console.log(`   ↳ ${sub.name} (ID: ${sub._id})`);
      }
    }
    
    console.log('✅ Alt kategoriyalar yaradıldı');
    return true;
  } catch (error) {
    console.error('❌ Alt kategoriya yaratma xətası:', error);
    return false;
  }
}

// 📦 STEP 4: Test məhsulları yarat
async function createTestProducts() {
  try {
    console.log('📦 Test məhsulları yaradılır...');
    
    // Kategoriyaları tap
    const telefonlar = await Category.findOne({ name: 'Telefonlar' });
    const kompyuterler = await Category.findOne({ name: 'Kompüterlər' });
    const kisiGeyim = await Category.findOne({ name: 'Kişi Geyimləri' });
    const kitablar = await Category.findOne({ name: 'Kitablar' });
    
    const products = [
      {
        name: 'iPhone 15 Pro',
        description: 'Apple iPhone 15 Pro 128GB Deep Purple. Ən son A17 Pro çip ilə.',
        category: telefonlar?._id,
        brand: 'Apple',
        sku: 'IPH15PRO128',
        pricing: {
          costPrice: 800,
          sellingPrice: 1299,
          discountPrice: 1199,
          currency: 'AZN'
        },
        inventory: {
          stock: 25,
          lowStockThreshold: 5,
          trackQuantity: true
        },
        status: 'active',
        featured: true,
        images: [
          {
            url: 'https://via.placeholder.com/400x300?text=iPhone+15+Pro',
            alt: 'iPhone 15 Pro',
            isMain: true
          }
        ]
      },
      {
        name: 'MacBook Air M2',
        description: 'Apple MacBook Air 13" M2 çip, 8GB RAM, 256GB SSD',
        category: kompyuterler?._id,
        brand: 'Apple',
        sku: 'MBAM2256',
        pricing: {
          costPrice: 1000,
          sellingPrice: 1599,
          currency: 'AZN'
        },
        inventory: {
          stock: 15,
          lowStockThreshold: 3,
          trackQuantity: true
        },
        status: 'active',
        featured: true,
        images: [
          {
            url: 'https://via.placeholder.com/400x300?text=MacBook+Air+M2',
            alt: 'MacBook Air M2',
            isMain: true
          }
        ]
      },
      {
        name: 'Nike Air Force 1',
        description: 'Nike Air Force 1 ağ rəng klassik idman ayaqqabısı',
        category: kisiGeyim?._id,
        brand: 'Nike',
        sku: 'NIKEAF1W',
        pricing: {
          costPrice: 60,
          sellingPrice: 120,
          discountPrice: 99,
          currency: 'AZN'
        },
        inventory: {
          stock: 50,
          lowStockThreshold: 10,
          trackQuantity: true
        },
        status: 'active',
        featured: false,
        images: [
          {
            url: 'https://via.placeholder.com/400x300?text=Nike+Air+Force+1',
            alt: 'Nike Air Force 1',
            isMain: true
          }
        ]
      },
      {
        name: 'JavaScript Proqramlaşdırma',
        description: 'JavaScript öğrənmək üçün ətraflı və praktik kitab',
        category: kitablar?._id,
        brand: 'TechBooks',
        sku: 'JSBOOK2024',
        pricing: {
          costPrice: 15,
          sellingPrice: 35,
          currency: 'AZN'
        },
        inventory: {
          stock: 100,
          lowStockThreshold: 20,
          trackQuantity: true
        },
        status: 'active',
        featured: false,
        images: [
          {
            url: 'https://via.placeholder.com/400x300?text=JavaScript+Book',
            alt: 'JavaScript Proqramlaşdırma Kitabı',
            isMain: true
          }
        ]
      }
    ];
    
    const createdProducts = [];
    
    for (let productData of products) {
      if (productData.category) { // Yalnız category-si olan məhsulları yarat
        const product = await Product.create(productData);
        createdProducts.push(product);
        console.log(`✅ Məhsul: ${product.name} -> ${productData.category}`);
      }
    }
    
    console.log(`✅ ${createdProducts.length} test məhsulu yaradıldı`);
    return createdProducts;
  } catch (error) {
    console.error('❌ Məhsul yaratma xətası:', error);
    return [];
  }
}

// 📊 STEP 5: Statistika göstər
async function showStatistics() {
  try {
    console.log('\n📊 === YENİ DATABASE STATISTICS ===');
    
    const totalCategories = await Category.countDocuments();
    const totalProducts = await Product.countDocuments();
    const rootCategories = await Category.countDocuments({ parent: null });
    const subCategories = await Category.countDocuments({ parent: { $ne: null } });
    const activeProducts = await Product.countDocuments({ status: 'active' });
    
    console.log(`📁 Ümumi kategoriyalar: ${totalCategories}`);
    console.log(`   ├─ Əsas kategoriyalar: ${rootCategories}`);
    console.log(`   └─ Alt kategoriyalar: ${subCategories}`);
    console.log(`📦 Ümumi məhsullar: ${totalProducts}`);
    console.log(`   └─ Aktiv məhsullar: ${activeProducts}`);
    
    // Kategoriya və məhsul əlaqələrini yoxla
    console.log('\n🔗 Kategoriya-Məhsul əlaqələri:');
    const categories = await Category.find().sort({ sortOrder: 1 });
    
    for (let category of categories) {
      const productCount = await Product.countDocuments({ 
        category: category._id,
        status: 'active' 
      });
      
      const indent = category.parent ? '   ↳ ' : '';
      console.log(`${indent}${category.icon} ${category.name}: ${productCount} məhsul`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Statistika xətası:', error);
    return false;
  }
}

// 🚀 MAIN FUNCTION: Hər şeyi işə sal
async function cleanAndResetDatabase() {
  try {
    console.log('🚀 === DATABASE RESET BAŞLADI ===\n');
    
    // Step 1: Təmizlə
    const cleaned = await cleanDatabase();
    if (!cleaned) {
      throw new Error('Database təmizlənmədi');
    }
    
    console.log('');
    
    // Step 2: Əsas kategoriyalar
    const categories = await createTestCategories();
    if (categories.length === 0) {
      throw new Error('Kategoriyalar yaradılmadı');
    }
    
    console.log('');
    
    // Step 3: Alt kategoriyalar
    const subCategoriesCreated = await createSubCategories(categories);
    if (!subCategoriesCreated) {
      console.warn('⚠️ Alt kategoriyalar yaradılmadı');
    }
    
    console.log('');
    
    // Step 4: Test məhsulları
    const products = await createTestProducts();
    if (products.length === 0) {
      console.warn('⚠️ Test məhsulları yaradılmadı');
    }
    
    console.log('');
    
    // Step 5: Statistika
    await showStatistics();
    
    console.log('\n🎉 === DATABASE RESET TAMAMLANDI ===');
    console.log('✅ Database yenidən quruldu və test məlumatları əlavə edildi!');
    console.log('🔗 İndi admin panelində kategoriyalar görünməlidir.');
    
  } catch (error) {
    console.error('❌ === DATABASE RESET UĞURSUZ ===');
    console.error('Xəta:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database bağlantısı bağlandı');
    process.exit(0);
  }
}

// Script-i işə sal
if (require.main === module) {
  cleanAndResetDatabase();
}

module.exports = { cleanAndResetDatabase };