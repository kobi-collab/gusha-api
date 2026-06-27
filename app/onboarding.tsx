import { useState, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  loadProfile,
  saveProfile,
  loadSearchPreferences,
  saveSearchPreferences,
  setOnboardingComplete,
  isOnboardingComplete,
} from "@/lib/storage";
import { setOnboardingDoneDirect } from "@/components/auth-gate";
import {
  connectGuestSession,
  showGuestSessionFailureAlert,
} from "@/hooks/use-guest-session";
import type { GenderIdentity, LookingForOption } from "@/lib/mock-data";

const STEP_COUNT = 4;

const GENDER_OPTIONS: GenderIdentity[] = [
  "Man", "Woman", "Non-binary", "Trans Man", "Trans Woman", "Genderqueer", "Other",
];

const LOOKING_FOR_OPTS: LookingForOption[] = [
  "Friends", "Hangouts", "Gaming Partners", "Community", "Events",
];

type ShowGroup = "Everyone" | "Men" | "Women" | "Non-binary & more";
const SHOW_OPTIONS: ShowGroup[] = ["Everyone", "Men", "Women", "Non-binary & more"];

function showGroupToGenders(group: ShowGroup): GenderIdentity[] {
  switch (group) {
    case "Men": return ["Man", "Cis Man", "Trans Man"];
    case "Women": return ["Woman", "Cis Woman", "Trans Woman"];
    case "Non-binary & more": return ["Non-binary", "Genderqueer", "Genderfluid", "Agender", "Two-Spirit", "Other", "Prefer not to say"];
    default: return [];
  }
}

const STEP_TITLES = ["What's your name?", "Who are you?", "What are you here for?", "Who do you want to see?"];
const STEP_SUBTITLES = [
  "Tell us what to call you.",
  "Tell us how you identify.",
  "Select everything that applies.",
  "You can change this any time in settings.",
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedName, setSelectedName] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const ageInputRef = useRef<TextInput>(null);

  const [selectedGender, setSelectedGender] = useState<GenderIdentity | null>(null);
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingForOption[]>([]);
  const [selectedShowGroups, setSelectedShowGroups] = useState<ShowGroup[]>(["Everyone"]);

  const toggleLookingFor = (opt: LookingForOption) => {
    setSelectedLookingFor(prev =>
      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
    );
  };

  const toggleShowGroup = (opt: ShowGroup) => {
    if (opt === "Everyone") {
      setSelectedShowGroups(["Everyone"]);
      return;
    }
    setSelectedShowGroups(prev => {
      const without = prev.filter(x => x !== "Everyone");
      if (without.includes(opt)) {
        const next = without.filter(x => x !== opt);
        return next.length === 0 ? ["Everyone"] : next;
      }
      return [...without, opt];
    });
  };

  const handleContinue = async () => {
    console.log(`[Onboarding] handleContinue: step=${step}, STEP_COUNT=${STEP_COUNT}`);

    // Validate step 1 (name + age)
    if (step === 1) {
      const trimmedName = selectedName.trim();
      const ageNum = parseInt(selectedAge, 10);
      if (!trimmedName) {
        Alert.alert("Name Required", "Please enter your name to continue.");
        return;
      }
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
        Alert.alert("Age Required", "Please enter a valid age (18–99) to continue.");
        return;
      }
    }

    if (step === 2 && !selectedGender) {
      Alert.alert("Selection Required", "Please choose how you identify to continue.");
      return;
    }

    if (step < STEP_COUNT) {
      console.log("[Onboarding] handleContinue: taking early return, advancing step");
      setStep(s => s + 1);
      return;
    }

    console.log("[Onboarding] handleContinue: taking save path");
    setLoading(true);
    try {
      const [profile, prefs] = await Promise.all([loadProfile(), loadSearchPreferences()]);

      const showGenders: GenderIdentity[] = selectedShowGroups.includes("Everyone")
        ? []
        : selectedShowGroups.flatMap(showGroupToGenders);

      const trimmedName = selectedName.trim();
      const ageNum = parseInt(selectedAge, 10);

      const [,,onboardingResult] = await Promise.allSettled([
        saveProfile({
          ...profile,
          name: trimmedName || profile.name,
          displayName: trimmedName || profile.displayName,
          age: !isNaN(ageNum) ? ageNum : profile.age,
          genderIdentity: selectedGender,
          lookingFor: selectedLookingFor,
        }),
        saveSearchPreferences({ ...prefs, showGenders }),
        setOnboardingComplete(),
      ]);
      console.log("[Onboarding] handleContinue: setOnboardingComplete result:", onboardingResult);

      if (onboardingResult.status === "rejected") {
        throw onboardingResult.reason;
      }

      let done = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        done = await isOnboardingComplete();
        console.log(`[Onboarding] onboarding complete check ${i + 1}/10: ${done}`);
        if (done) break;
      }

      if (!done) {
        console.error("[Onboarding] isOnboardingComplete never returned true after 10 attempts");
        Alert.alert(
          "Setup Error",
          "Could not save your profile. Please try again.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Push the confirmed value directly into auth-gate's React state so it
      // doesn't need to do another async storage read during navigation.
      setOnboardingDoneDirect(true);

      try {
        const session = await connectGuestSession();
        if (!session.ok) {
          showGuestSessionFailureAlert(session.message, () => {
            void handleContinue();
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("[Onboarding] guest session setup failed:", e);
        showGuestSessionFailureAlert(
          "Could not connect to Gusha. Check your internet connection and try again.",
          () => {
            void handleContinue();
          }
        );
        setLoading(false);
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      console.error("[Onboarding] save error:", err);
      Alert.alert(
        "Setup Error",
        "Something went wrong while saving your profile. Please try again.",
        [{ text: "OK" }]
      );
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                {
                  flex: i + 1 === step ? 2 : 1,
                  backgroundColor: i + 1 <= step ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.stepLabel, { color: colors.muted }]}>
            Step {step} of {STEP_COUNT}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {STEP_TITLES[step - 1]}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {STEP_SUBTITLES[step - 1]}
          </Text>
        </View>

        {/* Step 1: Name + Age */}
        {step === 1 ? (
          <KeyboardAvoidingView
            style={styles.scroll}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.nameAgeForm}>
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Your name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
                value={selectedName}
                onChangeText={setSelectedName}
                placeholder="e.g. Maya"
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => ageInputRef.current?.focus()}
              />
              <Text style={[styles.inputLabel, { color: colors.muted }]}>Your age</Text>
              <TextInput
                ref={ageInputRef}
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
                ]}
                value={selectedAge}
                onChangeText={setSelectedAge}
                placeholder="e.g. 24"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <Text style={[styles.inputHint, { color: colors.muted }]}>
                You must be 18 or older to use Gusha.
              </Text>
            </View>
          </KeyboardAvoidingView>
        ) : (
          /* Steps 2–4: Chips */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.chipsWrap}
            showsVerticalScrollIndicator={false}
          >
            {step === 2 &&
              GENDER_OPTIONS.map(opt => {
                const active = selectedGender === opt;
                return (
                  <Chip
                    key={opt}
                    label={opt}
                    active={active}
                    onPress={() => setSelectedGender(active ? null : opt)}
                    colors={colors}
                  />
                );
              })}

            {step === 3 &&
              LOOKING_FOR_OPTS.map(opt => {
                const active = selectedLookingFor.includes(opt);
                return (
                  <Chip
                    key={opt}
                    label={opt}
                    active={active}
                    onPress={() => toggleLookingFor(opt)}
                    colors={colors}
                  />
                );
              })}

            {step === 4 &&
              SHOW_OPTIONS.map(opt => {
                const active = selectedShowGroups.includes(opt);
                return (
                  <Chip
                    key={opt}
                    label={opt}
                    active={active}
                    onPress={() => toggleShowGroup(opt)}
                    colors={colors}
                  />
                );
              })}
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleContinue}
            disabled={loading}
            style={({ pressed }) => [
              styles.continueBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              loading && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.continueBtnText}>
                {step < STEP_COUNT ? "Continue" : "Let's Go"}
              </Text>
            )}
          </Pressable>

          {step > 1 && step < STEP_COUNT && step !== 2 && (
            <Pressable
              onPress={() => setStep(s => s + 1)}
              style={styles.skipBtn}
            >
              <Text style={[styles.skipText, { color: colors.muted }]}>Skip for now</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 24,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 36,
    height: 5,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressSegment: {
    borderRadius: 99,
    height: 5,
  },
  header: {
    marginBottom: 28,
    gap: 6,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 2,
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "700",
  },
  actions: {
    paddingTop: 16,
    alignItems: "center",
    gap: 4,
  },
  continueBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  nameAgeForm: {
    flex: 1,
    paddingTop: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  textInput: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 18,
    borderWidth: 1.5,
  },
  inputHint: {
    fontSize: 13,
    marginTop: 16,
    lineHeight: 18,
  },
});
