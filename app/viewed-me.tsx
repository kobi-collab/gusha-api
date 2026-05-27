import { useMemo } from "react";
import {
  Text, View, FlatList, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { ProfileView, formatTime, formatDistance } from "@/lib/mock-data";
import { hasFeature, PlanId } from "@/lib/subscription";

export default function ViewedMeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const currentPlan: PlanId = "free";
  const canSee = hasFeature(currentPlan, "viewed_me");

  const viewsQuery = trpc.views.myViewers.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  const views: ProfileView[] = useMemo(() => {
    if (!viewsQuery.data) return [];
    return (viewsQuery.data as any[]).map((v) => ({
      id: String(v.id),
      viewerId: String(v.viewerId),
      viewerName: `User ${v.viewerId}`,
      viewerPhoto: "",
      viewerAge: 0,
      viewerDistance: 0,
      viewedAt: new Date(v.createdAt).getTime(),
    }));
  }, [viewsQuery.data]);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Viewed Me</Text>
        <View style={{ width: 32 }} />
      </View>

      {viewsQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !canSee ? (
        <View style={styles.upsellContainer}>
          <View style={[styles.upsellCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="eye.circle.fill" size={56} color={colors.primary} />
            <Text style={[styles.upsellTitle, { color: colors.foreground }]}>See Who Viewed You</Text>
            <Text style={[styles.upsellSub, { color: colors.muted }]}>
              {views.length} people viewed your profile. Upgrade to Premium to see who they are.
            </Text>
            <Pressable
              onPress={() => router.push("/subscription")}
              style={({ pressed }) => [styles.upsellBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            >
              <IconSymbol name="crown.fill" size={18} color="#fff" />
              <Text style={styles.upsellBtnText}>Upgrade to Premium</Text>
            </Pressable>
          </View>
          <FlatList
            data={views.slice(0, 5)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.row, { borderBottomColor: colors.border, opacity: 0.3 }]}>
                <UserAvatar userId={item.viewerId} name={item.viewerName} photoUri={item.viewerPhoto || null} gallery={[]} size={52} isOnline={false} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.foreground }]}>••••••</Text>
                  <Text style={[styles.rowSub, { color: colors.muted }]}>Upgrade to see</Text>
                </View>
              </View>
            )}
          />
        </View>
      ) : views.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👀</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No views yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>When someone views your profile, they&apos;ll appear here</Text>
        </View>
      ) : (
        <FlatList
          data={views}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={viewsQuery.isRefetching} onRefresh={() => viewsQuery.refetch()} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/user-detail", params: { userId: item.viewerId, userName: item.viewerName } })}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <UserAvatar userId={item.viewerId} name={item.viewerName} photoUri={item.viewerPhoto || null} gallery={[]} size={52} isOnline={false} />
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: colors.foreground }]}>
                  {item.viewerName}{item.viewerAge ? `, ${item.viewerAge}` : ""}
                </Text>
                <Text style={[styles.rowSub, { color: colors.muted }]}>
                  {formatDistance(item.viewerDistance)} · {formatTime(item.viewedAt)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  upsellContainer: { flex: 1 },
  upsellCard: { margin: 20, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  upsellTitle: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  upsellSub: { fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22 },
  upsellBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
  upsellBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  rowInfo: { flex: 1, marginLeft: 14 },
  rowName: { fontSize: 17, fontWeight: "600" },
  rowSub: { fontSize: 14, marginTop: 2 },
  listContent: { paddingBottom: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySub: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 22 },
});
