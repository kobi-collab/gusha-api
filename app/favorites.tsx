import {
  Text, View, FlatList, Pressable, StyleSheet, Dimensions,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { formatDistance, getAvatarColor } from "@/lib/mock-data";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const COLS = 3;
const CELL_SIZE = (SCREEN_WIDTH - GRID_GAP * (COLS + 1)) / COLS;

interface FavoriteItem {
  id: string;
  name: string;
  age: number;
  distance: number;
  isOnline: boolean;
  photo: string;
}

export default function FavoritesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const favQuery = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  // Convert server data to display format
  const favorites: FavoriteItem[] = (favQuery.data as any[] || []).map((f: any) => ({
    id: String(f.favoriteUserId || f.id),
    name: `User ${f.favoriteUserId || f.id}`,
    age: 0,
    distance: 0,
    isOnline: false,
    photo: "",
  }));

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Favorites</Text>
        <View style={{ width: 32 }} />
      </View>

      {favQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="star.fill" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Favorites Yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            Tap the star icon on a profile to add them to your favorites
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          numColumns={COLS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={favQuery.isRefetching} onRefresh={() => favQuery.refetch()} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/user-detail", params: { userId: item.id, userName: item.name } })}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: getAvatarColor(item.id), alignItems: "center", justifyContent: "center" }]}>
                    <Text style={styles.cellInitials}>{item.name.split(" ").map((n) => n[0]).join("").toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.starBadge}>
                  <IconSymbol name="star.fill" size={14} color="#FFD700" />
                </View>
                {item.isOnline && (
                  <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.background }]} />
                )}
                <View style={styles.nameOverlay}>
                  <Text style={styles.cellName} numberOfLines={1}>{item.name}{item.age ? `, ${item.age}` : ""}</Text>
                  {item.distance > 0 && <Text style={styles.cellDistance}>{formatDistance(item.distance)}</Text>}
                </View>
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
  gridContent: { paddingHorizontal: GRID_GAP, paddingBottom: 20 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  cell: { borderRadius: 4, overflow: "hidden", position: "relative" },
  cellInitials: { color: "#fff", fontSize: 24, fontWeight: "700" },
  starBadge: { position: "absolute", top: 6, right: 6 },
  onlineDot: { position: "absolute", top: 6, left: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  nameOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: "rgba(0,0,0,0.55)" },
  cellName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cellDistance: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  emptySub: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 22 },
});
