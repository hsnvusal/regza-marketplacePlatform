import api from './api';

class ProductService {
  // Get all products with filters and pagination
  async getProducts(params = {}) {
    try {
      console.log('ProductService: Getting products with params:', params);

      // Build query string
      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Map frontend sort values to backend values
          if (key === 'sortBy') {
            const sortMapping = {
              'newest': 'createdAt_desc',
              'oldest': 'createdAt_asc', 
              'priceAsc': 'price_asc',
              'priceDesc': 'price_desc',
              'ratingDesc': 'rating_desc',
              'popular': 'views_desc',
              'name': 'name_asc'
            };
            const backendSort = sortMapping[value] || value;
            queryParams.append('sortBy', backendSort);
            console.log(`🔄 Sort mapping: ${value} -> ${backendSort}`);
          } else {
            queryParams.append(key, value);
          }
        }
      });

      const queryString = queryParams.toString();
      const url = `/products${queryString ? `?${queryString}` : ''}`;

      console.log('ProductService: Making request to:', url);

      const response = await api.get(url);

      console.log('ProductService: Products response:', response);

      // Handle different response structures
      let products = [];
      let pagination = {
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0,
        hasNext: false,
        hasPrev: false
      };

      if (response.data) {
        // If response.data is array (direct products)
        if (Array.isArray(response.data)) {
          products = response.data;
          pagination.totalProducts = products.length;
        }
        // If response.data has products property
        else if (response.data.products) {
          products = response.data.products;
          if (response.data.pagination) {
            pagination = { ...pagination, ...response.data.pagination };
          }
        }
        // If response.data is object with pagination
        else if (response.data.data) {
          products = response.data.data;
          if (response.data.pagination) {
            pagination = { ...pagination, ...response.data.pagination };
          }
        }
      }

      return {
        success: true,
        data: {
          products: products,
          pagination: pagination
        },
        message: 'Məhsullar uğurla yükləndi'
      };

    } catch (error) {
      console.error('ProductService: Error getting products:', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Məhsullar yüklənərkən xəta baş verdi',
        data: { 
          products: [], 
          pagination: { 
            currentPage: 1, 
            totalPages: 0, 
            totalProducts: 0,
            hasNext: false,
            hasPrev: false
          } 
        }
      };
    }
  }

  // Get single product by ID
  // ProductService.js-də getProductById metodunu bu ilə əvəz et:

// Get single product by ID
// ProductService.js-də getProductById metodunu bu ilə əvəz et:

// Get single product by ID
// ProductService.js-də getProductById metodunu bu ilə əvəz et:

// Get single product by ID
async getProductById(productId) {
  try {
    console.log('ProductService: Getting product by ID:', productId);
    console.log('ProductService: Product ID type:', typeof productId);

    if (!productId) {
      throw new Error('Product ID is required');
    }

    // Clean the product ID (remove any whitespace)
    const cleanId = productId.toString().trim();
    console.log('ProductService: Clean ID:', cleanId);

    const url = `/products/${cleanId}`;
    console.log('ProductService: Making request to:', url);

    const response = await api.get(url);

    console.log('ProductService: Raw response:', response);
    console.log('ProductService: Response data:', response.data);
    console.log('ProductService: Response status:', response.status);

    // Handle different response structures - be very flexible
    let productData = null;

    if (response.data) {
      // Backend specific: { success: true, data: { product: {...}, relatedProducts: [...] } }
      if (response.data.success && response.data.data && response.data.data.product) {
        productData = response.data.data.product;
        console.log('ProductService: Found data in response.data.data.product (backend format)');
      }
      // Standard success response: { success: true, data: {...} }
      else if (response.data.success && response.data.data) {
        productData = response.data.data;
        console.log('ProductService: Found data in response.data.data');
      } 
      // Response with product key: { product: {...} }
      else if (response.data.product) {
        productData = response.data.product;
        console.log('ProductService: Found data in response.data.product');
      } 
      // Direct product object: { _id: ..., name: ..., ... }
      else if (response.data._id) {
        productData = response.data;
        console.log('ProductService: Found data in response.data (direct)');
      } 
      // Nested data: { data: { _id: ..., name: ..., ... } }
      else if (response.data.data && response.data.data._id) {
        productData = response.data.data;
        console.log('ProductService: Found data in response.data.data (nested)');
      } 
      // Array response: [{ _id: ..., name: ..., ... }]
      else if (Array.isArray(response.data) && response.data.length > 0) {
        productData = response.data[0];
        console.log('ProductService: Found data in response.data[0] (array)');
      } 
      // Try to use response.data directly
      else {
        productData = response.data;
        console.log('ProductService: Using response.data as product (fallback)');
      }
    }

    console.log('ProductService: Processed product data:', productData);
    console.log('ProductService: Product data type:', typeof productData);
    console.log('ProductService: Product data keys:', productData ? Object.keys(productData) : 'null');

    // ENHANCED: Better validation and normalization
    if (productData && typeof productData === 'object') {
      // For backend that returns both product and relatedProducts
      let finalProductData = productData;
      let relatedProductsData = null;
      
      // If response contains both product and relatedProducts (like our backend)
      if (response.data.success && response.data.data) {
        const responseData = response.data.data;
        if (responseData.product) {
          finalProductData = responseData.product;
          relatedProductsData = responseData.relatedProducts || [];
        }
      }
      
      // Return the original product data with minimal normalization
      // Don't override existing data unless it's missing
      const normalizedProduct = {
        // Keep original structure first
        ...finalProductData,
        
        // Only add fallbacks for truly missing essential fields
        _id: finalProductData._id || finalProductData.id || cleanId,
        name: finalProductData.name || finalProductData.title || 'Məhsul adı yoxdur',
        
        // Don't override existing pricing structure
        ...(finalProductData.pricing ? {} : {
          pricing: {
            sellingPrice: finalProductData.price || finalProductData.sellingPrice || 0,
            originalPrice: finalProductData.originalPrice || 0,
            discountPercentage: finalProductData.discountPercentage || 0
          }
        }),
        
        // Don't override existing ratings structure  
        ...(finalProductData.ratings ? {} : {
          ratings: {
            average: finalProductData.rating || 0,
            count: finalProductData.reviewCount || 0
          }
        }),
        
        // Add related products if available
        ...(relatedProductsData ? { relatedProducts: relatedProductsData } : {})
      };

      console.log('ProductService: Normalized product:', normalizedProduct);
      console.log('ProductService: Final product ID:', normalizedProduct._id);
      console.log('ProductService: Final product name:', normalizedProduct.name);
      console.log('ProductService: Final product pricing:', normalizedProduct.pricing);
      console.log('ProductService: Related products count:', relatedProductsData?.length || 0);

      return {
        success: true,
        data: normalizedProduct,
        message: 'Məhsul məlumatları yükləndi'
      };
    } else {
      console.error('ProductService: Invalid product data structure:', productData);
      throw new Error('Məhsul məlumatları düzgün formatda deyil');
    }

  } catch (error) {
    console.error('ProductService: Error getting product:', error);
    console.error('ProductService: Error response:', error.response?.data);
    console.error('ProductService: Error status:', error.response?.status);
    console.error('ProductService: Error message:', error.message);

    let errorMessage = 'Məhsul məlumatları yüklənərkən xəta baş verdi';

    if (error.response?.status === 404) {
      errorMessage = 'Məhsul tapılmadı';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server xətası baş verdi';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      data: null
    };
  }
}

  // Search products
  async searchProducts(searchTerm, filters = {}) {
    try {
      console.log('ProductService: Searching products:', searchTerm, filters);

      const params = {
        search: searchTerm,
        ...filters
      };

      return await this.getProducts(params);

    } catch (error) {
      console.error('ProductService: Error searching products:', error);

      return {
        success: false,
        error: error.message || 'Məhsul axtarışında xəta baş verdi',
        data: { products: [], pagination: { currentPage: 1, totalPages: 0, totalProducts: 0 } }
      };
    }
  }

  // Get categories - disable to prevent errors
  async getCategories() {
    console.log('ProductService: getCategories called but disabled to prevent errors');
    return {
      success: false,
      error: 'Categories endpoint not available',
      data: []
    };
    
    /*
    try {
      console.log('ProductService: Getting categories');

      const response = await api.get('/categories');

      console.log('ProductService: Categories response:', response);

      return {
        success: true,
        data: response.data?.categories || response.data || [],
        message: 'Kateqoriyalar yükləndi'
      };

    } catch (error) {
      console.error('ProductService: Error getting categories:', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Kateqoriyalar yüklənərkən xəta baş verdi',
        data: []
      };
    }
    */
  }

  // Get vendors/stores - disable to prevent errors
  async getVendors() {
    console.log('ProductService: getVendors called but disabled to prevent errors');
    return {
      success: false,
      error: 'Vendors endpoint not available',
      data: []
    };
    
    /*
    try {
      console.log('ProductService: Getting vendors');

      const response = await api.get('/vendors');

      console.log('ProductService: Vendors response:', response);

      return {
        success: true,
        data: response.data?.vendors || response.data || [],
        message: 'Mağazalar yükləndi'
      };

    } catch (error) {
      console.error('ProductService: Error getting vendors:', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Mağazalar yüklənərkən xəta baş verdi',
        data: []
      };
    }
    */
  }

  // Get featured products
  async getFeaturedProducts(limit = 10) {
    try {
      console.log('ProductService: Getting featured products');

      const params = {
        featured: true,
        limit: limit,
        status: 'active'
      };

      return await this.getProducts(params);

    } catch (error) {
      console.error('ProductService: Error getting featured products:', error);

      return {
        success: false,
        error: error.message || 'Seçilmiş məhsullar yüklənərkən xəta baş verdi',
        data: { products: [], pagination: { currentPage: 1, totalPages: 0, totalProducts: 0 } }
      };
    }
  }

  // Get products by category
  async getProductsByCategory(categoryId, params = {}) {
    try {
      console.log('ProductService: Getting products by category:', categoryId);

      const queryParams = {
        category: categoryId,
        ...params
      };

      return await this.getProducts(queryParams);

    } catch (error) {
      console.error('ProductService: Error getting products by category:', error);

      return {
        success: false,
        error: error.message || 'Kateqoriya məhsulları yüklənərkən xəta baş verdi',
        data: { products: [], pagination: { currentPage: 1, totalPages: 0, totalProducts: 0 } }
      };
    }
  }

  // Get products by vendor
  async getProductsByVendor(vendorId, params = {}) {
    try {
      console.log('ProductService: Getting products by vendor:', vendorId);

      const queryParams = {
        vendor: vendorId,
        ...params
      };

      return await this.getProducts(queryParams);

    } catch (error) {
      console.error('ProductService: Error getting products by vendor:', error);

      return {
        success: false,
        error: error.message || 'Mağaza məhsulları yüklənərkən xəta baş verdi',
        data: { products: [], pagination: { currentPage: 1, totalPages: 0, totalProducts: 0 } }
      };
    }
  }

  // Get product reviews
  async getProductReviews(productId, params = {}) {
    try {
      console.log('ProductService: Getting product reviews:', productId);

      const queryParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const url = `/products/${productId}/reviews${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(url);

      return {
        success: true,
        data: response.data || { reviews: [] },
        message: 'Rəylər yükləndi'
      };

    } catch (error) {
      console.warn('ProductService: Reviews endpoint not available:', error.response?.status);

      // Return empty reviews instead of error for 404
      if (error.response?.status === 404) {
        return {
          success: true,
          data: { reviews: [] },
          message: 'Rəylər mövcud deyil'
        };
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Rəylər yüklənərkən xəta baş verdi',
        data: { reviews: [] }
      };
    }
  }

  // Add product review (requires authentication)
  async addProductReview(productId, reviewData) {
    try {
      console.log('ProductService: Adding product review:', productId, reviewData);

      if (!productId) {
        throw new Error('Product ID is required');
      }

      if (!reviewData.rating || !reviewData.comment) {
        throw new Error('Rating və rəy mətni tələb olunur');
      }

      const response = await api.post(`/products/${productId}/reviews`, reviewData);

      return {
        success: true,
        data: response.data,
        message: 'Rəyiniz uğurla əlavə edildi'
      };

    } catch (error) {
      console.error('ProductService: Error adding product review:', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Rəy əlavə edilərkən xəta baş verdi',
        data: null
      };
    }
  }

  // Get related products
  async getRelatedProducts(productId, limit = 6) {
    try {
      console.log('ProductService: Getting related products:', productId);

      const response = await api.get(`/products/${productId}/related?limit=${limit}`);

      return {
        success: true,
        data: response.data || { products: [] },
        message: 'Oxşar məhsullar yükləndi'
      };

    } catch (error) {
      console.warn('ProductService: Related products endpoint not available:', error.response?.status);

      // Return empty products instead of error for 404
      if (error.response?.status === 404) {
        return {
          success: true,
          data: { products: [] },
          message: 'Oxşar məhsullar mövcud deyil'
        };
      }

      return {
        success: false,
        error: error.message || 'Oxşar məhsullar yüklənərkən xəta baş verdi',
        data: { products: [] }
      };
    }
  }

  // Check product availability
  async checkProductAvailability(productId, quantity = 1) {
    try {
      console.log('ProductService: Checking product availability:', productId, quantity);

      const response = await api.get(`/products/${productId}/availability?quantity=${quantity}`);

      return {
        success: true,
        data: response.data,
        message: 'Məhsul mövcudluğu yoxlanıldı'
      };

    } catch (error) {
      console.error('ProductService: Error checking product availability:', error);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Məhsul mövcudluğu yoxlanarkən xəta baş verdi',
        data: { available: false, stock: 0 }
      };
    }
  }

  // Get product variants (sizes, colors, etc.)
  async getProductVariants(productId) {
    try {
      console.log('ProductService: Getting product variants:', productId);

      const response = await api.get(`/products/${productId}/variants`);

      return {
        success: true,
        data: response.data,
        message: 'Məhsul variantları yükləndi'
      };

    } catch (error) {
      console.error('ProductService: Error getting product variants:', error);

      return {
        success: false,
        error: error.message || 'Məhsul variantları yüklənərkən xəta baş verdi',
        data: { variants: [] }
      };
    }
  }

  // Get price history for a product
  async getProductPriceHistory(productId, days = 30) {
    try {
      console.log('ProductService: Getting product price history:', productId);

      const response = await api.get(`/products/${productId}/price-history?days=${days}`);

      return {
        success: true,
        data: response.data,
        message: 'Qiymət tarixi yükləndi'
      };

    } catch (error) {
      console.error('ProductService: Error getting product price history:', error);

      return {
        success: false,
        error: error.message || 'Qiymət tarixi yüklənərkən xəta baş verdi',
        data: { priceHistory: [] }
      };
    }
  }
}

// Create and export singleton instance
const productService = new ProductService();
export default productService;