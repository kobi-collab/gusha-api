import { useMemo, useCallback, useState, useEffect } from "react";
import { Text, View, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { formatTime } from "@/lib/mock-data";
import { DEMO_CONVERSATIONS } from "@/lib/demo-data";
import { isAgeVerified, isOnboardingComplete } from "@/lib/storage";

function isDemoMode(): boolean {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("demo_mode") === "true";
  }
  return false;
}

interface ConversationItem {
  partnerId: number | string;
  partnerName: string;
  partnerPhoto: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  lastMessageType: string;
}

export default function ChatListScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Detect registered-but-not-OAuth'd local users (same pattern as explore.tsx)
  const [isLocalUser, setIsLocalUser] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      setIsLocalUser(false);
      return;
    }
    Promise.all([isAgeVerified(), isOnboardingComplete()]).then(([age, onboarding]) => {
      setIsLocalUser(age && onboarding);
    });
  }, [isAuthenticated]);

  const demo = isDemoMode() || user?.loginMethod === "demo" || (isLocalUser && !isAuthenticated);

  // Fetch conversation partner IDs (skip in demo mode)
  const conversationsQuery = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated && !demo,
    retry: 1,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const partnerIds: number[] = demo ? [] : (conversationsQuery.data || []);

  const demoConvos = DEMO_CONVERSATIONS.map((c) => ({
    partnerId: c.userId,
    partnerName: c.userName,
    partnerPhoto: c.userPhoto,
    lastMessage: c.lastMessage,
    lastMessageTime: c.lastMessageTime,
    unreadCount: c.unreadCount,
    lastMessageType: c.lastMessageType || "text",
  }));

  const conversations: ConversationItem[] = useMemo(() => {
    if (demo) return demoConvos;
    const realConvos = partnerIds.map((pid) => ({
      partnerId: pid,
      partnerName: `User ${pid}`,
      partnerPhoto: "",
      lastMessage: "Tap to open conversation",
      lastMessageTime: Date.now(),
      unreadCount: 0,
      lastMessageType: "text",
    }));
    // Show demo conversations as fallback when no real conversations exist
    return realConvos.length > 0 ? realConvos : demoConvos;
  }, [partnerIds, demo]);

  const onRefresh = useCallback(async () => {
    if (!demo) {
      await conversationsQuery.refetch();
    }
  }, [conversationsQuery, demo]);

  const isLoading = demo ? false : conversationsQuery.isLoading;
  const isRefetching = demo ? false : conversationsQuery.isRefetching;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
      </View>
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No conversations yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Discover people on the grid and start chatting!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.partnerId)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) =>
            demo ? (
              <DemoConversationRow item={item} colors={colors} />
            ) : (
              <ConversationRow item={item} colors={colors} />
            )
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

/** Demo mode conversation row - uses pre-loaded data, no server queries */
function DemoConversationRow({ item, colors }: { item: ConversationItem; colors: any }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/chat-room",
          params: {
            conversationId: String(item.partnerId),
            userName: item.partnerName,
            userId: String(item.partnerId),
          },
        })
      }
      style={({ pressed }) => [
        styles.chatRow,
        { borderBottomColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <UserAvatar
        userId={String(item.partnerId)}
        name={item.partnerName}
        photoUri={item.partnerPhoto}
        gallery={item.partnerPhoto ? [{ id: "g1", uri: item.partnerPhoto, isPrivate: false, order: 0 }] : []}
        size={52}
        isOnline={false}
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.foreground }]}>
            {item.partnerName}
          </Text>
          <Text style={[styles.chatTime, { color: colors.muted }]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.chatPreview}>
          <Text
            style={[styles.chatMessage, { color: colors.muted }]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** Server mode conversation row - fetches partner profile from server */
function ConversationRow({ item, colors }: { item: ConversationItem; colors: any }) {
  const router = useRouter();

  const profileQuery = trpc.profile.getById.useQuery(
    { userId: Number(item.partnerId) },
    { staleTime: 60_000 }
  );

  const partnerName = profileQuery.data?.displayName || `User ${item.partnerId}`;
  const partnerPhoto = profileQuery.data?.gallery?.[0]?.uri || "";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/chat-room",
          params: {
            conversationId: String(item.partnerId),
            userName: partnerName,
            userId: String(item.partnerId),
          },
        })
      }
      style={({ pressed }) => [
        styles.chatRow,
        { borderBottomColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <UserAvatar
        userId={String(item.partnerId)}
        name={partnerName}
        photoUri={partnerPhoto}
        gallery={profileQuery.data?.gallery || []}
        size={52}
        isOnline={false}
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.foreground }]}>
            {partnerName}
          </Text>
          <Text style={[styles.chatTime, { color: colors.muted }]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.chatPreview}>
          <Text
            style={[styles.chatMessage, { color: colors.muted }]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 17,
    fontWeight: "600",
  },
  chatTime: {
    fontSize: 13,
  },
  chatPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  chatMessage: {
    fontSize: 15,
    flex: 1,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
