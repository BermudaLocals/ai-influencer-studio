// AI Influencer Studio - Premium Pricing Tiers
// Multi-Currency Support: USD (USA) & GBP (UK)
// Updated: March 2026

const PRICING_TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    pricing: {
      USD: { price: 189, setupFee: 0, symbol: '$' },  // USA
      GBP: { price: 149, setupFee: 0, symbol: '£' }   // UK
    },
    features: {
      influencers: 1,
      postsPerDay: 3,
      platforms: ['TikTok', 'Instagram'],
      analytics: 'basic',
      support: 'email',
      aiVoice: true,
      aiFace: true,
      autoPosting: true,
      dmAutomation: false,
      brandDeals: false,
      whaleManagement: false,
      apiAccess: false,
      whiteLabel: false
    },
    limits: {
      videoMinutes: 30,
      storage: '10GB',
      apiCalls: 1000
    }
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    pricing: {
      USD: { price: 377, setupFee: 0, symbol: '$' },  // USA
      GBP: { price: 297, setupFee: 0, symbol: '£' }   // UK
    },
    features: {
      influencers: 5,
      postsPerDay: 9,
      platforms: ['TikTok', 'Instagram', 'Fanvue', 'OnlyFans'],
      analytics: 'advanced',
      support: 'priority',
      aiVoice: true,
      aiFace: true,
      autoPosting: true,
      dmAutomation: true,
      brandDeals: true,
      whaleManagement: true,
      apiAccess: false,
      whiteLabel: false
    },
    limits: {
      videoMinutes: 100,
      storage: '50GB',
      apiCalls: 5000
    }
  },
  
  agency: {
    id: 'agency',
    name: 'Agency',
    pricing: {
      USD: { price: 757, setupFee: 0, symbol: '$' },  // USA
      GBP: { price: 597, setupFee: 0, symbol: '£' }   // UK
    },
    features: {
      influencers: 20,
      postsPerDay: 'unlimited',
      platforms: ['All platforms'],
      analytics: 'enterprise',
      support: 'dedicated',
      aiVoice: true,
      aiFace: true,
      autoPosting: true,
      dmAutomation: true,
      brandDeals: true,
      whaleManagement: true,
      apiAccess: true,
      whiteLabel: true
    },
    limits: {
      videoMinutes: 500,
      storage: '500GB',
      apiCalls: 50000
    }
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    pricing: {
      USD: { price: 1393, setupFee: 4445, symbol: '$' },  // USA
      GBP: { price: 1097, setupFee: 3500, symbol: '£' }   // UK
    },
    features: {
      influencers: 'unlimited',
      postsPerDay: 'unlimited',
      platforms: ['All platforms + Custom'],
      analytics: 'custom',
      support: '24/7 dedicated',
      aiVoice: true,
      aiFace: true,
      autoPosting: true,
      dmAutomation: true,
      brandDeals: true,
      whaleManagement: true,
      apiAccess: true,
      whiteLabel: true,
      customFeatures: true,
      onPremise: true,
      customIntegrations: true
    },
    limits: {
      videoMinutes: 'unlimited',
      storage: 'unlimited',
      apiCalls: 'unlimited'
    }
  }
};

// Get pricing for specific currency
const getPricing = (tier, currency = 'USD') => {
  const tierData = PRICING_TIERS[tier];
  if (!tierData) return null;
  
  const pricing = tierData.pricing[currency] || tierData.pricing.USD;
  return {
    ...tierData,
    price: pricing.price,
    setupFee: pricing.setupFee,
    currency: currency,
    symbol: pricing.symbol
  };
};

// Revenue calculations for both markets
const calculateRevenue = (customers, currency = 'USD') => {
  const distribution = {
    starter: Math.floor(customers * 0.4),
    professional: Math.floor(customers * 0.4),
    agency: Math.floor(customers * 0.16),
    enterprise: Math.floor(customers * 0.04)
  };
  
  const monthly = 
    (distribution.starter * PRICING_TIERS.starter.pricing[currency].price) +
    (distribution.professional * PRICING_TIERS.professional.pricing[currency].price) +
    (distribution.agency * PRICING_TIERS.agency.pricing[currency].price) +
    (distribution.enterprise * PRICING_TIERS.enterprise.pricing[currency].price);
  
  const setupFees = distribution.enterprise * PRICING_TIERS.enterprise.pricing[currency].setupFee;
  
  return {
    monthly,
    annual: monthly * 12,
    setupFees,
    firstYear: (monthly * 12) + setupFees,
    distribution,
    currency,
    symbol: PRICING_TIERS.starter.pricing[currency].symbol
  };
};

// Detect currency from country code
const detectCurrency = (countryCode) => {
  const gbpCountries = ['GB', 'UK', 'IM', 'JE', 'GG']; // UK territories
  return gbpCountries.includes(countryCode?.toUpperCase()) ? 'GBP' : 'USD';
};

module.exports = {
  PRICING_TIERS,
  getPricing,
  calculateRevenue,
  detectCurrency
};
