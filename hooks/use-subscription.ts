/**
 * Hook for managing user subscription state.
 * Fetches active subscription from server and provides helpers.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./use-auth";
import { trpc } from "@/lib/trpc";
import {
  PlanId,
  PlanFeature,
  hasFeature,
  getPlan,
  getPlanLabel,
  DEFAULT_SUBSCRIPTION,
  UserSubscription,
} from "@/lib/subscription";

const SUBSCRIPTION_CACHE_KEY = "gusha_subscription";

/**
 * Hook to manage subscription state.
 * Fetches from server for authenticated users, falls back to local cache.
 */
export function useSubscription() {
  const { isAuthenticated, user } = useAuth({});
  const [localSub, setLocalSub] = useState<UserSubscription>(DEFAULT_SUBSCRIPTION);

  // Fetch active subscription from server
  const activeQuery = trpc.subscription.active.useQuery(undefined, {
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
  });

  // Purchase mutation
  const purchaseMutation = trpc.subscription.purchase.useMutation({
    onSuccess: () => {
      activeQuery.refetch();
    },
  });

  // Cancel mutation
  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      activeQuery.refetch();
    },
  });

  // Restore mutation
  const restoreMutation = trpc.subscription.restore.useMutation();

  // Determine current plan from server data or local cache
  const currentPlan: PlanId = useMemo(() => {
    if (activeQuery.data) {
      return activeQuery.data.planId as PlanId;
    }
    return localSub.planId;
  }, [activeQuery.data, localSub.planId]);

  const subscription: UserSubscription = useMemo(() => {
    if (activeQuery.data) {
      return {
        planId: activeQuery.data.planId as PlanId,
        startedAt: activeQuery.data.startedAt?.toISOString?.() ?? new Date().toISOString(),
        expiresAt: activeQuery.data.expiresAt?.toISOString?.() ?? null,
        autoRenew: activeQuery.data.autoRenew === "true",
        pricingDuration: activeQuery.data.duration,
      };
    }
    return localSub;
  }, [activeQuery.data, localSub]);

  // Load cached subscription on mount
  useEffect(() => {
    AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY).then((data) => {
      if (data) {
        try {
          setLocalSub(JSON.parse(data));
        } catch {}
      }
    });
  }, []);

  // Cache subscription when it changes
  useEffect(() => {
    if (subscription.planId !== "free") {
      AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscription));
    }
  }, [subscription]);

  /**
   * Check if the current plan has a specific feature.
   */
  const checkFeature = useCallback(
    (feature: PlanFeature): boolean => {
      // During open beta, all features are unlocked
      // Remove this line when ready to enforce subscriptions
      // return true;
      return hasFeature(currentPlan, feature);
    },
    [currentPlan]
  );

  /**
   * Purchase a subscription.
   * On native devices, this would trigger Apple/Google IAP.
   * On web/demo, it creates a server-side subscription directly.
   */
  const purchase = useCallback(
    async (params: {
      planId: "plus" | "premium";
      duration: "1_week" | "1_month" | "3_months" | "12_months";
      productId: string;
    }) => {
      const store =
        Platform.OS === "ios"
          ? "apple"
          : Platform.OS === "android"
            ? "google"
            : "web";

      // In production on native, you would:
      // 1. Call expo-iap to initiate purchase
      // 2. Get receipt/transaction from store
      // 3. Send receipt to server for validation
      // 4. Server validates and creates subscription
      //
      // For now (web/demo), we create the subscription directly:
      const result = await purchaseMutation.mutateAsync({
        planId: params.planId,
        duration: params.duration,
        store: store as "apple" | "google" | "web",
        productId: params.productId,
        transactionId: `demo_${Date.now()}`,
      });

      // Update local cache
      const newSub: UserSubscription = {
        planId: params.planId,
        startedAt: new Date().toISOString(),
        expiresAt: result.expiresAt,
        autoRenew: true,
        pricingDuration: params.duration,
      };
      setLocalSub(newSub);
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(newSub));

      return result;
    },
    [purchaseMutation]
  );

  /**
   * Cancel the current subscription.
   */
  const cancel = useCallback(async () => {
    const result = await cancelMutation.mutateAsync();
    setLocalSub((prev) => ({ ...prev, autoRenew: false }));
    return result;
  }, [cancelMutation]);

  /**
   * Restore a previous subscription (e.g., after reinstall).
   */
  const restore = useCallback(async () => {
    const result = await restoreMutation.mutateAsync();
    if (result) {
      const restoredSub: UserSubscription = {
        planId: result.planId,
        startedAt: new Date().toISOString(),
        expiresAt: result.expiresAt,
        autoRenew: true,
        pricingDuration: result.duration,
      };
      setLocalSub(restoredSub);
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(restoredSub));
    }
    return result;
  }, [restoreMutation]);

  return {
    /** Current plan ID */
    currentPlan,
    /** Full subscription details */
    subscription,
    /** Whether the user has an active paid subscription */
    isSubscribed: currentPlan !== "free",
    /** Whether the user has Plus tier */
    isPlus: currentPlan === "plus" || currentPlan === "premium",
    /** Whether the user has Premium tier */
    isPremium: currentPlan === "premium",
    /** Check if a specific feature is available */
    hasFeature: checkFeature,
    /** Plan display label */
    planLabel: getPlanLabel(currentPlan),
    /** Purchase a subscription */
    purchase,
    /** Cancel current subscription */
    cancel,
    /** Restore a previous subscription */
    restore,
    /** Loading state */
    isLoading: activeQuery.isLoading,
    /** Purchase in progress */
    isPurchasing: purchaseMutation.isPending,
    /** Error from last operation */
    error: activeQuery.error || purchaseMutation.error || cancelMutation.error,
  };
}
