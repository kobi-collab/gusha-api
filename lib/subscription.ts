/**
 * Subscription Plan Model (Grindr-style tiers)
 *
 * Three tiers: Free, Plus (~$23/mo), Premium (~$45/mo)
 * During open beta, all features are unlocked for free users.
 */

export type PlanId = "free" | "plus" | "premium";

export interface PricingOption {
  duration: "1_week" | "1_month" | "3_months" | "12_months";
  label: string;
  price: number; // USD
  pricePerMonth: number;
  savings?: string; // e.g. "Save 40%"
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  tagline: string;
  pricing: PricingOption[];
  // Limits
  maxProfilesVisible: number; // grid profiles
  maxPhotos: number;
  maxExpiringPhotosPerDay: number;
  // Features
  adFree: boolean;
  readReceipts: boolean;
  savedPhrases: boolean;
  explore: boolean;
  advancedFilters: boolean;
  viewedMe: boolean;
  unsendMessages: boolean;
  incognito: boolean;
  typingStatus: boolean;
  unlimitedProfiles: boolean;
  unlimitedExpiringPhotos: boolean;
  chatTranslation: boolean;
  boost: boolean;
}

export type PlanFeature =
  | "ad_free"
  | "read_receipts"
  | "saved_phrases"
  | "explore"
  | "advanced_filters"
  | "viewed_me"
  | "unsend_messages"
  | "incognito"
  | "typing_status"
  | "unlimited_profiles"
  | "unlimited_expiring_photos"
  | "chat_translation"
  | "boost";

export const PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Get started",
    pricing: [],
    maxProfilesVisible: 18,
    maxPhotos: 6,
    maxExpiringPhotosPerDay: 1,
    adFree: false,
    readReceipts: false,
    savedPhrases: false,
    explore: false,
    advancedFilters: false,
    viewedMe: false,
    unsendMessages: false,
    incognito: false,
    typingStatus: false,
    unlimitedProfiles: false,
    unlimitedExpiringPhotos: false,
    chatTranslation: false,
    boost: false,
  },
  plus: {
    id: "plus",
    name: "Gusha Plus",
    tagline: "More profiles, more connections",
    pricing: [
      { duration: "1_week", label: "1 Week", price: 14.99, pricePerMonth: 59.96 },
      { duration: "1_month", label: "1 Month", price: 22.99, pricePerMonth: 22.99 },
      { duration: "3_months", label: "3 Months", price: 49.99, pricePerMonth: 16.66, savings: "Save 28%" },
      { duration: "12_months", label: "12 Months", price: 149.99, pricePerMonth: 12.50, savings: "Save 46%" },
    ],
    maxProfilesVisible: 500,
    maxPhotos: 6,
    maxExpiringPhotosPerDay: 5,
    adFree: true,
    readReceipts: true,
    savedPhrases: true,
    explore: true,
    advancedFilters: true,
    viewedMe: false,
    unsendMessages: false,
    incognito: false,
    typingStatus: false,
    unlimitedProfiles: false,
    unlimitedExpiringPhotos: false,
    chatTranslation: false,
    boost: false,
  },
  premium: {
    id: "premium",
    name: "Gusha Premium",
    tagline: "The full experience",
    pricing: [
      { duration: "1_week", label: "1 Week", price: 24.99, pricePerMonth: 99.96 },
      { duration: "1_month", label: "1 Month", price: 44.99, pricePerMonth: 44.99 },
      { duration: "3_months", label: "3 Months", price: 89.99, pricePerMonth: 30.00, savings: "Save 33%" },
      { duration: "12_months", label: "12 Months", price: 299.99, pricePerMonth: 25.00, savings: "Save 44%" },
    ],
    maxProfilesVisible: Infinity,
    maxPhotos: 6,
    maxExpiringPhotosPerDay: Infinity,
    adFree: true,
    readReceipts: true,
    savedPhrases: true,
    explore: true,
    advancedFilters: true,
    viewedMe: true,
    unsendMessages: true,
    incognito: true,
    typingStatus: true,
    unlimitedProfiles: true,
    unlimitedExpiringPhotos: true,
    chatTranslation: true,
    boost: true,
  },
};

export interface UserSubscription {
  planId: PlanId;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  pricingDuration?: string;
}

export const DEFAULT_SUBSCRIPTION: UserSubscription = {
  planId: "free",
  startedAt: new Date().toISOString(),
  expiresAt: null,
  autoRenew: false,
};

/** Feature comparison for paywall display */
export interface FeatureComparison {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  premium: string | boolean;
}

export const FEATURE_COMPARISONS: FeatureComparison[] = [
  { label: "Profiles visible", free: "18", plus: "500", premium: "Unlimited" },
  { label: "Ads", free: true, plus: false, premium: false },
  { label: "Expiring photos/day", free: "1", plus: "5", premium: "Unlimited" },
  { label: "Read receipts", free: false, plus: true, premium: true },
  { label: "Saved phrases", free: false, plus: true, premium: true },
  { label: "Explore (global)", free: false, plus: true, premium: true },
  { label: "Advanced filters", free: false, plus: true, premium: true },
  { label: "Viewed Me", free: false, plus: false, premium: true },
  { label: "Unsend messages", free: false, plus: false, premium: true },
  { label: "Incognito mode", free: false, plus: false, premium: true },
  { label: "Typing status", free: false, plus: false, premium: true },
  { label: "Chat translation", free: false, plus: false, premium: true },
];

const FEATURE_TO_PROP: Record<PlanFeature, keyof SubscriptionPlan> = {
  ad_free: "adFree",
  read_receipts: "readReceipts",
  saved_phrases: "savedPhrases",
  explore: "explore",
  advanced_filters: "advancedFilters",
  viewed_me: "viewedMe",
  unsend_messages: "unsendMessages",
  incognito: "incognito",
  typing_status: "typingStatus",
  unlimited_profiles: "unlimitedProfiles",
  unlimited_expiring_photos: "unlimitedExpiringPhotos",
  chat_translation: "chatTranslation",
  boost: "boost",
};

export function hasFeature(planId: PlanId, feature: PlanFeature): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  const prop = FEATURE_TO_PROP[feature];
  if (!prop) return false;
  return plan[prop] === true;
}

export function getPlan(planId: PlanId): SubscriptionPlan {
  return PLANS[planId] ?? PLANS.free;
}

export function getPlanLabel(planId: PlanId): string {
  const plan = PLANS[planId];
  if (!plan) return "Free";
  if (planId === "free") return "Free";
  return plan.name;
}

export function isSubscriptionActive(sub: UserSubscription): boolean {
  if (!sub.expiresAt) return true;
  return new Date(sub.expiresAt) > new Date();
}

/** Get the best monthly price for a plan */
export function getBestPrice(planId: PlanId): number | null {
  const plan = PLANS[planId];
  if (!plan || plan.pricing.length === 0) return null;
  return Math.min(...plan.pricing.map((p) => p.pricePerMonth));
}
