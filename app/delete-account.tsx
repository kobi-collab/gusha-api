import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SUPPORT_EMAIL } from "@/constants/contact";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { clearAllStorage } from "@/lib/storage";
import { resetAuthState } from "@/components/auth-gate";
import { isExplicitDemoMode } from "@/lib/app-mode";

export default function DeleteAccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const deleteMutation = trpc.account.delete.useMutation();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const demo = isExplicitDemoMode(user?.loginMethod);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      Alert.alert("Confirmation Required", 'Please type "DELETE" to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      if (!demo) {
        await deleteMutation.mutateAsync({ confirmation: "DELETE" });
      }

      await clearAllStorage();
      resetAuthState();

      Alert.alert(
        "Account Deleted",
        "Your account and all associated data have been permanently deleted.",
        [
          {
            text: "OK",
            onPress: () => {
              logout();
              router.replace("/welcome");
            },
          },
        ]
      );
    } catch (err) {
      console.error("[DeleteAccount] Error:", err);
      Alert.alert(
        "Error",
        `Failed to delete account. Please try again or contact support at ${SUPPORT_EMAIL}.`
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <IconSymbol name="arrow.left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Delete Account
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {step === 1 ? (
        <View style={styles.content}>
          {/* Warning Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.error + "15" }]}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={48}
                color={colors.error}
              />
            </View>
          </View>

          {/* Warning Text */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            Delete Your Account?
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            This action is permanent and cannot be undone. All of the following data will be permanently deleted:
          </Text>

          {/* Data List */}
          <View style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DataRow icon="person.fill" label="Your profile and photos" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow icon="message.fill" label="All messages and conversations" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow icon="hand.tap.fill" label="Taps sent and received" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow icon="eye.fill" label="Profile views history" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow icon="star.fill" label="Favorites list" colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DataRow icon="nosign" label="Blocks and reports" colors={colors} />
          </View>

          {/* Buttons */}
          <View style={styles.buttonSection}>
            <Pressable
              onPress={() => setStep(2)}
              style={({ pressed }) => [
                styles.deleteButton,
                { backgroundColor: colors.error },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.deleteButtonText}>I Understand, Continue</Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Step 2: Type DELETE */}
          <View style={styles.iconSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.error + "15" }]}>
              <IconSymbol
                name="person.crop.circle.badge.xmark"
                size={48}
                color={colors.error}
              />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Final Confirmation
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Type <Text style={{ fontWeight: "800", color: colors.error }}>DELETE</Text> below to permanently delete your account and all data.
          </Text>

          {user && (
            <View style={[styles.userInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.userInfoLabel, { color: colors.muted }]}>Account</Text>
              <Text style={[styles.userInfoValue, { color: colors.foreground }]}>
                {user.email || user.name || "User"}
              </Text>
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.foreground }]}>
              Type DELETE to confirm
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.muted + "60"}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[
                styles.textInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: confirmText === "DELETE" ? colors.error : colors.border,
                },
              ]}
              returnKeyType="done"
            />
          </View>

          <View style={styles.buttonSection}>
            <Pressable
              onPress={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor:
                    confirmText === "DELETE" ? colors.error : colors.muted + "40",
                },
                pressed && confirmText === "DELETE" && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                deleting && { opacity: 0.6 },
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>
                  Permanently Delete Account
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setStep(1)}
              disabled={deleting}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

function DataRow({
  icon,
  label,
  colors,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.dataRow}>
      <IconSymbol name={icon as any} size={18} color={colors.error} />
      <Text style={[styles.dataRowText, { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  iconSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  dataCard: {
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 24,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dataRowText: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
  },
  userInfo: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    letterSpacing: 4,
  },
  buttonSection: {
    gap: 12,
  },
  deleteButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
