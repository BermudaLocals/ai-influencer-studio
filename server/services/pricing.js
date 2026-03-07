// AI Influencer Studio - Premium Pricing Tiers
// Updated: March 2026

const PRICING_TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 149, // $149/month (was $49)
    setupFee: 0,
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
    price: 297, // $297/month (was $197)
    setupFee: 0,
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
    price: 597, // $597/month (was $497)
    setupFee: 0,
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
    price: 1097, // $1,097/month (was $997)
    setupFee: 3500, // $3,500 setup (was $2,500)
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

// Revenue calculations
const calculateRevenue = (customers) => {
  const distribution = {
    starter: Math.floor(customers * 0.4),
    professional: Math.floor(customers * 0.4),
    agency: Math.floor(customers * 0.16),
    enterprise: Math.floor(customers * 0.04)
  };
  
  const monthly = 
    (distribution.starter * PRICING_TIERS.starter.price) +
    (distribution.professional * PRICING_TIERS.professional.price) +
    (distribution.agency * PRICING_TIERS.agency.price) +
    (distribution.enterprise * PRICING_TIERS.enterprise.price);
  
  const setupFees = distribution.enterprise * PRICING_TIERS.enterprise.setupFee;
  
  return {
    monthly,
    annual: monthly * 12,
    setupFees,
    firstYear: (monthly * 12) + setupFees,
    distribution
  };
};

module.exports = {
  PRICING_TIERS,
  calculateRevenue
};
