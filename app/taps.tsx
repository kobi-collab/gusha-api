import { useState, useCallback, useMemo } from "react";
import {
  Text, View, FlatList, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { TapItem, ProfileView, TAP_TYPES, formatTime, formatDistance } from "@/lib/mock-data";
import { DEMO_TAPS, DEMO_VIEWS } from "@/lib/demo-data";
import { isExplicitDemoMode } from "@/lib/app-mode";

type TabMode = "taps" | "viewed";

function TapRow({ item, colors, onPress }: { item: TapItem; colors: any; onPress: () => void }) {
  const tapInfo = TAP_TYPES[item.type] || TAP_TYPES.wave;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        !item.isRead && { backgroundColor: colors.primary + "08" },
        pressed && { opacity: 0.7 },
      ]}
    >
      <UserAvatar userId={item.senderId} name={item.senderName} photoUri={item.senderPhoto || null} gallery={item.senderPhoto ? [{ id: "g1", uri: item.senderPhoto, isPrivate: false, order: 0 }] : []} size={52} isOnline={false} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.foreground }]}>{item.senderName}</Text>
        <Text style={[styles.rowSub, { color: colors.muted }]}>
          {tapInfo.emoji} {tapInfo.description} · {formatTime(item.createdAt)}
        </Text>
      </View>
      <Text style={styles.tapEmoji}>{tapInfo.emoji}</Text>
    </Pressable>
  );
}

function ViewedRow({ item, colors, onPress }: { item: ProfileView; colors: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <UserAvatar userId={item.viewerId} name={item.viewerName} photoUri={item.viewerPhoto || null} gallery={item.viewerPhoto ? [{ id: "g1", uri: item.viewerPhoto, isPrivate: false, order: 0 }] : []} size={52} isOnline={false} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.foreground }]}>
          {item.viewerName}
          {item.viewerAge ? `, ${item.viewerAge}` : ""}
        </Text>
        <Text style={[styles.rowSub, { color: colors.muted }]}>
          {formatDistance(item.viewerDistance)} · {formatTime(item.viewedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TapsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<TabMode>("taps");
  const demo = isExplicitDemoMode(user?.loginMethod);

  // Server queries (skip in demo mode)
  const tapsQuery = trpc.taps.received.useQuery(undefined, {
    enabled: isAuthenticated && !demo,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const viewsQuery = trpc.views.myViewers.useQuery(undefined, {
    enabled: isAuthenticated && !demo,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const markTapsReadMutation = trpc.taps.markRead.useMutation();

  // Convert server taps to local TapItem format
  const taps: TapItem[] = useMemo(() => {
    if (demo) return DEMO_TAPS;
    if (!tapsQuery.data) return [];
    return (tapsQuery.data as any[]).map((t) => ({
      id: String(t.id),
      senderId: String(t.senderId),
      senderName: `User ${t.senderId}`,
      senderPhoto: "",
      type: t.type || "wave",
      isRead: t.isRead === "true",
      createdAt: new Date(t.createdAt).getTime(),
    }));
  }, [tapsQuery.data, demo]);

  // Convert server views to local ProfileView format
  const views: ProfileView[] = useMemo(() => {
    if (demo) return DEMO_VIEWS;
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
  }, [viewsQuery.data, demo]);

  const unreadTaps = taps.filter((t) => !t.isRead).length;

  const onRefresh = useCallback(async () => {
    if (demo) return;
    if (tab === "taps") {
      await tapsQuery.refetch();
      markTapsReadMutation.mutate();
    } else {
      await viewsQuery.refetch();
    }
  }, [tab, tapsQuery, viewsQuery, markTapsReadMutation, demo]);

  const isLoading = demo ? false : (tab === "taps" ? tapsQuery.isLoading : viewsQuery.isLoading);
  const isRefetching = demo ? false : (tab === "taps" ? tapsQuery.isRefetching : viewsQuery.isRefetching);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Activity</Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setTab("taps")}
          style={({ pressed }) => [styles.tabItem, tab === "taps" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.tabText, { color: tab === "taps" ? colors.primary : colors.muted }]}>Taps</Text>
          {unreadTaps > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tabBadgeText}>{unreadTaps}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => setTab("viewed")}
          style={({ pressed }) => [styles.tabItem, tab === "viewed" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.tabText, { color: tab === "viewed" ? colors.primary : colors.muted }]}>Viewed Me</Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tab === "taps" ? (
        taps.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No taps yet</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Send a tap to someone you like from their profile!</Text>
          </View>
        ) : (
          <FlatList
            data={taps}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <TapRow
                item={item}
                colors={colors}
                onPress={() => router.push({ pathname: "/user-detail", params: { userId: item.senderId, userName: item.senderName } })}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <ViewedRow
              item={item}
              colors={colors}
              onPress={() => {
                router.push({ pathname: "/user-detail", params: { userId: item.viewerId, userName: item.viewerName } });
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: "800" },
  tabBar: { flexDirection: "row", borderBottomWidth: 0.5, paddingHorizontal: 20 },
  tabItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, marginRight: 24, paddingBottom: 10 },
  tabText: { fontSize: 16, fontWeight: "600" },
  tabBadge: { marginLeft: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5 },
  rowInfo: { flex: 1, marginLeft: 14 },
  rowName: { fontSize: 17, fontWeight: "600" },
  rowSub: { fontSize: 14, marginTop: 2 },
  tapEmoji: { fontSize: 28 },
  listContent: { paddingBottom: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
