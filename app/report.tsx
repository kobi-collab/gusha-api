import { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or Bullying" },
  { id: "fake_profile", label: "Fake Profile / Catfish" },
  { id: "inappropriate_content", label: "Inappropriate Content" },
  { id: "other", label: "Other" },
] as const;

export default function ReportScreen() {
  const colors = useColors();
  const router = useRouter();
  const { userId, userName } = useLocalSearchParams<{
    userId: string;
    userName: string;
  }>();

  const { isAuthenticated } = useAuth();
  const reportMutation = trpc.safety.report.useMutation();
  const blockMutation = trpc.safety.block.useMutation();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    const numId = parseInt(userId || "0", 10);
    if (!isAuthenticated || numId <= 0) {
      Alert.alert("Unable to Report", "Please try again from the user's profile.");
      return;
    }
    try {
      await reportMutation.mutateAsync({
        reportedUserId: numId,
        reason: selectedReason as "spam" | "harassment" | "fake_profile" | "inappropriate_content" | "other",
        description: description || undefined,
      });
    } catch (e) {
      console.warn("[Report] Submit failed:", e);
      Alert.alert("Could Not Send Report", "Please check your connection and try again.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSubmitted(true);
  };

  const handleBlock = () => {
    Alert.alert(
      "Block " + (userName || "this user") + "?",
      "They won't be able to see your profile or message you. You can unblock them later in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            const numId = parseInt(userId || "0", 10);
            if (isAuthenticated && numId > 0) {
              blockMutation.mutate({ userId: numId });
            }
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
            router.back();
          },
        },
      ]
    );
  };

  if (submitted) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.successContainer}>
          <View
            style={[
              styles.successCircle,
              { backgroundColor: colors.success + "20" },
            ]}
          >
            <IconSymbol
              name="checkmark.circle.fill"
              size={56}
              color={colors.success}
            />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            Report Submitted
          </Text>
          <Text style={[styles.successSub, { color: colors.muted }]}>
            Thank you for helping keep Gusha safe. Our team will review this
            report within 24 hours.
          </Text>
          <Pressable
            onPress={handleBlock}
            style={({ pressed }) => [
              styles.blockBtn,
              {
                backgroundColor: colors.error + "15",
                borderColor: colors.error,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="xmark.circle.fill"
              size={20}
              color={colors.error}
            />
            <Text style={[styles.blockBtnText, { color: colors.error }]}>
              Also Block {userName || "This User"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Report {userName || "User"}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          WHY ARE YOU REPORTING THIS PERSON?
        </Text>

        {REPORT_REASONS.map((reason) => {
          const isSelected = selectedReason === reason.id;
          return (
            <Pressable
              key={reason.id}
              onPress={() => {
                setSelectedReason(reason.id);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={({ pressed }) => [
                styles.reasonRow,
                {
                  backgroundColor: isSelected
                    ? colors.primary + "15"
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[styles.reasonLabel, { color: colors.foreground }]}
              >
                {reason.label}
              </Text>
              {isSelected && (
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={22}
                  color={colors.primary}
                />
              )}
            </Pressable>
          );
        })}

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.muted, marginTop: 24 },
          ]}
        >
          ADDITIONAL DETAILS (OPTIONAL)
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Tell us more about what happened..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          maxLength={1000}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.muted }]}>
          {description.length}/1000
        </Text>

        <View
          style={[
            styles.guidelinesCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.guidelinesTitle, { color: colors.foreground }]}
          >
            Community Guidelines
          </Text>
          <Text style={[styles.guidelinesText, { color: colors.muted }]}>
            Gusha is committed to providing a safe and respectful environment.
            Reports are reviewed by our team and appropriate action is taken
            against accounts that violate our guidelines.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedReason}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: selectedReason
                ? colors.error
                : colors.border,
            },
            pressed && selectedReason && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.submitBtnText}>Submit Report</Text>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scrollContent: { paddingBottom: 100 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonLabel: { fontSize: 16, fontWeight: "500" },
  textInput: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  guidelinesCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  guidelinesTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  guidelinesText: { fontSize: 14, lineHeight: 20 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 0.5,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, fontWeight: "800", marginTop: 20 },
  successSub: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  blockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  blockBtnText: { fontSize: 15, fontWeight: "600" },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
