// Feature flags and configuration
export const FEATURES = {
  ENABLE_PRO_FEATURES: import.meta.env.VITE_ENABLE_PRO_FEATURES === 'true',
  PRO_GARDEN_THRESHOLD: 64, // Square feet threshold for pro features
  STRIPE_PRICE: 15.00,      // Price in USD
} as const;