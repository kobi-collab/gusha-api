import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { UserAvatar } from "@/components/user-avatar";
import {
  NearbyUser,
  SearchPreferences,
  DEFAULT_SEARCH_PREFERENCES,
  formatDistance,
  getPrivatePhotoCount,
  getMoodByKey,
  MOOD_OPTIONS,
  MoodKey,
} from "@/lib/mock-data";
import { loadMyMood, saveMyMood } from "@/lib/storage";
import { loadSearchPreferences } from "@/lib/storage";
import { useDiscovery } from "@/hooks/use-discovery";
import { useRadarCheckIn } from "@/hooks/use-radar-check-in";
import { useAuth } from "@/hooks/use-auth";
import { isExplicitDemoMode } from "@/lib/app-mode";
import { trpc } from "@/lib/trpc";

function isDemoMode(userLoginMethod?: string | null): boolean {
  return isExplicitDemoMode(userLoginMethod);
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADAR_PADDING = 2;
const RADAR_SIZE = SCREEN_WIDTH - RADAR_PADDING * 2;
const RADAR_CENTER = RADAR_SIZE / 2;
const RING_COUNT = 4;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// ── Collision avoidance ──
// Given an array of {x, y} positions, push overlapping dots apart
function resolveCollisions(
  positions: { x: number; y: number; id: string }[],
  dotSize: number,
  zoom: number
) {
  const minDist = dotSize * 1.5; // dots should be at least this far apart
  const result = positions.map((p) => ({ ...p }));

  // Simple iterative repulsion (2 passes)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dx = result[j].x - result[i].x;
        const dy = result[j].y - result[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          result[i].x -= nx * overlap;
          result[i].y -= ny * overlap;
          result[j].x += nx * overlap;
          result[j].y += ny * overlap;
        } else if (dist === 0) {
          // Exactly same position – nudge randomly
          result[j].x += minDist * 0.5;
          result[j].y += minDist * 0.3;
        }
      }
    }
  }
  return result;
}

// ── UserDot Component ──
function UserDot({
  x,
  y,
  user,
  zoom,
  onPress,
  colors,
}: {
  x: number;
  y: number;
  user: NearbyUser;
  zoom: number;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const dotSize = Math.max(16, 40 / zoom);
  const userMood = getMoodByKey(user.mood);

  return (
    <Animated.View
      entering={FadeIn.delay(Math.random() * 400).duration(350)}
      style={[
        styles.userDot,
        {
          left: x - dotSize / 2,
          top: y - dotSize / 2 - 10,
          width: dotSize,
          height: dotSize + 24,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] },
        ]}
      >
        <View>
          {userMood && (
            <View style={[
              styles.moodRing,
              {
                width: dotSize + 8,
                height: dotSize + 8,
                borderRadius: (dotSize + 8) / 2,
                borderColor: userMood.color,
                marginLeft: -4,
                marginTop: -4,
                position: "absolute",
              },
            ]} />
          )}
          <UserAvatar
            userId={user.id}
            name={user.name}
            photoUri={user.photoUrl || null}
            gallery={user.gallery}
            size={dotSize}
            isOnline={user.isOnline}
            onlineColor={colors.success}
            showPrivateIndicator={getPrivatePhotoCount(user.gallery) > 0}
          />
          {userMood && (
            <View style={[
              styles.moodBubble,
              {
                backgroundColor: userMood.color,
                width: Math.max(10, 18 / zoom),
                height: Math.max(10, 18 / zoom),
                borderRadius: Math.max(5, 9 / zoom),
              },
            ]}>
              <Text style={[styles.moodBubbleEmoji, { fontSize: Math.max(6, 10 / zoom) }]}>
                {userMood.emoji}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      {zoom >= 1.5 && zoom < 2.5 && (
        <>
          <Text
            style={[styles.userDotName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {user.name}
          </Text>
          <Text style={[styles.userDotDist, { color: colors.muted }]}>
            {formatDistance(user.distance)}
          </Text>
        </>
      )}
    </Animated.View>
  );
}

// ── Nearest List Item ──
function NearestItem({
  user,
  onPress,
  colors,
}: {
  user: NearbyUser;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nearestItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <UserAvatar
        userId={user.id}
        name={user.name}
        photoUri={user.photoUrl || null}
        gallery={user.gallery}
        size={40}
        isOnline={user.isOnline}
        onlineColor={colors.success}
      />
      <View style={styles.nearestInfo}>
        <Text
          style={[styles.nearestName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {user.name}, {user.age}
        </Text>
        <Text style={[styles.nearestDist, { color: colors.primary }]}>
          {formatDistance(user.distance)}
        </Text>
      </View>
      <View style={styles.nearestInterests}>
        {user.interests.slice(0, 2).map((interest) => (
          <View
            key={interest}
            style={[styles.miniChip, { backgroundColor: colors.primary + "20" }]}
          >
            <Text
              style={[styles.miniChipText, { color: colors.primary }]}
              numberOfLines={1}
            >
              {interest}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// ── User Popup Modal ──
function UserPopup({
  user,
  visible,
  onClose,
  onChat,
  onViewProfile,
  onBlock,
  colors,
}: {
  user: NearbyUser | null;
  visible: boolean;
  onClose: () => void;
  onChat: () => void;
  onViewProfile: () => void;
  onBlock: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (!user) return null;
  const popupMood = getMoodByKey(user.mood);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.popupOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.popupCard,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => {}}
        >
          {/* Avatar */}
          <View style={styles.popupAvatarRow}>
            <UserAvatar
              userId={user.id}
              name={user.name}
              photoUri={user.photoUrl || null}
              gallery={user.gallery}
              size={80}
              isOnline={user.isOnline}
              onlineColor={colors.success}
              showPrivateIndicator={getPrivatePhotoCount(user.gallery) > 0}
            />
            <View style={styles.popupNameSection}>
              <Text style={[styles.popupName, { color: colors.foreground }]}>
                {user.name}, {user.age}
              </Text>
              <Text style={[styles.popupDistance, { color: colors.primary }]}>
                {formatDistance(user.distance)} away
              </Text>
              {popupMood && (
                <View style={[styles.popupOnlineRow, { marginTop: 2 }]}>
                  <Text style={{ fontSize: 14 }}>{popupMood.emoji}</Text>
                  <Text style={[styles.popupOnlineText, { color: popupMood.color }]}>
                    {popupMood.label}
                  </Text>
                </View>
              )}
              {user.isOnline && (
                <View style={styles.popupOnlineRow}>
                  <View
                    style={[
                      styles.popupOnlineDot,
                      { backgroundColor: colors.success },
                    ]}
                  />
                  <Text
                    style={[styles.popupOnlineText, { color: colors.success }]}
                  >
                    Online
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          {user.bio ? (
            <Text
              style={[styles.popupBio, { color: colors.muted }]}
              numberOfLines={3}
            >
              {user.bio}
            </Text>
          ) : null}

          {/* Interests */}
          {user.interests.length > 0 && (
            <View style={styles.popupInterests}>
              {user.interests.map((interest) => (
                <View
                  key={interest}
                  style={[
                    styles.popupChip,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Text
                    style={[styles.popupChipText, { color: colors.primary }]}
                  >
                    {interest}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.popupActions}>
            <Pressable
              onPress={onChat}
              style={({ pressed }) => [
                styles.popupChatBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
              <Text style={styles.popupChatBtnText}>Chat</Text>
            </Pressable>
            <Pressable
              onPress={onViewProfile}
              style={({ pressed }) => [
                styles.popupProfileBtn,
                { borderColor: colors.primary },
                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text
                style={[styles.popupProfileBtnText, { color: colors.primary }]}
              >
                View Profile
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onBlock}
            style={({ pressed }) => [
              styles.popupBlockBtn,
              { borderColor: colors.error },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="nosign" size={16} color={colors.error} />
            <Text style={[styles.popupBlockText, { color: colors.error }]}>Block</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Radar Screen ──
export default function RadarScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const sweepRotation = useSharedValue(0);
  const [prefs, setPrefs] = useState<SearchPreferences>({
    ...DEFAULT_SEARCH_PREFERENCES,
  });
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [popupUser, setPopupUser] = useState<NearbyUser | null>(null);
  const [myMood, setMyMood] = useState<MoodKey | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const demo = isDemoMode(user?.loginMethod);
  const radar = useRadarCheckIn({ demo });
  const { users: discoveryUsers, loading: discoveryLoading, refetch } = useDiscovery(
    prefs,
    { latitude: radar.myLatitude, longitude: radar.myLongitude }
  );
  const blockMutation = trpc.safety.block.useMutation({
    onSuccess: () => refetch(),
  });

  // Pinch gesture state
  const savedScale = useRef(1);

  useEffect(() => {
    sweepRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
    loadMyMood().then(setMyMood);
  }, []);

  const handleMoodSelect = useCallback((mood: MoodKey | null) => {
    setMyMood(mood);
    saveMyMood(mood);
    setShowMoodPicker(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMyMood().then(setMyMood);
      loadSearchPreferences().then((p) => {
        setPrefs(p);
        let count = 0;
        if (p.minAge !== DEFAULT_SEARCH_PREFERENCES.minAge) count++;
        if (p.maxAge !== DEFAULT_SEARCH_PREFERENCES.maxAge) count++;
        if (p.maxDistance !== DEFAULT_SEARCH_PREFERENCES.maxDistance) count++;
        if (p.interests.length > 0) count++;
        setActiveFilterCount(count);
      });
    }, [])
  );

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweepRotation.value}deg` }],
  }));

  const maxDistMeters = prefs.maxDistance * 1000;
  const radarRadius = RADAR_CENTER - 10;
  const ringRadii = Array.from(
    { length: RING_COUNT },
    (_, i) => ((i + 1) / RING_COUNT) * radarRadius
  );
  const distanceLabels = ringRadii.map((_, i) =>
    formatDistance(((i + 1) / RING_COUNT) * maxDistMeters)
  );

  // Nearby users — only when manually checked in (including demo)
  const radarUsers = radar.isCheckedIn ? discoveryUsers : [];

  const filteredUsers = useMemo(() => {
    return radarUsers.filter((user) => {
      if (user.distance > maxDistMeters) return false;
      if (user.age < prefs.minAge || user.age > prefs.maxAge) return false;
      if (prefs.interests.length > 0) {
        const hasMatch = user.interests.some((i) =>
          prefs.interests.includes(i)
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [prefs, maxDistMeters, radarUsers]);

  // Nearest 5 sorted by distance
  const nearest5 = useMemo(() => {
    return [...filteredUsers].sort((a, b) => a.distance - b.distance).slice(0, 5);
  }, [filteredUsers]);

  // Compute dot positions with collision avoidance
  const dotPositions = useMemo(() => {
    const rawPositions = filteredUsers.map((user) => {
      const normalizedDist = Math.min(user.distance / maxDistMeters, 0.95);
      const r = normalizedDist * radarRadius;
      const angleRad = ((user.bearing - 90) * Math.PI) / 180;
      const x = RADAR_CENTER + r * Math.cos(angleRad);
      const y = RADAR_CENTER + r * Math.sin(angleRad);
      return { x, y, id: user.id };
    });
    return resolveCollisions(rawPositions, 44, zoom);
  }, [filteredUsers, maxDistMeters, radarRadius, zoom]);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.current = zoom;
    })
    .onUpdate((e) => {
      const newScale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, savedScale.current * e.scale)
      );
      setZoom(newScale);
    })
    .runOnJS(true);

  // Double-tap to toggle zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      setZoom((prev) => (prev > 1.5 ? 1 : 2));
    })
    .runOnJS(true);

  const composedGesture = Gesture.Race(pinchGesture, doubleTapGesture);

  const handleDotPress = useCallback((user: NearbyUser) => {
    setPopupUser(user);
  }, []);

  const handlePopupChat = useCallback(() => {
    if (!popupUser) return;
    setPopupUser(null);
    router.push({
      pathname: "/chat-room",
      params: {
        conversationId: `c_${popupUser.id}`,
        userName: popupUser.name,
        userId: popupUser.id,
      },
    });
  }, [popupUser, router]);

  const handlePopupViewProfile = useCallback(() => {
    if (!popupUser) return;
    setPopupUser(null);
    router.push({
      pathname: "/user-detail",
      params: {
        userId: popupUser.id,
        userName: popupUser.name,
        userAge: popupUser.age.toString(),
        userBio: popupUser.bio,
        userDistance: popupUser.distance.toString(),
        userOnline: popupUser.isOnline ? "1" : "0",
        userInterests: popupUser.interests.join(","),
        userPhoto: popupUser.photoUrl || "",
        userGallery: JSON.stringify(popupUser.gallery || []),
      },
    });
  }, [popupUser, router]);

  const handleNearestPress = useCallback(
    (user: NearbyUser) => {
      setPopupUser(user);
    },
    []
  );

  const handleCheckInPress = useCallback(async () => {
    if (radar.isCheckedIn) {
      await radar.checkOut();
      return;
    }
    if (!isAuthenticated && !demo) {
      Alert.alert(
        "Connection Required",
        "Gusha needs to connect to your account before you can check in. Tap Continue on the welcome screen to reconnect."
      );
      return;
    }
    if (!radar.hasConsent) {
      setShowConsentModal(true);
      return;
    }
    await radar.checkIn();
  }, [radar, isAuthenticated, demo]);

  const handleConsentAllow = useCallback(async () => {
    if (!isAuthenticated && !demo) {
      setShowConsentModal(false);
      Alert.alert(
        "Connection Required",
        "Gusha needs to connect to your account before you can check in. Tap Continue on the welcome screen to reconnect."
      );
      return;
    }
    await radar.grantConsent();
    setShowConsentModal(false);
    await radar.checkIn();
  }, [radar, isAuthenticated, demo]);

  const handleConsentDecline = useCallback(async () => {
    await radar.declineConsent();
    setShowConsentModal(false);
  }, [radar]);

  const handlePopupBlock = useCallback(() => {
    if (!popupUser) return;
    const userName = popupUser.name;
    const numId = parseInt(popupUser.id, 10);
    Alert.alert("Block User", `Are you sure you want to block ${userName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: () => {
          if (demo) {
            setPopupUser(null);
            Alert.alert("Blocked", `${userName} has been blocked.`);
            return;
          }
          if (!isAuthenticated) {
            Alert.alert(
              "Connection Required",
              "Gusha needs to connect to your account before you can block users."
            );
            return;
          }
          if (isNaN(numId) || numId <= 0) {
            Alert.alert("Cannot Block", "This user cannot be blocked right now.");
            return;
          }
          blockMutation.mutate(
            { userId: numId },
            {
              onSuccess: () => {
                setPopupUser(null);
                Alert.alert("Blocked", `${userName} has been blocked.`);
              },
              onError: () => {
                Alert.alert("Block Failed", "Could not block this user. Please try again.");
              },
            }
          );
        },
      },
    ]);
  }, [popupUser, isAuthenticated, blockMutation, demo]);

  // Zoom indicator text
  const zoomLabel =
    zoom > 1.05 ? `${zoom.toFixed(1)}x` : "";

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header - compact */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Radar
        </Text>
        <View style={styles.headerRight}>
          {zoomLabel ? (
            <View
              style={[
                styles.zoomBadge,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.zoomBadgeText, { color: colors.primary }]}>
                {zoomLabel}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push("/search-preferences")}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor:
                  activeFilterCount > 0 ? colors.primary : colors.surface,
                borderColor:
                  activeFilterCount > 0 ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="slider.horizontal.3"
              size={20}
              color={activeFilterCount > 0 ? "#fff" : colors.primary}
            />
            {activeFilterCount > 0 && (
              <View
                style={[styles.filterBadge, { backgroundColor: colors.error }]}
              >
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Check-in bar */}
      <View style={[styles.checkInBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {radar.isCheckedIn ? (
            <>
              <View style={styles.checkInInfo}>
                <View style={[styles.checkInDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.checkInText, { color: colors.foreground }]}>
                  Visible on radar
                  {radar.checkInExpiresAt
                    ? ` · until ${new Date(radar.checkInExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </Text>
              </View>
              <Pressable
                onPress={handleCheckInPress}
                disabled={radar.isWorking}
                style={({ pressed }) => [
                  styles.checkInButton,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {radar.isWorking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.checkInButtonText, { color: colors.foreground }]}>Check Out</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.checkInHint, { color: colors.muted }]}>
                Check in to appear on the radar and see nearby users
              </Text>
              <Pressable
                onPress={handleCheckInPress}
                disabled={radar.isWorking}
                style={({ pressed }) => [
                  styles.checkInButton,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {radar.isWorking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.checkInButtonText, { color: "#fff" }]}>Check In</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

      {/* Radar with pinch-to-zoom — fills all remaining space */}
      <View style={styles.radarContainer}>
        {/* Mood Selector overlaid on top of radar */}
        <View style={styles.moodOverlay}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodSelectorRow}
          >
            {myMood ? (
              <View style={styles.myMoodBanner}>
                <Text style={[styles.myMoodText, { color: colors.foreground }]}>
                  {getMoodByKey(myMood)?.emoji} {getMoodByKey(myMood)?.label}
                </Text>
                <Pressable onPress={() => handleMoodSelect(null)}>
                  <Text style={[styles.myMoodClear, { color: colors.muted }]}>Clear</Text>
                </Pressable>
              </View>
            ) : (
              MOOD_OPTIONS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => handleMoodSelect(m.key)}
                  style={({ pressed }) => [
                    styles.moodChip,
                    { backgroundColor: m.color },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Text style={styles.moodChipEmoji}>{m.emoji}</Text>
                  <Text style={styles.moodChipLabel}>{m.label}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
        <GestureDetector gesture={composedGesture}>
          <View
            style={[
              styles.radarBg,
              {
                width: RADAR_SIZE,
                height: RADAR_SIZE,
                borderRadius: RADAR_SIZE / 2,
                backgroundColor: colors.surface,
                transform: [{ scale: zoom }],
              },
            ]}
          >
            {/* SVG Rings + Crosshair */}
            <Svg
              width={RADAR_SIZE}
              height={RADAR_SIZE}
              style={StyleSheet.absoluteFill}
            >
              {ringRadii.map((r, i) => (
                <Circle
                  key={`ring-${i}`}
                  cx={RADAR_CENTER}
                  cy={RADAR_CENTER}
                  r={r}
                  stroke={colors.border}
                  strokeWidth={1}
                  fill="none"
                />
              ))}
              <Line
                x1={RADAR_CENTER}
                y1={10}
                x2={RADAR_CENTER}
                y2={RADAR_SIZE - 10}
                stroke={colors.border}
                strokeWidth={0.5}
                opacity={0.5}
              />
              <Line
                x1={10}
                y1={RADAR_CENTER}
                x2={RADAR_SIZE - 10}
                y2={RADAR_CENTER}
                stroke={colors.border}
                strokeWidth={0.5}
                opacity={0.5}
              />
              {ringRadii.map((r, i) => (
                <SvgText
                  key={`label-${i}`}
                  x={RADAR_CENTER + 4}
                  y={RADAR_CENTER - r + 14}
                  fill={colors.muted}
                  fontSize={10 / zoom}
                  fontWeight="500"
                  opacity={0.7}
                >
                  {distanceLabels[i]}
                </SvgText>
              ))}
              <SvgText
                x={RADAR_CENTER}
                y={20}
                fill={colors.muted}
                fontSize={11 / zoom}
                fontWeight="600"
                textAnchor="middle"
              >
                N
              </SvgText>
              <SvgText
                x={RADAR_SIZE - 14}
                y={RADAR_CENTER + 4}
                fill={colors.muted}
                fontSize={11 / zoom}
                fontWeight="600"
                textAnchor="middle"
              >
                E
              </SvgText>
              <SvgText
                x={RADAR_CENTER}
                y={RADAR_SIZE - 10}
                fill={colors.muted}
                fontSize={11 / zoom}
                fontWeight="600"
                textAnchor="middle"
              >
                S
              </SvgText>
              <SvgText
                x={14}
                y={RADAR_CENTER + 4}
                fill={colors.muted}
                fontSize={11 / zoom}
                fontWeight="600"
                textAnchor="middle"
              >
                W
              </SvgText>
            </Svg>

            {/* Sweep line */}
            <Animated.View
              style={[
                styles.sweepContainer,
                { width: RADAR_SIZE, height: RADAR_SIZE },
                sweepStyle,
              ]}
            >
              <View
                style={[
                  styles.sweepLine,
                  {
                    height: radarRadius,
                    left: RADAR_CENTER - 1,
                    bottom: RADAR_CENTER,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </Animated.View>

            {/* Center dot (me) */}
            <View
              style={[
                styles.centerDot,
                {
                  left: RADAR_CENTER - 24 / zoom,
                  top: RADAR_CENTER - 24 / zoom,
                  width: 48 / zoom,
                  height: 48 / zoom,
                  borderRadius: 24 / zoom,
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[styles.centerDotText, { fontSize: 14 / zoom }]}
              >
                ME
              </Text>
            </View>

            {/* User dots with collision-resolved positions */}
            {filteredUsers.map((user, idx) => {
              const pos = dotPositions[idx];
              if (!pos) return null;
              return (
                <UserDot
                  key={user.id}
                  x={pos.x}
                  y={pos.y}
                  user={user}
                  zoom={zoom}
                  onPress={() => handleDotPress(user)}
                  colors={colors}
                />
              );
            })}
          </View>
        </GestureDetector>

        {/* Bottom: count overlaid at bottom of radar */}
        {filteredUsers.length > 0 ? (
          <View style={styles.bottomOverlay}>
            <Text style={[styles.bottomText, { color: colors.muted }]}>
              {filteredUsers.length} people nearby
              {activeFilterCount > 0 ? " (filtered)" : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyRadarState}>
            <Text style={[styles.emptyRadarEmoji]}>📡</Text>
            <Text style={[styles.emptyRadarTitle, { color: colors.foreground }]}>
              {!demo && !radar.isCheckedIn
                ? "Check in to see nearby users"
                : discoveryLoading
                  ? "Loading..."
                  : "No one nearby"}
            </Text>
            <Text style={[styles.emptyRadarSubtitle, { color: colors.muted }]}>
              {!demo && !radar.isCheckedIn
                ? "Your location is shared only while you are checked in. You can check out anytime."
                : "Try adjusting your distance filters or check in again later."}
            </Text>
          </View>
        )}
      </View>

      {/* Map visibility consent */}
      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.consentOverlay}>
          <View style={[styles.consentCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <IconSymbol name="location.circle.fill" size={48} color={colors.primary} />
            <Text style={[styles.consentTitle, { color: colors.foreground }]}>
              Show you on the radar?
            </Text>
            <Text style={[styles.consentBody, { color: colors.muted }]}>
              Only when you check in, other users can see your approximate distance on the radar.
              You can decline, check out anytime, and block any user.
            </Text>
            <Pressable
              onPress={handleConsentAllow}
              style={({ pressed }) => [
                styles.consentPrimaryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.consentPrimaryText}>Allow & Check In</Text>
            </Pressable>
            <Pressable
              onPress={handleConsentDecline}
              style={({ pressed }) => [styles.consentSecondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.consentSecondaryText, { color: colors.muted }]}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Popup Modal */}
      <UserPopup
        user={popupUser}
        visible={popupUser !== null}
        onClose={() => setPopupUser(null)}
        onChat={handlePopupChat}
        onViewProfile={handlePopupViewProfile}
        onBlock={handlePopupBlock}
        colors={colors}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
    height: 48,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  zoomBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flex: 1,
    position: "relative",
  },
  moodOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  radarBg: {
    overflow: "hidden",
    position: "relative",
  },
  sweepContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  sweepLine: {
    position: "absolute",
    width: 2,
    opacity: 0.4,
    borderRadius: 1,
  },
  centerDot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  centerDotText: {
    color: "#fff",
    fontWeight: "800",
  },
  userDot: {
    position: "absolute",
    alignItems: "center",
    zIndex: 5,
  },
  userDotName: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    maxWidth: 60,
    textAlign: "center",
  },
  userDotDist: {
    fontSize: 9,
    fontWeight: "500",
  },

  bottomText: {
    fontSize: 14,
    fontWeight: "500",
  },
  zoomHint: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: "italic",
  },
  // ── Nearest 5 list ──
  nearestSection: {
    paddingBottom: 8,
  },
  nearestTitle: {
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  nearestList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  nearestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    width: 220,
  },
  nearestInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nearestName: {
    fontSize: 14,
    fontWeight: "600",
  },
  nearestDist: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  nearestInterests: {
    flexDirection: "column",
    gap: 3,
    marginLeft: 6,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  // ── Popup Modal ──
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  popupCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  popupAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  popupNameSection: {
    flex: 1,
  },
  popupName: {
    fontSize: 22,
    fontWeight: "800",
  },
  popupDistance: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  popupOnlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  popupOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  popupOnlineText: {
    fontSize: 13,
    fontWeight: "600",
  },
  popupBio: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  popupInterests: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  popupChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  popupChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  popupActions: {
    flexDirection: "row",
    gap: 12,
  },
  popupChatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  popupChatBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  popupProfileBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
  },
  popupProfileBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  popupBlockBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  popupBlockText: {
    fontSize: 15,
    fontWeight: "600",
  },
  checkInBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  checkInInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkInText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  checkInHint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  checkInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 88,
    alignItems: "center",
  },
  checkInButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  consentOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  consentCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  consentTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  consentBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  consentPrimaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  consentPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  consentSecondaryBtn: {
    paddingVertical: 10,
  },
  consentSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // ── Empty Radar State ──
  emptyRadarState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  emptyRadarEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyRadarTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyRadarSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Mood Radar styles
  moodRing: {
    borderWidth: 2.5,
  },
  moodBubble: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  moodBubbleEmoji: {
    fontSize: 10,
  },
  moodSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  moodChipEmoji: {
    fontSize: 14,
  },
  moodChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  myMoodBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
  },
  myMoodText: {
    fontSize: 13,
    fontWeight: "700",
  },
  myMoodClear: {
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
