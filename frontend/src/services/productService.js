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

      console.log('ProductService: Product response:', response);
      console.log('ProductService: Response data:', response.data);

      // Handle different response structures
      let productData = null;

      if (response.data) {
        if (response.data.success && response.data.data) {
          productData = response.data.data;
        } else if (response.data.product) {
          productData = response.data.product;
        } else if (response.data._id) {
          productData = response.data;
        } else if (response.data.data && response.data.data._id) {
          productData = response.data.data;
        }
      }

      console.log('ProductService: Processed product data:', productData);

      if (productData && productData._id) {
        return {
          success: true,
          data: productData,
          message: 'Məhsul məlumatları yükləndi'
        };
      } else {
        throw new Error('Məhsul məlumatları düzgün formatda deyil');
      }

    } catch (error) {
      console.error('ProductService: Error getting product:', error);
      console.error('ProductService: Error response:', error.response?.data);
      console.error('ProductService: Error status:', error.response?.status);

      let errorMessage = 'Məhsul məlumatları yüklənərkən xəta baş verdi';

      if (error.response?.status === 404) {
        errorMessage = 'Məhsul tapılmadı';
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