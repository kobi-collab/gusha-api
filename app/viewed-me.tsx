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

export default function ViewedMeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

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
