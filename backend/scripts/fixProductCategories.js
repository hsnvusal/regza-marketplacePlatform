const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const MONGO_URI = 'mongodb+srv://hsnvusal:vusal361@regza-cluster.hyvyjmr.mongodb.net/marketplace-pro?retryWrites=true&w=majority'; // öz bağlantını yaz

async function migrateCategories() {
  await mongoose.connect(MONGO_URI);

  const products = await Product.find({ category: { $type: 'string' } });

  for (const product of products) {
    const categoryName = product.category;
    if (!categoryName || typeof categoryName !== 'string') {
      console.log(`⚠️  Product ${product.name} has no valid string category, skipping...`);
      continue;
    }
    // Tap category-ni həm name, həm də slug ilə yoxla
    const category = await Category.findOne({ 
      $or: [
        { name: categoryName },
        { slug: categoryName.toLowerCase() }
      ]
    });

    if (category) {
      product.category = category._id;
      product.categoryLegacy = categoryName;
      await product.save();
      console.log(`✅ Migrated product ${product.name} to category ${category.name}`);
    } else {
      console.log(`❌ Category not found for product ${product.name}: ${categoryName}`);
    }
  }

  await mongoose.disconnect();
  console.log('Migration finished!');
}

migrateCategories();