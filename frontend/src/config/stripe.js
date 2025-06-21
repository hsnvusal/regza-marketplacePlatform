// src/config/stripe.js - VİTE ÜÇÜN DÜZƏLDİLMİŞ
const stripeConfig = {
  // 🔧 Vite environment variables (import.meta.env)
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  
  // API base URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  
  // Default currency
  defaultCurrency: 'usd',
  
  // Stripe appearance
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#635BFF',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px'
    }
  }
};

// Environment validation for Vite
const validateConfig = () => {
  console.log('🔧 Vite Stripe Config Validation:');
  console.log('  - Publishable Key:', stripeConfig.publishableKey ? '✅ Loaded' : '❌ Missing');
  console.log('  - API Base URL:', stripeConfig.apiBaseUrl);
  console.log('  - Environment Mode:', import.meta.env.MODE);
  console.log('  - Dev Mode:', import.meta.env.DEV);
  
  // Debug all Vite environment variables
  console.log('🔍 All Vite Environment Variables:');
  console.log('  - VITE_STRIPE_PUBLISHABLE_KEY:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Found ✅' : 'Missing ❌');
  console.log('  - VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL ? 'Found ✅' : 'Missing ❌');
  console.log('  - VITE_APP_NAME:', import.meta.env.VITE_APP_NAME ? 'Found ✅' : 'Missing ❌');
  
  if (!stripeConfig.publishableKey) {
    console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY is missing in .env file!');
    console.error('📝 Add this to your .env file:');
    console.error('VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here');
    return false;
  }
  
  if (!stripeConfig.publishableKey.startsWith('pk_test_')) {
    console.warn('⚠️ Make sure you are using TEST keys (pk_test_...)');
  }
  
  return true;
};

// Validate on import
validateConfig();

export default stripeConfig;