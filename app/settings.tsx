import { resetAuthState } from "@/components/auth-gate";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { loadProfile, saveProfile, clearAllStorage } from "@/lib/storage";
import { UserProfile, DEFAULT_PROFILE } from "@/lib/mock-data";
import { trpc } from "@/lib/trpc";
import { useSubscription } from "@/hooks/use-subscription";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const subInfo = useSubscription();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [tapNotifications, setTapNotifications] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [incognitoEnabled, setIncognitoEnabled] = useState(false);

  // Incognito mode
  const incognitoQuery = trpc.profile.getIncognito.useQuery(undefined, { enabled: !!authUser });
  const toggleIncognitoMutation = trpc.profile.toggleIncognito.useMutation({
    onSuccess: (data: any) => setIncognitoEnabled(data.incognito),
  });
  useEffect(() => {
    if (incognitoQuery.data) setIncognitoEnabled(incognitoQuery.data.incognito);
  }, [incognitoQuery.data]);

  // Load notification preferences from server
  const notifPrefsQuery = trpc.notifications.getPreferences.useQuery(undefined, {
    enabled: !!authUser,
  });
  const updateNotifPrefsMutation = trpc.notifications.updatePreferences.useMutation();

  useEffect(() => {
    if (notifPrefsQuery.data) {
      setPushNotifications(notifPrefsQuery.data.pushEnabled === "true");
      setMessageNotifications(notifPrefsQuery.data.messagesEnabled === "true");
      setTapNotifications(notifPrefsQuery.data.tapsEnabled === "true");
    }
  }, [notifPrefsQuery.data]);

  const updateNotifPref = (key: string, value: boolean) => {
    const val = value ? "true" as const : "false" as const;
    updateNotifPrefsMutation.mutate({ [key]: val });
  };

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await saveProfile(updated);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
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
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Discovery */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Discovery
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              Profile Visible
            </Text>
            <Switch
              value={profile.isVisible}
              onValueChange={(val) => updateProfile({ isVisible: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              Max Distance
            </Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>
              {profile.maxDistance} km
            </Text>
          </View>
          <View style={styles.distanceButtons}>
            {[1, 2, 5, 10, 25].map((km) => (
              <Pressable
                key={km}
                onPress={() => updateProfile({ maxDistance: km })}
                style={({ pressed }) => [
                  styles.distanceChip,
                  {
                    backgroundColor:
                      profile.maxDistance === km ? colors.primary : colors.background,
                    borderColor:
                      profile.maxDistance === km ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.distanceChipText,
                    {
                      color:
                        profile.maxDistance === km ? "#fff" : colors.foreground,
                    },
                  ]}
                >
                  {km} km
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Push Notifications</Text>
            <Switch value={pushNotifications} onValueChange={(val) => { setPushNotifications(val); updateNotifPref("pushEnabled", val); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Message Notifications</Text>
            <Switch value={messageNotifications} onValueChange={(val) => { setMessageNotifications(val); updateNotifPref("messagesEnabled", val); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Tap Notifications</Text>
            <Switch value={tapNotifications} onValueChange={(val) => { setTapNotifications(val); updateNotifPref("tapsEnabled", val); }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
        </View>

        {/* Privacy */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Show Online Status</Text>
            <Switch value={showOnline} onValueChange={setShowOnline} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Incognito Mode</Text>
                {!subInfo.isPremium && (
                  <View style={{ backgroundColor: colors.primary + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>PREMIUM</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Browse profiles without appearing in their Viewed Me</Text>
            </View>
            <Switch
              value={incognitoEnabled}
              onValueChange={(val) => {
                if (val && !subInfo.isPremium) {
                  router.push("/subscription");
                  return;
                }
                setIncognitoEnabled(val);
                toggleIncognitoMutation.mutate({ enabled: val });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Subscription */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Subscription</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconSymbol name="crown.fill" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Current Plan</Text>
            </View>
            <Text style={{ color: subInfo.isSubscribed ? colors.primary : colors.muted, fontWeight: "600", fontSize: 15 }}>
              {subInfo.planLabel}
            </Text>
          </View>
          {subInfo.isSubscribed && subInfo.subscription.expiresAt && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.muted }]}>Renews</Text>
                <Text style={{ color: colors.foreground, fontSize: 14 }}>
                  {new Date(subInfo.subscription.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            </>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push("/subscription")} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.primary }]}>
              {subInfo.isSubscribed ? "Manage Subscription" : "Upgrade to Plus or Premium"}
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Legal</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "terms" } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Terms of Service</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "privacy" } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Privacy Policy</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "community" } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Community Guidelines</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push({ pathname: "/legal", params: { doc: "csae" } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Child Safety Policy</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {authUser && (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.muted }]}>Email</Text>
                <Text style={[styles.rowValue, { color: colors.foreground }]}>{authUser.email || "Not set"}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}
          <Pressable onPress={() => Alert.alert("Sign Out", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", onPress: () => { clearAllStorage().then(() => { resetAuthState(); router.replace("/welcome"); }); } }])} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Sign Out</Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push("/delete-account")} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Delete Account</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.error} />
          </Pressable>
        </View>

        {/* Version */}
        <Text style={{ textAlign: "center", color: colors.muted, fontSize: 13, paddingTop: 24 }}>Gusha v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
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
  scrollContent: {
    paddingBottom: 40,
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
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
  },
  distanceButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  distanceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  distanceChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
