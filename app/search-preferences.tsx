import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  SearchPreferences,
  DEFAULT_SEARCH_PREFERENCES,
  ALL_INTERESTS,
  BODY_TYPES,
  LOOKING_FOR_OPTIONS,
} from "@/lib/mock-data";
import { loadSearchPreferences, saveSearchPreferences } from "@/lib/storage";

const AGE_OPTIONS = [18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60];
const DISTANCE_OPTIONS = [1, 2, 3, 5, 10, 15, 25, 50];

export default function SearchPreferencesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [prefs, setPrefs] = useState<SearchPreferences>({
    ...DEFAULT_SEARCH_PREFERENCES,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSearchPreferences().then(setPrefs);
  }, []);

  const updatePrefs = useCallback(
    (updates: Partial<SearchPreferences>) => {
      setPrefs((prev) => ({ ...prev, ...updates }));
      setHasChanges(true);
    },
    []
  );

  const toggleInterest = useCallback((interest: string) => {
    setPrefs((prev) => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      setHasChanges(true);
      return { ...prev, interests: newInterests };
    });
  }, []);

  const toggleBodyType = useCallback((type: string) => {
    setPrefs((prev) => {
      const list = prev.bodyTypes ?? [];
      const next = list.includes(type as any)
        ? list.filter((t) => t !== type)
        : [...list, type as any];
      setHasChanges(true);
      return { ...prev, bodyTypes: next };
    });
  }, []);

  const toggleLookingFor = useCallback((option: string) => {
    setPrefs((prev) => {
      const list = prev.lookingFor ?? [];
      const next = list.includes(option as any)
        ? list.filter((o) => o !== option)
        : [...list, option as any];
      setHasChanges(true);
      return { ...prev, lookingFor: next };
    });
  }, []);

  const handleApply = useCallback(async () => {
    await saveSearchPreferences(prefs);
    router.back();
  }, [prefs, router]);

  const handleReset = useCallback(async () => {
    const defaults = { ...DEFAULT_SEARCH_PREFERENCES };
    setPrefs(defaults);
    await saveSearchPreferences(defaults);
    setHasChanges(true);
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Search Preferences
        </Text>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>
            Reset
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Age Range */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Age Range
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeLabel, { color: colors.foreground }]}>
              Minimum Age
            </Text>
            <Text style={[styles.rangeValue, { color: colors.primary }]}>
              {prefs.minAge}
            </Text>
          </View>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.filter((a) => a <= prefs.maxAge).map((age) => (
              <Pressable
                key={`min-${age}`}
                onPress={() => updatePrefs({ minAge: age })}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor:
                      prefs.minAge === age ? colors.primary : colors.background,
                    borderColor:
                      prefs.minAge === age ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        prefs.minAge === age ? "#fff" : colors.foreground,
                    },
                  ]}
                >
                  {age}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rangeRow}>
            <Text style={[styles.rangeLabel, { color: colors.foreground }]}>
              Maximum Age
            </Text>
            <Text style={[styles.rangeValue, { color: colors.primary }]}>
              {prefs.maxAge}
            </Text>
          </View>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.filter((a) => a >= prefs.minAge).map((age) => (
              <Pressable
                key={`max-${age}`}
                onPress={() => updatePrefs({ maxAge: age })}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor:
                      prefs.maxAge === age ? colors.primary : colors.background,
                    borderColor:
                      prefs.maxAge === age ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        prefs.maxAge === age ? "#fff" : colors.foreground,
                    },
                  ]}
                >
                  {age}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Max Distance */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Maximum Distance
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeLabel, { color: colors.foreground }]}>
              Distance
            </Text>
            <Text style={[styles.rangeValue, { color: colors.primary }]}>
              {prefs.maxDistance} km
            </Text>
          </View>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((km) => (
              <Pressable
                key={`dist-${km}`}
                onPress={() => updatePrefs({ maxDistance: km })}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor:
                      prefs.maxDistance === km
                        ? colors.primary
                        : colors.background,
                    borderColor:
                      prefs.maxDistance === km ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        prefs.maxDistance === km ? "#fff" : colors.foreground,
                    },
                  ]}
                >
                  {km} km
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Body Type Filter */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Body Type</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chipRow}>
            {BODY_TYPES.filter((t) => t !== "Prefer not to say").map((type) => {
              const isSelected = (prefs.bodyTypes ?? []).includes(type as any);
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleBodyType(type)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Looking For Filter */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Looking For</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.chipRow}>
            {LOOKING_FOR_OPTIONS.map((option) => {
              const isSelected = (prefs.lookingFor ?? []).includes(option as any);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleLookingFor(option)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Interests */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Interests
        </Text>
        <Text style={[styles.sectionHint, { color: colors.muted }]}>
          Select interests to find people with similar hobbies. Leave empty to see everyone.
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.chipRow}>
            {ALL_INTERESTS.map((interest) => {
              const selected = prefs.interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={({ pressed }) => [
                    styles.interestChip,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.interestChipText,
                      { color: selected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            Current Filters
          </Text>
          <Text style={[styles.summaryText, { color: colors.muted }]}>
            Age: {prefs.minAge} - {prefs.maxAge} | Distance: up to {prefs.maxDistance} km
          </Text>
          {(prefs.bodyTypes ?? []).length > 0 && (
            <Text style={[styles.summaryText, { color: colors.muted }]}>
              Body Type: {prefs.bodyTypes.join(", ")}
            </Text>
          )}
          {(prefs.lookingFor ?? []).length > 0 && (
            <Text style={[styles.summaryText, { color: colors.muted }]}>
              Looking For: {prefs.lookingFor.join(", ")}
            </Text>
          )}
          {prefs.interests.length > 0 && (
            <Text style={[styles.summaryText, { color: colors.muted }]}>
              Interests: {prefs.interests.join(", ")}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => [
            styles.applyButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
    width: 40,
    textAlign: "right",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
    lineHeight: 18,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 48,
    alignItems: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 0.5,
    marginVertical: 16,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 0.5,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
