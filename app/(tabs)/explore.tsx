import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DEMO_NEARBY_USERS } from "@/lib/demo-data";
import { isExplicitDemoMode } from "@/lib/app-mode";
import { useDemoRadarStatus } from "@/lib/demo-radar";

const { width } = Dimensions.get("window");
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const TILE_SIZE = (width - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type ExploreMode = "nearby" | "world";

function isDemoMode(userLoginMethod?: string | null): boolean {
  return isExplicitDemoMode(userLoginMethod);
}

/** Popular cities for the World picker */
const POPULAR_CITIES = [
  { name: "Tel Aviv", country: "Israel", emoji: "🇮🇱" },
  { name: "New York", country: "USA", emoji: "🇺🇸" },
  { name: "London", country: "UK", emoji: "🇬🇧" },
  { name: "Berlin", country: "Germany", emoji: "🇩🇪" },
  { name: "Amsterdam", country: "Netherlands", emoji: "🇳🇱" },
  { name: "Barcelona", country: "Spain", emoji: "🇪🇸" },
  { name: "Paris", country: "France", emoji: "🇫🇷" },
  { name: "Los Angeles", country: "USA", emoji: "🇺🇸" },
  { name: "San Francisco", country: "USA", emoji: "🇺🇸" },
  { name: "Toronto", country: "Canada", emoji: "🇨🇦" },
  { name: "Sydney", country: "Australia", emoji: "🇦🇺" },
  { name: "Bangkok", country: "Thailand", emoji: "🇹🇭" },
];

/** Map demo users to a normalised profile shape */
function demoProfiles() {
  return DEMO_NEARBY_USERS.map((u) => ({
    id: Number(u.id.replace("demo-", "")),
    userId: Number(u.id.replace("demo-", "")),
    displayName: u.displayName,
    age: u.age,
    gallery: u.gallery,
    demoId: u.id,
  }));
}

export default function ExploreScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();

  const demo = isDemoMode(user?.loginMethod);
  const demoRadar = useDemoRadarStatus();

  const [mode, setMode] = useState<ExploreMode>("nearby");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canExplore = true;

  // Fetch profiles from server — city=undefined means "nearby / no filter"
  // enabled only when: not demo, has access, and (nearby always | world only after city chosen)
  const queryCity =
    mode === "world" ? (selectedCity ?? undefined) : undefined;
  const queryEnabled =
    !demo && canExplore && (mode === "nearby" || !!selectedCity);

  const { data: serverProfiles, isLoading } = trpc.discover.explore.useQuery(
    { city: queryCity, limit: 100 },
    { enabled: queryEnabled }
  );

  // Profiles shown in the grid
  const profiles = useMemo(() => {
    if (demo) {
      return demoRadar.isCheckedIn ? demoProfiles() : [];
    }
    return serverProfiles ?? [];
  }, [demo, demoRadar.isCheckedIn, serverProfiles]);

  // For the world city search list (suggestions)
  const filteredCities = useMemo(() => {
    if (!searchQuery) return POPULAR_CITIES;
    const q = searchQuery.toLowerCase();
    return POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCitySelect = useCallback((cityName: string) => {
    setSelectedCity(cityName);
    setSearchQuery("");
  }, []);

  const handleProfilePress = useCallback(
    (item: any) => {
      if (demo) {
        router.push({
          pathname: "/chat-room",
          params: {
            conversationId: item.demoId ?? String(item.userId),
            userId: item.demoId ?? String(item.userId),
            userName: item.displayName ?? "User",
          },
        });
      } else {
        router.push({
          pathname: "/user-detail",
          params: { userId: String(item.userId ?? item.id) },
        });
      }
    },
    [demo]
  );

  const getPhotoUri = (profile: any) => {
    if (profile.gallery && Array.isArray(profile.gallery) && profile.gallery.length > 0) {
      const sorted = [...profile.gallery].sort((a: any, b: any) => a.order - b.order);
      return sorted[0]?.uri;
    }
    return null;
  };

  const renderProfile = useCallback(
    ({ item }: { item: any }) => {
      const photoUri = getPhotoUri(item);
      return (
        <Pressable
          onPress={() => handleProfilePress(item)}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.tileImage} contentFit="cover" />
          ) : (
            <View
              style={[
                styles.tileImage,
                styles.tileImagePlaceholder,
                { backgroundColor: colors.surface },
              ]}
            >
              <IconSymbol name="person.fill" size={32} color={colors.muted} />
            </View>
          )}
          <View style={styles.tileOverlay}>
            <Text style={styles.tileName} numberOfLines={1}>
              {item.displayName ?? "User"}
            </Text>
            {item.age ? <Text style={styles.tileAge}>{item.age}</Text> : null}
          </View>
        </Pressable>
      );
    },
    [colors, handleProfilePress]
  );

  // ─── World mode: city not yet selected → show search + suggestions ───────
  const showWorldSearch = mode === "world" && !selectedCity;

  // City label in header
  const headerTitle =
    mode === "nearby"
      ? "Nearby"
      : selectedCity
      ? `📍 ${selectedCity}${demo ? " (Demo)" : ""}`
      : "World";

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{headerTitle}</Text>
        {mode === "world" && selectedCity && (
          <Pressable
            onPress={() => {
              setSelectedCity(null);
              setSearchQuery("");
            }}
            style={({ pressed }) => [
              styles.changeCityBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="globe" size={16} color={colors.primary} />
            <Text style={[styles.changeCityText, { color: colors.primary }]}>Change</Text>
          </Pressable>
        )}
      </View>

      {/* Mode toggle: Nearby | World */}
      <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
        {(["nearby", "world"] as ExploreMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                if (m === "nearby") {
                  setSelectedCity(null);
                  setSearchQuery("");
                }
              }}
              style={[
                styles.toggleTab,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.toggleTabText,
                  { color: active ? colors.primary : colors.muted },
                ]}
              >
                {m === "nearby" ? "📡  Nearby" : "🌍  World"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {showWorldSearch ? (
        /* World mode — city picker */
        <View style={styles.cityPickerContainer}>
          <Text style={[styles.cityPickerTitle, { color: colors.foreground }]}>
            Where do you want to explore?
          </Text>
          {/* Search input */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search cities..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="done"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* City suggestions — in demo, show all cities; type to filter */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleCitySelect(item.name)}
                style={({ pressed }) => [
                  styles.cityItem,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.surface },
                ]}
              >
                <Text style={styles.cityEmoji}>{item.emoji}</Text>
                <View style={styles.cityInfo}>
                  <Text style={[styles.cityName, { color: colors.foreground }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cityCountry, { color: colors.muted }]}>
                    {item.country}
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </Pressable>
            )}
            contentContainerStyle={styles.cityList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      ) : isLoading && !demo ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            {mode === "nearby"
              ? "Finding people nearby..."
              : `Finding profiles in ${selectedCity}...`}
          </Text>
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="person.fill.questionmark" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {demo && !demoRadar.isCheckedIn
              ? "Check in on the Radar tab to explore nearby demo profiles."
              : mode === "nearby"
              ? "No one nearby yet"
              : `No profiles found${selectedCity ? ` in ${selectedCity}` : ""} yet`}
          </Text>
        </View>
      ) : (
        /* Profile grid */
        <>
          {mode === "world" && selectedCity && demo && (
            <View style={[styles.demoCityBanner, { backgroundColor: colors.surface }]}>
              <Text style={[styles.demoCityBannerText, { color: colors.muted }]}>
                Showing demo profiles for {selectedCity}
              </Text>
            </View>
          )}
          <FlatList
            data={profiles}
            keyExtractor={(item) => String(item.demoId ?? item.userId ?? item.id)}
            renderItem={renderProfile}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={{ gap: GRID_GAP }}
            contentContainerStyle={{ gap: GRID_GAP }}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
  },
  changeCityBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  changeCityText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  // Mode toggle
  toggleRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  toggleTabText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  // City picker
  cityPickerContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cityPickerTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  cityList: {
    paddingBottom: 40,
  },
  cityItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  cityEmoji: {
    fontSize: 28,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  cityCountry: {
    fontSize: 13,
    marginTop: 2,
  },
  // Profile grid
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.3,
    position: "relative" as const,
  },
  tileImage: {
    width: "100%" as const,
    height: "100%" as const,
  },
  tileImagePlaceholder: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tileOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  tileName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  tileAge: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
  },
  // Demo city banner
  demoCityBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  demoCityBannerText: {
    fontSize: 13,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
  },
  // Loading / empty
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center" as const,
  },
});
