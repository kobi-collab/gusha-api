import { useState, useCallback } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { setAgeVerified } from "@/lib/storage";
import { setAgeOkDirect } from "@/components/auth-gate";

export default function AgeGateScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleContinue = useCallback(async () => {
    if (loading) return;

    Keyboard.dismiss();

    const day = parseInt(selectedDay, 10);
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10);

    if (
      !day ||
      !month ||
      !year ||
      day < 1 ||
      day > 31 ||
      month < 1 ||
      month > 12 ||
      year < 1900 ||
      year > currentYear
    ) {
      const message = "Please enter a valid date of birth.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Invalid Date", message);
      }
      return;
    }

    const birthDate = new Date(year, month - 1, day);
    if (Number.isNaN(birthDate.getTime())) {
      Alert.alert("Invalid Date", "Please enter a valid date of birth.");
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      const message =
        "You must be at least 18 years old to use Gusha. This is required by law for social applications.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Age Requirement", message, [{ text: "OK" }]);
      }
      return;
    }

    setLoading(true);
    try {
      await setAgeVerified(true);
      // Sync flag for auth-gate immediately (in-memory + storage write already cached in setAgeVerified).
      setAgeOkDirect(true);
      router.replace("/onboarding");
    } catch (err) {
      console.error("[AgeGate] setAgeVerified failed:", err);
      Alert.alert(
        "Could Not Continue",
        "Age verification could not be saved. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  }, [loading, selectedDay, selectedMonth, selectedYear, currentYear, router]);

  const keyboardVerticalOffset = Platform.OS === "ios" ? 8 : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="person.badge.shield.checkmark.fill" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Verify Your Age</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Gusha is for adults 18 and older. Please enter your date of birth to continue.
            </Text>
          </View>

          <View style={styles.dateSection}>
            <Text style={[styles.dateLabel, { color: colors.foreground }]}>Date of Birth</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateFieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Day</Text>
                <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={selectedDay}
                    onChangeText={(text) => setSelectedDay(text.replace(/[^0-9]/g, "").slice(0, 2))}
                    placeholder="DD"
                    placeholderTextColor={colors.muted + "80"}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.dateInput, { color: colors.foreground }]}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>
              <View style={styles.dateFieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Month</Text>
                <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={selectedMonth}
                    onChangeText={(text) => setSelectedMonth(text.replace(/[^0-9]/g, "").slice(0, 2))}
                    placeholder="MM"
                    placeholderTextColor={colors.muted + "80"}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.dateInput, { color: colors.foreground }]}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>
              <View style={[styles.dateFieldWrapper, styles.yearField]}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Year</Text>
                <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={selectedYear}
                    onChangeText={(text) => setSelectedYear(text.replace(/[^0-9]/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    placeholderTextColor={colors.muted + "80"}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[styles.dateInput, { color: colors.foreground }]}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="lock.fill" size={16} color={colors.muted} />
            <Text style={[styles.infoText, { color: colors.muted }]}>
              Your date of birth is used only for age verification and will not be shared with other users.
            </Text>
          </View>

          <View style={styles.actionSection}>
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              hitSlop={12}
              style={({ pressed }) => [
                styles.continueButton,
                { backgroundColor: colors.primary },
                pressed && !loading && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                loading && { opacity: 0.7 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </Pressable>
            <Text style={[styles.legalText, { color: colors.muted }]}>
              By continuing, you confirm that you are at least 18 years old and agree to our{" "}
              <Text
                style={{ textDecorationLine: "underline" }}
                onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={{ textDecorationLine: "underline" }}
                onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    justifyContent: "space-between",
    minHeight: "100%",
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 24,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  dateSection: {
    gap: 12,
    marginTop: 24,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateFieldWrapper: {
    flex: 1,
    gap: 4,
  },
  yearField: {
    flex: 1.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateField: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dateInput: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  actionSection: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 16,
  },
  continueButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  legalText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
