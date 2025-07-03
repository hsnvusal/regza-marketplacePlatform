// scripts/deleteProducts.js - Bütün məhsulları sil
const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Product = require('../models/Product');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/regza');

// Bütün məhsulları sil
async function deleteAllProducts() {
  try {
    console.log('🗑️  === MƏHSUL SİLMƏ BAŞLADI ===\n');
    
    // Mövcud məhsul sayını göstər
    const totalProducts = await Product.countDocuments();
    console.log(`📦 Mövcud məhsul sayı: ${totalProducts}`);
    
    if (totalProducts === 0) {
      console.log('✅ Heç bir məhsul yoxdur, silməyə ehtiyac yoxdur.');
      return 0;
    }
    
    // Təsdiq
    console.log('⚠️  XƏBƏRDARLIQ: Bütün məhsullar silinəcək!');
    console.log('⏳ 3 saniyə gözləyin...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Kategoriyalar üzrə məhsul sayını göstər
    const productsByCategory = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $group: {
          _id: '$categoryInfo.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('📊 Kategoriyadakı məhsul sayları:');
    productsByCategory.forEach(item => {
      console.log(`   ${item._id}: ${item.count} məhsul`);
    });
    console.log('');
    
    // Məhsulları sil
    console.log('🗑️  Məhsullar silinir...');
    const deleteResult = await Product.deleteMany({});
    console.log(`✅ ${deleteResult.deletedCount} məhsul silindi.\n`);
    
    // Kategoriyaların məhsul sayını sıfırla
    console.log('🔄 Kategoriyaların məhsul sayları yenilənir...');
    const updateResult = await Category.updateMany({}, { productCount: 0 });
    console.log(`✅ ${updateResult.modifiedCount} kateqoriyanın məhsul sayı sıfırlandı.\n`);
    
    // Yoxlama
    const remainingProducts = await Product.countDocuments();
    console.log(`🔍 Qalan məhsul sayı: ${remainingProducts}`);
    
    if (remainingProducts === 0) {
      console.log('🎉 Bütün məhsullar uğurla silindi!');
    } else {
      console.log(`⚠️  ${remainingProducts} məhsul hələ də qalıb.`);
    }
    
    return deleteResult.deletedCount;
    
  } catch (error) {
    console.error('❌ Məhsul silmə xətası:', error);
    return 0;
  }
}

// Yalnız spesifik kategoriya məhsullarını sil
async function deleteProductsByCategory(categoryName) {
  try {
    console.log(`🗑️  "${categoryName}" kategoriyasının məhsulları silinir...\n`);
    
    // Kategoriyani tap
    const category = await Category.findOne({ name: categoryName });
    
    if (!category) {
      console.log(`❌ "${categoryName}" kategoriyası tapılmadı.`);
      return 0;
    }
    
    // Kategoriya məhsul sayını göstər
    const productCount = await Product.countDocuments({ category: category._id });
    console.log(`📦 "${categoryName}" kategoriyasında ${productCount} məhsul var.`);
    
    if (productCount === 0) {
      console.log('✅ Bu kategoriyada məhsul yoxdur.');
      return 0;
    }
    
    // Məhsulları sil
    const deleteResult = await Product.deleteMany({ category: category._id });
    console.log(`✅ ${deleteResult.deletedCount} məhsul silindi.`);
    
    // Kategoriya məhsul sayını yenilə
    await Category.findByIdAndUpdate(category._id, { productCount: 0 });
    console.log(`✅ Kategoriya məhsul sayı yeniləndi.\n`);
    
    return deleteResult.deletedCount;
    
  } catch (error) {
    console.error('❌ Kategoriya məhsul silmə xətası:', error);
    return 0;
  }
}

// Spesifik brendin məhsullarını sil
async function deleteProductsByBrand(brandName) {
  try {
    console.log(`🗑️  "${brandName}" brendinin məhsulları silinir...\n`);
    
    // Brend məhsul sayını göstər
    const productCount = await Product.countDocuments({ 
      brand: { $regex: new RegExp(brandName, 'i') } 
    });
    console.log(`📦 "${brandName}" brendində ${productCount} məhsul var.`);
    
    if (productCount === 0) {
      console.log('✅ Bu brenddə məhsul yoxdur.');
      return 0;
    }
    
    // Məhsulları sil
    const deleteResult = await Product.deleteMany({ 
      brand: { $regex: new RegExp(brandName, 'i') } 
    });
    console.log(`✅ ${deleteResult.deletedCount} məhsul silindi.\n`);
    
    return deleteResult.deletedCount;
    
  } catch (error) {
    console.error('❌ Brend məhsul silmə xətası:', error);
    return 0;
  }
}

// Keçərsiz məhsulları sil (şəkili olmayan, yalnış məlumat və s.)
async function deleteInvalidProducts() {
  try {
    console.log('🗑️  Keçərsiz məhsullar silinir...\n');
    
    let totalDeleted = 0;
    
    // Şəkili olmayan məhsullar
    const noImageCount = await Product.countDocuments({
      $or: [
        { images: { $size: 0 } },
        { images: { $exists: false } },
        { mainImage: { $exists: false } },
        { mainImage: null }
      ]
    });
    
    if (noImageCount > 0) {
      console.log(`📷 ${noImageCount} şəkilsiz məhsul tapıldı...`);
      const result1 = await Product.deleteMany({
        $or: [
          { images: { $size: 0 } },
          { images: { $exists: false } },
          { mainImage: { $exists: false } },
          { mainImage: null }
        ]
      });
      console.log(`✅ ${result1.deletedCount} şəkilsiz məhsul silindi.`);
      totalDeleted += result1.deletedCount;
    }
    
    // Qiyməti olmayan məhsullar
    const noPriceCount = await Product.countDocuments({
      $or: [
        { 'pricing.sellingPrice': { $lte: 0 } },
        { 'pricing.sellingPrice': { $exists: false } },
        { finalPrice: { $lte: 0 } },
        { finalPrice: { $exists: false } }
      ]
    });
    
    if (noPriceCount > 0) {
      console.log(`💰 ${noPriceCount} qiymətsiz məhsul tapıldı...`);
      const result2 = await Product.deleteMany({
        $or: [
          { 'pricing.sellingPrice': { $lte: 0 } },
          { 'pricing.sellingPrice': { $exists: false } },
          { finalPrice: { $lte: 0 } },
          { finalPrice: { $exists: false } }
        ]
      });
      console.log(`✅ ${result2.deletedCount} qiymətsiz məhsul silindi.`);
      totalDeleted += result2.deletedCount;
    }
    
    // Kategoriyası olmayan məhsullar
    const noCategoryCount = await Product.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });
    
    if (noCategoryCount > 0) {
      console.log(`📂 ${noCategoryCount} kategoriyasız məhsul tapıldı...`);
      const result3 = await Product.deleteMany({
        $or: [
          { category: { $exists: false } },
          { category: null }
        ]
      });
      console.log(`✅ ${result3.deletedCount} kategoriyasız məhsul silindi.`);
      totalDeleted += result3.deletedCount;
    }
    
    if (totalDeleted === 0) {
      console.log('✅ Keçərsiz məhsul tapılmadı.');
    } else {
      console.log(`🎉 Ümumi ${totalDeleted} keçərsiz məhsul silindi.`);
    }
    
    return totalDeleted;
    
  } catch (error) {
    console.error('❌ Keçərsiz məhsul silmə xətası:', error);
    return 0;
  }
}

// Database statistikası göstər
async function showDatabaseStats() {
  try {
    console.log('\n📊 === DATABASE STATISTICS ===');
    
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'active' });
    const featuredProducts = await Product.countDocuments({ featured: true });
    
    console.log(`📁 Ümumi kategoriyalar: ${totalCategories}`);
    console.log(`📦 Ümumi məhsullar: ${totalProducts}`);
    console.log(`   ├─ Aktiv məhsullar: ${activeProducts}`);
    console.log(`   └─ Featured məhsullar: ${featuredProducts}`);
    
    if (totalProducts > 0) {
      // Kategoriyalar üzrə bölüşdürülmə
      console.log('\n📊 Kategoriyalar üzrə bölüşdürülmə:');
      const categoryStats = await Product.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$categoryInfo.name',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      categoryStats.forEach(item => {
        const categoryName = item._id || 'Kategoriyasız';
        console.log(`   ${categoryName}: ${item.count} məhsul`);
      });
      
      // Brendlər üzrə bölüşdürülmə
      console.log('\n🏷️ Top brendlər:');
      const brandStats = await Product.aggregate([
        {
          $group: {
            _id: '$brand',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ]);
      
      brandStats.forEach(item => {
        const brandName = item._id || 'Brendsiz';
        console.log(`   ${brandName}: ${item.count} məhsul`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Statistika xətası:', error);
    return false;
  }
}

// Ana funksiya
async function main() {
  try {
    const command = process.argv[2];
    const parameter = process.argv[3];
    
    if (!command) {
      console.log('📖 İstifadə qaydası:');
      console.log('   node scripts/deleteProducts.js all          - Bütün məhsulları sil');
      console.log('   node scripts/deleteProducts.js category "Telefonlar"  - Kategoriya məhsullarını sil');
      console.log('   node scripts/deleteProducts.js brand "Apple"     - Brend məhsullarını sil');
      console.log('   node scripts/deleteProducts.js invalid       - Keçərsiz məhsulları sil');
      console.log('   node scripts/deleteProducts.js stats         - Statistika göstər');
      return;
    }
    
    let deletedCount = 0;
    
    switch (command) {
      case 'all':
        deletedCount = await deleteAllProducts();
        break;
        
      case 'category':
        if (!parameter) {
          console.log('❌ Kategoriya adı lazımdır: node scripts/deleteProducts.js category "Telefonlar"');
          return;
        }
        deletedCount = await deleteProductsByCategory(parameter);
        break;
        
      case 'brand':
        if (!parameter) {
          console.log('❌ Brend adı lazımdır: node scripts/deleteProducts.js brand "Apple"');
          return;
        }
        deletedCount = await deleteProductsByBrand(parameter);
        break;
        
      case 'invalid':
        deletedCount = await deleteInvalidProducts();
        break;
        
      case 'stats':
        await showDatabaseStats();
        break;
        
      default:
        console.log('❌ Naməlum əmr. İstifadə qaydası üçün əmr olmadan işə salın.');
        break;
    }
    
    if (command !== 'stats') {
      await showDatabaseStats();
      
      if (deletedCount > 0) {
        console.log(`\n🎉 Əməliyyat tamamlandı: ${deletedCount} məhsul silindi.`);
        console.log('✅ İndi təmiz məhsullar əlavə edə bilərsiniz.');
      } else {
        console.log('\n💡 Heç bir məhsul silinmədi.');
      }
    }
    
  } catch (error) {
    console.error('❌ === SİLMƏ ƏMƏLİYYATI UĞURSUZ ===');
    console.error('Xəta:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database bağlantısı bağlandı');
    process.exit(0);
  }
}

// Script-i işə sal
if (require.main === module) {
  main();
}

module.exports = {
  deleteAllProducts,
  deleteProductsByCategory,
  deleteProductsByBrand,
  deleteInvalidProducts,
  showDatabaseStats
};