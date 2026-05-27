import { useState, useRef, useCallback, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { UserAvatar } from "@/components/user-avatar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  PhotoItem,
  formatDistance,
  getPublicPhotos,
  getPrivatePhotoCount,
  TAP_TYPES,
  TapType,
} from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useUserOnlineStatus, formatLastSeen } from "@/hooks/use-online-status";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function UserDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const {
    userId,
    userName,
    userAge,
    userBio,
    userDistance,
    userOnline,
    userInterests,
    userPhoto,
    userGallery,
  } = useLocalSearchParams<{
    userId: string;
    userName: string;
    userAge: string;
    userBio: string;
    userDistance: string;
    userOnline: string;
    userInterests: string;
    userPhoto: string;
    userGallery: string;
  }>();

  // tRPC mutations for server actions
  const sendTapMutation = trpc.taps.send.useMutation();
  const addFavMutation = trpc.favorites.add.useMutation();
  const removeFavMutation = trpc.favorites.remove.useMutation();
  const blockMutation = trpc.safety.block.useMutation();
  const recordViewMutation = trpc.views.record.useMutation();

  // Record profile view on mount
  useEffect(() => {
    const numId = parseInt(userId || "0", 10);
    if (isAuthenticated && numId > 0) {
      recordViewMutation.mutate({ viewedUserId: numId });
    }
  }, [userId, isAuthenticated]);

  const interests = userInterests ? userInterests.split(",").filter(Boolean) : [];
  const distance = parseInt(userDistance || "0", 10);
  const isOnlineFallback = userOnline === "1";
  const numericUserId = parseInt(userId || "0", 10);
  const { isOnline: wsOnline, lastSeen } = useUserOnlineStatus(numericUserId > 0 ? numericUserId : undefined);
  const isOnline = wsOnline || isOnlineFallback;
  const lastSeenText = !isOnline ? formatLastSeen(lastSeen) : "";

  let gallery: PhotoItem[] = [];
  try {
    gallery = userGallery ? JSON.parse(userGallery) : [];
  } catch {
    gallery = [];
  }
  const publicPhotos = getPublicPhotos(gallery);
  const privateCount = getPrivatePhotoCount(gallery);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tapSent, setTapSent] = useState<TapType | null>(null);
  const [showTapPicker, setShowTapPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleMessage = useCallback(() => {
    router.push({
      pathname: "/chat-room",
      params: {
        conversationId: `c_${userId}`,
        userName: userName || "User",
        userId: userId || "",
      },
    });
  }, [router, userId, userName]);

  const handleTap = useCallback((type: TapType) => {
    setShowTapPicker(false);
    setTapSent(type);
    const info = TAP_TYPES[type];
    // Send tap to server
    const numId = parseInt(userId || "0", 10);
    if (isAuthenticated && numId > 0) {
      sendTapMutation.mutate({ receiverId: numId, type });
    }
    Alert.alert(`${info.emoji} Tap Sent!`, `You sent a ${info.label} tap to ${userName}`);
  }, [userName, userId, isAuthenticated, sendTapMutation]);

  const handleFavorite = useCallback(() => {
    const numId = parseInt(userId || "0", 10);
    if (isAuthenticated && numId > 0) {
      if (isFavorite) {
        removeFavMutation.mutate({ favoriteUserId: numId });
      } else {
        addFavMutation.mutate({ favoriteUserId: numId });
      }
    }
    setIsFavorite((prev) => !prev);
  }, [userId, isAuthenticated, isFavorite, addFavMutation, removeFavMutation]);

  const handleBlock = useCallback(() => {
    Alert.alert("Block User", `Are you sure you want to block ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: () => {
          const numId = parseInt(userId || "0", 10);
          if (isAuthenticated && numId > 0) {
            blockMutation.mutate({ userId: numId });
          }
          Alert.alert("Blocked", `${userName} has been blocked.`);
          router.back();
        },
      },
    ]);
  }, [userName, userId, router, isAuthenticated, blockMutation]);

  const handleReport = useCallback(() => {
    router.push({ pathname: "/report", params: { userId: userId || "", userName: userName || "" } });
  }, [router, userId, userName]);

  const hasPublicPhotos = publicPhotos.some((p) => p.uri);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleFavorite}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol
                name={isFavorite ? "star.fill" : "star"}
                size={24}
                color={isFavorite ? colors.warning : colors.muted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert("Options", undefined, [
                  { text: "Block", style: "destructive", onPress: handleBlock },
                  { text: "Report", style: "destructive", onPress: handleReport },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="ellipsis" size={24} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Photo Gallery Carousel or Avatar */}
        {hasPublicPhotos ? (
          <View>
            <FlatList
              ref={flatListRef}
              data={publicPhotos.filter((p) => p.uri)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActivePhotoIndex(idx);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />
            {publicPhotos.filter((p) => p.uri).length > 1 && (
              <View style={styles.dotsRow}>
                {publicPhotos.filter((p) => p.uri).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i === activePhotoIndex ? colors.primary : colors.border },
                    ]}
                  />
                ))}
              </View>
            )}
            {privateCount > 0 && (
              <View style={[styles.privateOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                <IconSymbol name="lock.fill" size={14} color="#fff" />
                <Text style={styles.privateOverlayText}>
                  {privateCount} private photo{privateCount > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.avatarSection}>
            <UserAvatar
              userId={userId || ""}
              name={userName || "?"}
              photoUri={userPhoto || null}
              gallery={gallery}
              size={120}
              isOnline={isOnline}
              onlineColor={colors.success}
              showPrivateIndicator={privateCount > 0}
            />
            {isOnline && (
              <View style={[styles.onlineBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )}
          </View>
        )}

        {/* Name & Age */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {userName}{userAge ? `, ${userAge}` : ""}
            </Text>
            {isOnline && hasPublicPhotos && (
              <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            )}
          </View>
          {distance > 0 && (
            <Text style={[styles.distance, { color: colors.primary }]}>
              {formatDistance(distance)} away
            </Text>
          )}
          {!isOnline && lastSeenText ? (
            <Text style={[styles.distance, { color: colors.muted }]}>
              Last seen {lastSeenText}
            </Text>
          ) : null}
        </View>

        {/* Bio / About */}
        {userBio ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>About</Text>
            <Text style={[styles.cardText, { color: colors.foreground }]}>{userBio}</Text>
          </View>
        ) : null}

        {/* Interests / Tags */}
        {interests.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Interests</Text>
            <View style={styles.interestsGrid}>
              {interests.map((interest) => (
                <View key={interest} style={[styles.interestChip, { backgroundColor: colors.primary }]}>
                  <Text style={styles.interestText}>{interest.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Private photos info */}
        {privateCount > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.privateInfoRow}>
              <IconSymbol name="lock.fill" size={18} color={colors.error} />
              <View style={styles.privateInfoText}>
                <Text style={[styles.privateInfoTitle, { color: colors.foreground }]}>
                  {privateCount} Private Photo{privateCount > 1 ? "s" : ""}
                </Text>
                <Text style={[styles.privateInfoSub, { color: colors.muted }]}>
                  Request access to view private photos
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tap Buttons */}
        <View style={styles.tapSection}>
          <Text style={[styles.tapTitle, { color: colors.foreground }]}>Send a Tap</Text>
          <View style={styles.tapRow}>
            {(Object.keys(TAP_TYPES) as TapType[]).map((type) => {
              const info = TAP_TYPES[type];
              const isSent = tapSent === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => handleTap(type)}
                  style={({ pressed }) => [
                    styles.tapBtn,
                    {
                      backgroundColor: isSent ? colors.primary + "20" : colors.surface,
                      borderColor: isSent ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Text style={styles.tapEmoji}>{info.emoji}</Text>
                  <Text style={[styles.tapLabel, { color: isSent ? colors.primary : colors.foreground }]}>
                    {info.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.messageButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
            <Text style={styles.messageButtonText}>Message</Text>
          </Pressable>

          <Pressable
            onPress={handleFavorite}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: isFavorite ? colors.warning : colors.border },
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
          >
            <IconSymbol
              name={isFavorite ? "star.fill" : "star"}
              size={22}
              color={isFavorite ? colors.warning : colors.muted}
            />
          </Pressable>
        </View>

        {/* Safety Section */}
        <View style={styles.safetySection}>
          <Pressable
            onPress={handleBlock}
            style={({ pressed }) => [
              styles.safetyBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="nosign" size={18} color={colors.error} />
            <Text style={[styles.safetyText, { color: colors.error }]}>Block</Text>
          </Pressable>
          <Text style={[styles.safetySep, { color: colors.border }]}>|</Text>
          <Pressable
            onPress={handleReport}
            style={({ pressed }) => [
              styles.safetyBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="exclamationmark.shield.fill" size={18} color={colors.error} />
            <Text style={[styles.safetyText, { color: colors.error }]}>Report</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 8,
  },
  onlineBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  privateOverlay: {
    position: "absolute",
    bottom: 40,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  privateOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  nameSection: {
    alignItems: "center",
    paddingVertical: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distance: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  privateInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  privateInfoText: {
    flex: 1,
  },
  privateInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  privateInfoSub: {
    fontSize: 13,
    marginTop: 2,
  },
  // Taps
  tapSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tapTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  tapRow: {
    flexDirection: "row",
    gap: 10,
  },
  tapBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tapEmoji: {
    fontSize: 28,
  },
  tapLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  // Actions
  actions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  // Safety
  safetySection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  safetyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  safetyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  safetySep: {
    fontSize: 16,
  },
});
