export const FEATURES = {
  STRIPE_ENABLED: false,
  REWARDS_ENABLED: true,
  UNMATCHED_VEHICLE_ALERTS: true,
} as const;

export type Feature = keyof typeof FEATURES;

// Type helper for feature checks
export type FeaturePath = keyof typeof FEATURES | 'PAYMENTS.STRIPE_ENABLED' | 'PAYMENTS.CASH_ENABLED' | 'NOTIFICATIONS.EMAIL_ENABLED' | 'NOTIFICATIONS.SMS_ENABLED' | 'REWARDS.ENABLED';

/**
 * Check if a feature is enabled
 * @param path - Dot notation path to feature flag
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(path: FeaturePath): boolean {
  const parts = path.split('.');
  let current: any = FEATURES;
  
  for (const part of parts) {
    if (current[part] === undefined) return false;
    current = current[part];
  }
  
  return !!current;
} 