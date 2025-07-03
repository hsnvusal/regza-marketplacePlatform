// scripts/addProductsWithFixedImages.js - CORS problemi olmayan şəkillər
const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Product = require('../models/Product');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/regza');

// CORS problemi olmayan şəkil URL-ləri
const getProductImages = (category, productName) => {
  const imageMap = {
    // Elektronika şəkilləri - Picsum və digər CORS-free mənbələr
    'iPhone 15 Pro': [
      'https://picsum.photos/400/400?random=1',
      'https://picsum.photos/400/400?random=2'
    ],
    'Samsung Galaxy S24': [
      'https://picsum.photos/400/400?random=3',
      'https://picsum.photos/400/400?random=4'
    ],
    'MacBook Air M2': [
      'https://picsum.photos/400/400?random=5',
      'https://picsum.photos/400/400?random=6'
    ],
    'Dell XPS 13': [
      'https://picsum.photos/400/400?random=7',
      'https://picsum.photos/400/400?random=8'
    ],
    'iPad Pro': [
      'https://picsum.photos/400/400?random=9',
      'https://picsum.photos/400/400?random=10'
    ],
    'AirPods Pro': [
      'https://picsum.photos/400/400?random=11',
      'https://picsum.photos/400/400?random=12'
    ],
    'Sony WH-1000XM4': [
      'https://picsum.photos/400/400?random=13',
      'https://picsum.photos/400/400?random=14'
    ],
    'Canon EOS R5': [
      'https://picsum.photos/400/400?random=15',
      'https://picsum.photos/400/400?random=16'
    ],
    'Apple Watch Series 9': [
      'https://picsum.photos/400/400?random=17',
      'https://picsum.photos/400/400?random=18'
    ],
    'Gaming Mouse': [
      'https://picsum.photos/400/400?random=19',
      'https://picsum.photos/400/400?random=20'
    ],
    
    // Geyim şəkilləri
    'Nike Air Force 1': [
      'https://picsum.photos/400/400?random=21',
      'https://picsum.photos/400/400?random=22'
    ],
    'Adidas Ultraboost': [
      'https://picsum.photos/400/400?random=23',
      'https://picsum.photos/400/400?random=24'
    ],
    'Levi\'s 501 Jeans': [
      'https://picsum.photos/400/400?random=25',
      'https://picsum.photos/400/400?random=26'
    ],
    'H&M Basic T-Shirt': [
      'https://picsum.photos/400/400?random=27',
      'https://picsum.photos/400/400?random=28'
    ],
    'Zara Formal Shirt': [
      'https://picsum.photos/400/400?random=29',
      'https://picsum.photos/400/400?random=30'
    ],
    'Puma Hoodie': [
      'https://picsum.photos/400/400?random=31',
      'https://picsum.photos/400/400?random=32'
    ],
    'Calvin Klein Dress': [
      'https://picsum.photos/400/400?random=33',
      'https://picsum.photos/400/400?random=34'
    ],
    'Gucci Handbag': [
      'https://picsum.photos/400/400?random=35',
      'https://picsum.photos/400/400?random=36'
    ],
    'Ray-Ban Sunglasses': [
      'https://picsum.photos/400/400?random=37',
      'https://picsum.photos/400/400?random=38'
    ],
    'Casio Watch': [
      'https://picsum.photos/400/400?random=39',
      'https://picsum.photos/400/400?random=40'
    ],
    
    // Ev və Bağ şəkilləri
    'IKEA Sofa': [
      'https://picsum.photos/400/400?random=41',
      'https://picsum.photos/400/400?random=42'
    ],
    'Dining Table': [
      'https://picsum.photos/400/400?random=43',
      'https://picsum.photos/400/400?random=44'
    ],
    'Office Chair': [
      'https://picsum.photos/400/400?random=45',
      'https://picsum.photos/400/400?random=46'
    ],
    'Kitchen Mixer': [
      'https://picsum.photos/400/400?random=47',
      'https://picsum.photos/400/400?random=48'
    ],
    'Coffee Machine': [
      'https://picsum.photos/400/400?random=49',
      'https://picsum.photos/400/400?random=50'
    ],
    'Garden Tools Set': [
      'https://picsum.photos/400/400?random=51',
      'https://picsum.photos/400/400?random=52'
    ],
    'LED Table Lamp': [
      'https://picsum.photos/400/400?random=53',
      'https://picsum.photos/400/400?random=54'
    ],
    'Vacuum Cleaner': [
      'https://picsum.photos/400/400?random=55',
      'https://picsum.photos/400/400?random=56'
    ],
    'Air Purifier': [
      'https://picsum.photos/400/400?random=57',
      'https://picsum.photos/400/400?random=58'
    ],
    'Plant Pot': [
      'https://picsum.photos/400/400?random=59',
      'https://picsum.photos/400/400?random=60'
    ],
    
    // Kitab şəkilləri
    'JavaScript Guide': [
      'https://picsum.photos/400/400?random=61',
      'https://picsum.photos/400/400?random=62'
    ],
    'Python Programming': [
      'https://picsum.photos/400/400?random=63',
      'https://picsum.photos/400/400?random=64'
    ],
    'Design Patterns': [
      'https://picsum.photos/400/400?random=65',
      'https://picsum.photos/400/400?random=66'
    ],
    'Clean Code': [
      'https://picsum.photos/400/400?random=67',
      'https://picsum.photos/400/400?random=68'
    ],
    'React Cookbook': [
      'https://picsum.photos/400/400?random=69',
      'https://picsum.photos/400/400?random=70'
    ],
    'Node.js Handbook': [
      'https://picsum.photos/400/400?random=71',
      'https://picsum.photos/400/400?random=72'
    ],
    'CSS Secrets': [
      'https://picsum.photos/400/400?random=73',
      'https://picsum.photos/400/400?random=74'
    ],
    'Vue.js Guide': [
      'https://picsum.photos/400/400?random=75',
      'https://picsum.photos/400/400?random=76'
    ],
    'TypeScript Deep Dive': [
      'https://picsum.photos/400/400?random=77',
      'https://picsum.photos/400/400?random=78'
    ],
    'GraphQL Learning': [
      'https://picsum.photos/400/400?random=79',
      'https://picsum.photos/400/400?random=80'
    ],
    
    // İdman şəkilləri
    'Yoga Mat': [
      'https://picsum.photos/400/400?random=81',
      'https://picsum.photos/400/400?random=82'
    ],
    'Dumbbells Set': [
      'https://picsum.photos/400/400?random=83',
      'https://picsum.photos/400/400?random=84'
    ],
    'Soccer Ball': [
      'https://picsum.photos/400/400?random=85',
      'https://picsum.photos/400/400?random=86'
    ],
    'Basketball': [
      'https://picsum.photos/400/400?random=87',
      'https://picsum.photos/400/400?random=88'
    ],
    'Tennis Racket': [
      'https://picsum.photos/400/400?random=89',
      'https://picsum.photos/400/400?random=90'
    ],
    'Running Shoes': [
      'https://picsum.photos/400/400?random=91',
      'https://picsum.photos/400/400?random=92'
    ],
    'Fitness Tracker': [
      'https://picsum.photos/400/400?random=93',
      'https://picsum.photos/400/400?random=94'
    ],
    'Protein Powder': [
      'https://picsum.photos/400/400?random=95',
      'https://picsum.photos/400/400?random=96'
    ],
    'Water Bottle': [
      'https://picsum.photos/400/400?random=97',
      'https://picsum.photos/400/400?random=98'
    ],
    'Gym Bag': [
      'https://picsum.photos/400/400?random=99',
      'https://picsum.photos/400/400?random=100'
    ]
  };
  
  // Əgər spesifik məhsul tapılmazsa, random şəkillər
  if (imageMap[productName]) {
    return imageMap[productName];
  }
  
  // Default kategoriya şəkilləri
  const randomBase = Math.floor(Math.random() * 1000);
  return [
    `https://picsum.photos/400/400?random=${randomBase}`,
    `https://picsum.photos/400/400?random=${randomBase + 1}`
  ];
};

// Alternativ şəkil mənbələri (əgər Picsum da işləməzsə)
const getAlternativeImages = (category, productName) => {
  const randomBase = Math.floor(Math.random() * 1000);
  
  return [
    `https://via.placeholder.com/400x400/667eea/ffffff?text=${encodeURIComponent(productName.substring(0, 15))}`,
    `https://via.placeholder.com/400x400/764ba2/ffffff?text=${encodeURIComponent(productName.substring(0, 15))}`
  ];
};

// Həqiqi e-commerce şəkil CDN-ləri (təkliflər)
const getEcommerceImages = (category, productName) => {
  const categories = {
    'Telefonlar': [
      'https://cdn.shopify.com/s/files/1/0057/8938/4802/products/iphone-15-pro_400x400.jpg',
      'https://m.media-amazon.com/images/I/71v2jVOaSSL._AC_SX400_.jpg'
    ],
    'Kompüterlər': [
      'https://cdn.shopify.com/s/files/1/0057/8938/4802/products/macbook-air-m2_400x400.jpg',
      'https://m.media-amazon.com/images/I/71abc123def._AC_SX400_.jpg'
    ],
    'default': [
      `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`,
      `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`
    ]
  };
  
  return categories[category] || categories['default'];
};

// Həm də lokal placeholder şəkillər (backend-də saxlayacağınız)
const getLocalPlaceholderImages = (category, productName) => {
  const baseUrl = 'http://localhost:5000/uploads/placeholders'; // Backend URL-niz
  
  const categories = {
    'Telefonlar': [
      `${baseUrl}/phone-placeholder-1.jpg`,
      `${baseUrl}/phone-placeholder-2.jpg`
    ],
    'Kompüterlər': [
      `${baseUrl}/laptop-placeholder-1.jpg`,
      `${baseUrl}/laptop-placeholder-2.jpg`
    ],
    'Aksesuarlar': [
      `${baseUrl}/accessory-placeholder-1.jpg`,
      `${baseUrl}/accessory-placeholder-2.jpg`
    ],
    'Geyim': [
      `${baseUrl}/clothing-placeholder-1.jpg`,
      `${baseUrl}/clothing-placeholder-2.jpg`
    ],
    'default': [
      `${baseUrl}/default-placeholder-1.jpg`,
      `${baseUrl}/default-placeholder-2.jpg`
    ]
  };
  
  return categories[category] || categories['default'];
};

// Ana məhsul məlumatları (öncəki ilə eyni)
const productsByCategory = {
  'Telefonlar': [
    {
      name: 'iPhone 15 Pro',
      description: 'Apple iPhone 15 Pro 128GB Deep Purple. A17 Pro çip, titanium dizayn, pro kamera sistemi.',
      shortDescription: 'Apple iPhone 15 Pro 128GB - A17 Pro çip və pro kamera sistemi.',
      brand: 'Apple',
      pricing: { costPrice: 800, sellingPrice: 1299, discountPrice: 1199 },
      inventory: { stock: 25, lowStockThreshold: 5 }
    },
    {
      name: 'Samsung Galaxy S24',
      description: 'Samsung Galaxy S24 Ultra 256GB. S Pen dəstəyi, 200MP kamera, 120Hz ekran.',
      shortDescription: 'Samsung Galaxy S24 Ultra 256GB - S Pen və 200MP kamera.',
      brand: 'Samsung',
      pricing: { costPrice: 700, sellingPrice: 1199, discountPrice: 1099 },
      inventory: { stock: 30, lowStockThreshold: 5 }
    },
    {
      name: 'iPhone 14',
      description: 'Apple iPhone 14 128GB. A15 Bionic çip, çift kamera sistemi, 6.1 inch ekran.',
      shortDescription: 'Apple iPhone 14 128GB - A15 Bionic çip və çift kamera.',
      brand: 'Apple',
      pricing: { costPrice: 600, sellingPrice: 999, discountPrice: 899 },
      inventory: { stock: 40, lowStockThreshold: 8 }
    },
    {
      name: 'Google Pixel 8',
      description: 'Google Pixel 8 128GB. Google Tensor G3, AI funksiyaları, pure Android təcrübəsi.',
      shortDescription: 'Google Pixel 8 128GB - Tensor G3 və AI funksiyaları.',
      brand: 'Google',
      pricing: { costPrice: 500, sellingPrice: 799, discountPrice: 729 },
      inventory: { stock: 20, lowStockThreshold: 5 }
    },
    {
      name: 'OnePlus 12',
      description: 'OnePlus 12 256GB. Snapdragon 8 Gen 3, 120Hz AMOLED, sürətli şarj.',
      shortDescription: 'OnePlus 12 256GB - Snapdragon 8 Gen 3 və sürətli şarj.',
      brand: 'OnePlus',
      pricing: { costPrice: 550, sellingPrice: 849, discountPrice: 799 },
      inventory: { stock: 15, lowStockThreshold: 3 }
    },
    {
      name: 'Xiaomi 14 Pro',
      description: 'Xiaomi 14 Pro 512GB. Leica kamera, Snapdragon 8 Gen 3, premium dizayn.',
      shortDescription: 'Xiaomi 14 Pro 512GB - Leica kamera və premium dizayn.',
      brand: 'Xiaomi',
      pricing: { costPrice: 480, sellingPrice: 749, discountPrice: 699 },
      inventory: { stock: 35, lowStockThreshold: 7 }
    },
    {
      name: 'Sony Xperia 1 V',
      description: 'Sony Xperia 1 V 256GB. 4K HDR OLED, professional kamera, gaming performance.',
      shortDescription: 'Sony Xperia 1 V 256GB - 4K OLED və professional kamera.',
      brand: 'Sony',
      pricing: { costPrice: 700, sellingPrice: 1099, discountPrice: 999 },
      inventory: { stock: 12, lowStockThreshold: 3 }
    },
    {
      name: 'Nothing Phone (2)',
      description: 'Nothing Phone (2) 256GB. Unikal dizayn, Glyph interface, clean Android.',
      shortDescription: 'Nothing Phone (2) 256GB - Glyph interface və unikal dizayn.',
      brand: 'Nothing',
      pricing: { costPrice: 400, sellingPrice: 649, discountPrice: 599 },
      inventory: { stock: 25, lowStockThreshold: 5 }
    },
    {
      name: 'Motorola Edge 40',
      description: 'Motorola Edge 40 256GB. Curved OLED ekran, 68W sürətli şarj, clean UI.',
      shortDescription: 'Motorola Edge 40 256GB - Curved OLED və sürətli şarj.',
      brand: 'Motorola',
      pricing: { costPrice: 350, sellingPrice: 549, discountPrice: 499 },
      inventory: { stock: 30, lowStockThreshold: 6 }
    },
    {
      name: 'OPPO Find X6',
      description: 'OPPO Find X6 Pro 512GB. Hasselblad kamera, Snapdragon 8 Gen 2, premium build.',
      shortDescription: 'OPPO Find X6 Pro 512GB - Hasselblad kamera və premium build.',
      brand: 'OPPO',
      pricing: { costPrice: 600, sellingPrice: 949, discountPrice: 849 },
      inventory: { stock: 18, lowStockThreshold: 4 }
    }
  ],
  
  'Kompüterlər': [
    {
      name: 'MacBook Air M2',
      description: 'Apple MacBook Air 13" M2 çip, 8GB RAM, 256GB SSD. Fanless dizayn, bütün gün batareya.',
      shortDescription: 'MacBook Air 13" M2 - 8GB RAM, fanless dizayn.',
      brand: 'Apple',
      pricing: { costPrice: 1000, sellingPrice: 1599, discountPrice: 1499 },
      inventory: { stock: 15, lowStockThreshold: 3 }
    },
    {
      name: 'Dell XPS 13',
      description: 'Dell XPS 13 Plus Intel i7, 16GB RAM, 512GB SSD. Premium dizayn, 4K ekran.',
      shortDescription: 'Dell XPS 13 Plus - Intel i7, 16GB RAM, 4K ekran.',
      brand: 'Dell',
      pricing: { costPrice: 900, sellingPrice: 1399, discountPrice: 1299 },
      inventory: { stock: 20, lowStockThreshold: 4 }
    }
  ],
  
  'Aksesuarlar': [
    {
      name: 'AirPods Pro',
      description: 'Apple AirPods Pro 2nd Gen. Active noise cancellation, spatial audio, MagSafe case.',
      shortDescription: 'AirPods Pro 2nd Gen - Active noise cancellation.',
      brand: 'Apple',
      pricing: { costPrice: 150, sellingPrice: 249, discountPrice: 229 },
      inventory: { stock: 50, lowStockThreshold: 10 }
    },
    {
      name: 'Sony WH-1000XM4',
      description: 'Sony WH-1000XM4 Wireless Headphones. Industry-leading noise cancellation.',
      shortDescription: 'Sony WH-1000XM4 - Industry-leading noise cancellation.',
      brand: 'Sony',
      pricing: { costPrice: 200, sellingPrice: 349, discountPrice: 299 },
      inventory: { stock: 30, lowStockThreshold: 6 }
    }
  ]
};

// Məhsul yaratma funksiyası (eyni məntiqlə)
async function addProductsToCategories() {
  try {
    console.log('📦 CORS problemi olmayan şəkillərlə məhsullar əlavə edilir...\n');
    
    let totalCreated = 0;
    
    for (const [categoryName, products] of Object.entries(productsByCategory)) {
      console.log(`📂 ${categoryName} kategoriyası işlənir...`);
      
      const category = await Category.findOne({ name: categoryName });
      
      if (!category) {
        console.log(`   ❌ Kategoriya tapılmadı: ${categoryName}`);
        continue;
      }
      
      let categoryProductCount = 0;
      
      for (const productData of products) {
        try {
          const existingProduct = await Product.findOne({ 
            name: productData.name,
            category: category._id 
          });
          
          if (existingProduct) {
            console.log(`   ⚠️  ${productData.name} artıq mövcuddur, keçilir...`);
            continue;
          }
          
          const sku = productData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10) + 
                     Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          
          const baseSlug = productData.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
          
          let slug = baseSlug;
          let slugCounter = 1;
          while (await Product.findOne({ slug: slug })) {
            slug = `${baseSlug}-${slugCounter}`;
            slugCounter++;
          }
          
          // Bir neçə şəkil mənbəyi sınaq et
          let imageUrls;
          try {
            imageUrls = getProductImages(categoryName, productData.name);
          } catch (error) {
            console.log(`   ⚠️  Picsum şəkilləri ilə problem, alternative istifadə edilir...`);
            imageUrls = getAlternativeImages(categoryName, productData.name);
          }
          
          const images = imageUrls.map((url, index) => ({
            url: url,
            alt: `${productData.name} ${index + 1}`,
            isMain: index === 0,
            order: index
          }));
          
          const hasDiscount = productData.pricing.discountPrice && 
                             productData.pricing.discountPrice < productData.pricing.sellingPrice;
          
          const finalPrice = hasDiscount ? 
                           productData.pricing.discountPrice : 
                           productData.pricing.sellingPrice;
          
          const discountPercentage = hasDiscount ? 
            Math.round(((productData.pricing.sellingPrice - productData.pricing.discountPrice) / 
                       productData.pricing.sellingPrice) * 100) : 0;
          
          const ratingsCount = Math.floor(Math.random() * 100) + 10;
          const ratingsAverage = (Math.random() * 2 + 3).toFixed(1);
          
          const product = await Product.create({
            name: productData.name,
            slug: slug,
            description: productData.description,
            shortDescription: productData.shortDescription || productData.description.substring(0, 100) + '...',
            category: category._id,
            brand: productData.brand,
            sku: sku,
            
            pricing: {
              costPrice: productData.pricing.costPrice,
              sellingPrice: productData.pricing.sellingPrice,
              discountPrice: hasDiscount ? productData.pricing.discountPrice : null,
              currency: 'AZN',
              taxRate: 0
            },
            
            finalPrice: finalPrice,
            discountPercentage: discountPercentage,
            
            inventory: {
              stock: productData.inventory.stock,
              lowStockThreshold: productData.inventory.lowStockThreshold,
              trackQuantity: true,
              allowBackorder: false
            },
            
            isInStock: productData.inventory.stock > 0,
            images: images,
            mainImage: images[0]?.url,
            
            status: 'active',
            featured: Math.random() > 0.7,
            newArrival: Math.random() > 0.8,
            
            ratings: {
              average: parseFloat(ratingsAverage),
              count: ratingsCount,
              breakdown: {
                5: Math.floor(ratingsCount * 0.6),
                4: Math.floor(ratingsCount * 0.25),
                3: Math.floor(ratingsCount * 0.1),
                2: Math.floor(ratingsCount * 0.03),
                1: Math.floor(ratingsCount * 0.02)
              }
            },
            
            stats: {
              views: Math.floor(Math.random() * 1000),
              purchases: Math.floor(Math.random() * 50),
              wishlisted: Math.floor(Math.random() * 20)
            },
            
            tags: [
              categoryName.toLowerCase(), 
              productData.brand.toLowerCase(),
              'yeni',
              'populyar'
            ],
            
            seo: {
              metaTitle: `${productData.name} - ${productData.brand} | Regza Shop`,
              metaDescription: (productData.shortDescription || productData.description).substring(0, 150) + '...',
              metaKeywords: [
                productData.name, 
                productData.brand, 
                categoryName,
                'alış-veriş',
                'online mağaza'
              ]
            },
            
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`   ✅ ${product.name} (${product.sku}) - ${images.length} şəkil əlavə edildi`);
          categoryProductCount++;
          totalCreated++;
          
        } catch (productError) {
          console.log(`   ❌ Məhsul yaradıla bilmədi: ${productData.name}`);
          console.log(`      Xəta: ${productError.message}`);
        }
      }
      
      try {
        await Category.findByIdAndUpdate(category._id, {
          productCount: await Product.countDocuments({ 
            category: category._id, 
            status: 'active' 
          })
        });
      } catch (error) {
        console.log(`   ⚠️  Kategoriya məhsul sayı yenilənə bilmədi: ${error.message}`);
      }
      
      console.log(`   📊 ${categoryName}: ${categoryProductCount} məhsul əlavə edildi\n`);
    }
    
    console.log(`🎉 Ümumi ${totalCreated} məhsul əlavə edildi!`);
    return totalCreated;
    
  } catch (error) {
    console.error('❌ Məhsul əlavə etmə xətası:', error);
    return 0;
  }
}

// Ana funksiya
async function main() {
  try {
    console.log('🚀 === CORS PROBLEMI OLMAYAN ŞƏKİLLƏRLƏ MƏHSUL ƏLAVƏ ETMƏ ===\n');
    
    const productsCreated = await addProductsToCategories();
    
    if (productsCreated > 0) {
      console.log('\n🎉 === MƏHSUL ƏLAVƏ ETMƏ TAMAMLANDI ===');
      console.log(`✅ ${productsCreated} məhsul CORS problemi olmayan şəkillərlə əlavə edildi!`);
      console.log('🔗 İndi frontend-də şəkillər düzgün göstərilməlidir.');
      console.log('📱 Picsum.photos və ya placeholder şəkillər istifadə edildi.');
    } else {
      console.log('❌ Heç bir məhsul əlavə edilmədi!');
    }
    
  } catch (error) {
    console.error('❌ === MƏHSUL ƏLAVƏ ETMƏ UĞURSUZ ===');
    console.error('Xəta:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database bağlantısı bağlandı');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { addProductsToCategories, getProductImages, getAlternativeImages };