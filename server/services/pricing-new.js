// AI INFLUENCER STUDIO - UPDATED PRICING TIERS
// Based on competitor analysis and Fanvue earnings data

const FEE_RATE = 0.06; // Stripe/payment processing fee
const FEE_MULTIPLIER = 2.5;
const MARKUP = FEE_RATE * FEE_MULTIPLIER; // 0.15 = 15%

// NEW PRICING STRUCTURE - March 2026
const BASE_PRICES = {
  // Main AI Influencer Studio Tiers
  creator_starter: 49,      // SFW only, 1 creator, TikTok/Instagram
  fanvue_pro: 197,          // 3 creators, adult content, full Fanvue pipeline
  fanvue_empire: 497,       // 10 creators, whale management, white-label
  dfy_setup: 2500,          // Done For You - one-time setup
  dfy_monthly: 997,         // Done For You - monthly management
  
  // UGC & Ad Video Services
  ugc_single: 97,           // Single UGC video (15-30 sec)
  ugc_pack_5: 397,          // 5 UGC videos
  ugc_pack_10: 697,         // 10 UGC videos
  ugc_retainer: 597,        // Monthly retainer (8 videos)
  ad_video_30: 297,         // 30 sec ad video
  ad_video_60: 497,         // 60 sec ad video
  ad_variations: 797,       // 3 ad variations (A/B/C test)
  ad_retainer: 997,         // Monthly ad retainer (4 ads)
  
  // Add-ons
  addon_whatsapp: 19,
  addon_phone: 29,
  addon_extra_creator: 49,  // Add 1 more creator to any tier
  
  // Legacy/GlowX
  glowx_creator: 49,
  restoration_fee: 97,
};

const applyMarkup = (price) => Math.ceil(price * (1 + MARKUP));

const PRICES = Object.fromEntries(
  Object.entries(BASE_PRICES).map(([k, v]) => [k, applyMarkup(v)])
);

const getPriceWithMarkup = (basePrice) => ({
  base: basePrice,
  markup_amount: Math.ceil(basePrice * MARKUP),
  customer_pays: applyMarkup(basePrice),
  fee_covered: Math.ceil(basePrice * FEE_RATE),
  your_profit_on_fees: Math.ceil(basePrice * MARKUP) - Math.ceil(basePrice * FEE_RATE),
});

// Tier Features
const TIER_FEATURES = {
  creator_starter: {
    name: 'Creator Starter',
    price: BASE_PRICES.creator_starter,
    creators: 1,
    posts_per_month: 30,
    content_type: 'SFW',
    platforms: ['TikTok', 'Instagram'],
    fanvue_pipeline: false,
    adult_content: false,
    ai_dm: false,
    analytics: 'basic',
    support: 'email',
    target_earnings: '$500-900/mo',
  },
  fanvue_pro: {
    name: 'Fanvue Pro',
    price: BASE_PRICES.fanvue_pro,
    creators: 3,
    posts_per_month: 'unlimited',
    content_type: 'SFW + Adult',
    platforms: ['TikTok', 'Instagram', 'Fanvue', 'OnlyFans'],
    fanvue_pipeline: true,
    adult_content: true,
    ai_dm: true,
    ppv_calendar: true,
    viral_scorer: true,
    voice_cloning: true,
    analytics: 'advanced',
    support: 'priority',
    target_earnings: '$3,000-5,000/mo',
  },
  fanvue_empire: {
    name: 'Fanvue Empire',
    price: BASE_PRICES.fanvue_empire,
    creators: 10,
    posts_per_month: 'unlimited',
    content_type: 'SFW + Adult',
    platforms: ['TikTok', 'Instagram', 'Fanvue', 'OnlyFans', 'GlowX'],
    fanvue_pipeline: true,
    adult_content: true,
    ai_dm: true,
    ppv_calendar: true,
    viral_scorer: true,
    voice_cloning: true,
    whale_management: true,
    brand_deal_finder: true,
    character_consistency: true,
    white_label: true,
    dedicated_manager: true,
    analytics: 'enterprise',
    support: 'dedicated',
    target_earnings: '$10,000-18,000/mo',
  },
  dfy: {
    name: 'Done For You',
    setup_fee: BASE_PRICES.dfy_setup,
    monthly_fee: BASE_PRICES.dfy_monthly,
    creators: 29,
    posts_per_month: 'unlimited',
    content_type: 'SFW + Adult',
    platforms: ['All'],
    fully_managed: true,
    monthly_calls: true,
    revenue_split_available: true,
    target_earnings: '$30,000-60,000/mo',
  },
};

// Payout rates for GlowX platform
const PAYOUT_CREATOR = 0.90;  // 90% to creator (vs Fanvue's 85%)
const PAYOUT_PLATFORM = 0.10; // 10% to GLOWX

module.exports = {
  PRICES,
  BASE_PRICES,
  TIER_FEATURES,
  MARKUP,
  FEE_RATE,
  applyMarkup,
  getPriceWithMarkup,
  PAYOUT_CREATOR,
  PAYOUT_PLATFORM,
};
