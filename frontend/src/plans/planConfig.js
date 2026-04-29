/**
 * SavageSave Subscription Plans
 * =====================================
 * Defines feature matrix for Free, Pro, and Ultra tiers.
 * Used by UI, enforcement hooks, and Supabase sync.
 */

export const PLAN_IDS = {
  FREE: 'free',
  PRO: 'pro',
  ULTRA: 'ultra',
};

export const PLAN_METADATA = {
  [PLAN_IDS.FREE]: {
    id: PLAN_IDS.FREE,
    name: 'Free Plan',
    shortName: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    badge: 'bg-slate-500/20 text-slate-300',
    accent: 'from-slate-400 to-slate-500',
  },
  [PLAN_IDS.PRO]: {
    id: PLAN_IDS.PRO,
    name: 'Pro Plan',
    shortName: 'Pro',
    priceMonthly: 4.99,
    priceYearly: 49.99,
    badge: 'bg-cyan-500/20 text-cyan-300',
    accent: 'from-cyan-400 to-blue-500',
  },
  [PLAN_IDS.ULTRA]: {
    id: PLAN_IDS.ULTRA,
    name: 'Ultra Plan',
    shortName: 'Ultra',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    badge: 'bg-violet-500/20 text-violet-300',
    accent: 'from-violet-400 to-pink-500',
  },
};

/**
 * Feature matrix per plan.
 * null = unlimited / true / enabled
 * number = hard limit
 * false = disabled
 */
export const PLAN_FEATURES = {
  [PLAN_IDS.FREE]: {
    adsOn: true,
    speedCapMbps: 10,
    maxActiveDownloads: 2,
    queueLimitPerDay: 10,
    unlimitedQueue: false,
    cloudSync: false,
    priorityDownloads: false,
    premiumTools: false,
    multiDevice: false,
    supportLevel: 'community',
  },
  [PLAN_IDS.PRO]: {
    adsOn: false,
    speedCapMbps: null,
    maxActiveDownloads: 5,
    queueLimitPerDay: null,
    unlimitedQueue: true,
    cloudSync: false,
    priorityDownloads: true,
    premiumTools: false,
    multiDevice: true,
    supportLevel: 'email',
  },
  [PLAN_IDS.ULTRA]: {
    adsOn: false,
    speedCapMbps: null,
    maxActiveDownloads: null,
    queueLimitPerDay: null,
    unlimitedQueue: true,
    cloudSync: true,
    priorityDownloads: true,
    premiumTools: true,
    multiDevice: true,
    supportLevel: 'priority',
  },
};

/** Resolve plan ID to full feature set */
export function getPlanFeatures(planId) {
  return PLAN_FEATURES[planId] || PLAN_FEATURES[PLAN_IDS.FREE];
}

/** Resolve plan ID to metadata */
export function getPlanMeta(planId) {
  return PLAN_METADATA[planId] || PLAN_METADATA[PLAN_IDS.FREE];
}

/** Check if a specific feature is available on a given plan */
export function hasFeature(planId, featureKey) {
  const features = getPlanFeatures(planId);
  const val = features[featureKey];
  return val === true || val === null || (typeof val === 'number' && val > 0);
}

/** Get numeric limit for a feature (returns Infinity if unlimited) */
export function getFeatureLimit(planId, featureKey) {
  const features = getPlanFeatures(planId);
  const val = features[featureKey];
  if (val === null || val === true) return Infinity;
  if (typeof val === 'number') return val;
  return 0;
}
