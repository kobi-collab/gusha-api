import { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  PLANS,
  FEATURE_COMPARISONS,
  PlanId,
  PricingOption,
  getBestPrice,
} from "@/lib/subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

type SelectedPlan = "plus" | "premium";

function FeatureRow({
  label,
  free,
  plus,
  premium,
  colors,
}: {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  premium: string | boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const renderValue = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <IconSymbol name="checkmark" size={18} color={colors.success} />
      ) : (
        <Text style={[styles.featureNo, { color: colors.muted }]}>—</Text>
      );
    }
    return <Text style={[styles.featureVal, { color: colors.foreground }]}>{val}</Text>;
  };

  return (
    <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.featureLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.featureValues}>
        <View style={styles.featureCell}>{renderValue(free)}</View>
        <View style={styles.featureCell}>{renderValue(plus)}</View>
        <View style={styles.featureCell}>{renderValue(premium)}</View>
      </View>
    </View>
  );
}

export default function SubscriptionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth({});
  const { purchase, isPurchasing, isSubscribed, currentPlan: activePlan } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("plus");
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // index

  const plan = PLANS[selectedPlan];
  const pricing = plan.pricing;

  const handleSubscribe = async () => {
    const option = pricing[selectedDuration];
    if (!option) return;

    const productId = `gusha.${selectedPlan}.${option.duration}`;

    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to subscribe.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Subscribe",
      `Subscribe to ${plan.name} for $${option.price.toFixed(2)}/${option.label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: async () => {
            try {
              await purchase({
                planId: selectedPlan,
                duration: option.duration,
                productId,
              });
              Alert.alert(
                "Welcome to " + plan.name + "!",
                "Your subscription is now active. Enjoy all the premium features!",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (error) {
              Alert.alert(
                "Purchase Failed",
                "Something went wrong. Please try again.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <IconSymbol name="crown.fill" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Upgrade to Gusha
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Get more profiles, features, and connections
          </Text>
        </View>

        {/* Plan Selector */}
        <View style={styles.planSelector}>
          <Pressable
            onPress={() => setSelectedPlan("plus")}
            style={({ pressed }) => [
              styles.planCard,
              {
                backgroundColor: selectedPlan === "plus" ? colors.primary + "15" : colors.surface,
                borderColor: selectedPlan === "plus" ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.planName, { color: selectedPlan === "plus" ? colors.primary : colors.foreground }]}>
              Plus
            </Text>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>
              From ${getBestPrice("plus")?.toFixed(2)}/mo
            </Text>
            <Text style={[styles.planTag, { color: colors.muted }]}>
              {PLANS.plus.tagline}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedPlan("premium")}
            style={({ pressed }) => [
              styles.planCard,
              {
                backgroundColor: selectedPlan === "premium" ? colors.primary + "15" : colors.surface,
                borderColor: selectedPlan === "premium" ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            {selectedPlan === "premium" && (
              <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
            )}
            <Text style={[styles.planName, { color: selectedPlan === "premium" ? colors.primary : colors.foreground }]}>
              Premium
            </Text>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>
              From ${getBestPrice("premium")?.toFixed(2)}/mo
            </Text>
            <Text style={[styles.planTag, { color: colors.muted }]}>
              {PLANS.premium.tagline}
            </Text>
          </Pressable>
        </View>

        {/* Duration Selector */}
        <View style={styles.durationSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Choose your plan
          </Text>
          {pricing.map((option, idx) => (
            <Pressable
              key={option.duration}
              onPress={() => setSelectedDuration(idx)}
              style={({ pressed }) => [
                styles.durationRow,
                {
                  backgroundColor: idx === selectedDuration ? colors.primary + "10" : colors.surface,
                  borderColor: idx === selectedDuration ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.durationLeft}>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: idx === selectedDuration ? colors.primary : colors.muted },
                  ]}
                >
                  {idx === selectedDuration && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View>
                  <Text style={[styles.durationLabel, { color: colors.foreground }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.durationPerMonth, { color: colors.muted }]}>
                    ${option.pricePerMonth.toFixed(2)}/month
                  </Text>
                </View>
              </View>
              <View style={styles.durationRight}>
                <Text style={[styles.durationPrice, { color: colors.foreground }]}>
                  ${option.price.toFixed(2)}
                </Text>
                {option.savings && (
                  <View style={[styles.savingsBadge, { backgroundColor: colors.success + "20" }]}>
                    <Text style={[styles.savingsText, { color: colors.success }]}>
                      {option.savings}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparisonSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Compare plans
          </Text>
          {/* Column headers */}
          <View style={[styles.featureRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.featureLabel, { color: colors.muted }]}>Feature</Text>
            <View style={styles.featureValues}>
              <View style={styles.featureCell}>
                <Text style={[styles.featureHeader, { color: colors.muted }]}>Free</Text>
              </View>
              <View style={styles.featureCell}>
                <Text style={[styles.featureHeader, { color: colors.primary }]}>Plus</Text>
              </View>
              <View style={styles.featureCell}>
                <Text style={[styles.featureHeader, { color: colors.primary }]}>Premium</Text>
              </View>
            </View>
          </View>
          {FEATURE_COMPARISONS.map((comp) => (
            <FeatureRow
              key={comp.label}
              label={comp.label}
              free={comp.free}
              plus={comp.plus}
              premium={comp.premium}
              colors={colors}
            />
          ))}
        </View>

        {/* Legal text */}
        <Text style={[styles.legalText, { color: colors.muted }]}>
          Payment will be charged to your Apple ID / Google Play account at confirmation of purchase.
          Subscription automatically renews unless auto-renew is turned off at least 24 hours before
          the end of the current period. Your account will be charged for renewal within 24 hours prior
          to the end of the current period. You can manage and cancel your subscriptions in your
          account settings on the App Store / Google Play after purchase.
        </Text>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {isSubscribed && activePlan === selectedPlan ? (
          <View style={[styles.subscribeBtn, { backgroundColor: colors.success }]}>
            <Text style={styles.subscribeBtnText}>Current Plan</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleSubscribe}
            disabled={isPurchasing}
            style={({ pressed }) => [
              styles.subscribeBtn,
              { backgroundColor: isPurchasing ? colors.muted : colors.primary },
              pressed && !isPurchasing && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.subscribeBtnText}>
              {isPurchasing
                ? "Processing..."
                : isSubscribed
                  ? `Upgrade · $${pricing[selectedDuration]?.price.toFixed(2)}`
                  : `Subscribe · $${pricing[selectedDuration]?.price.toFixed(2)}`}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.skipText, { color: colors.muted }]}>
            No thanks
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 6,
    textAlign: "center",
  },
  planSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bestValueBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: "center",
  },
  bestValueText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  planTag: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  durationSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  durationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  durationPerMonth: {
    fontSize: 13,
    marginTop: 1,
  },
  durationRight: {
    alignItems: "flex-end",
  },
  durationPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  savingsBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
  },
  featureValues: {
    flexDirection: "row",
    width: 180,
  },
  featureCell: {
    flex: 1,
    alignItems: "center",
  },
  featureHeader: {
    fontSize: 13,
    fontWeight: "700",
  },
  featureVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  featureNo: {
    fontSize: 16,
  },
  legalText: {
    paddingHorizontal: 20,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 0.5,
    alignItems: "center",
  },
  subscribeBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  subscribeBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  skipText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
});
