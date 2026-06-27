import { useState, useCallback, useMemo } from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useDiscovery } from "@/hooks/use-discovery";
import { GAMES, GameInfo } from "@/lib/game-data";
import { NearbyUser } from "@/lib/mock-data";
import { UserAvatar } from "@/components/user-avatar";
import { isExplicitDemoMode } from "@/lib/app-mode";
import * as Haptics from "expo-haptics";

const DARK_BG = "#1A1A2E";

function isDemoMode(userLoginMethod?: string | null): boolean {
  return isExplicitDemoMode(userLoginMethod);
}

// Memory Match (#FFD700) is bright — needs dark ink; everything else gets white
function cardTextColor(gameColor: string): string {
  return gameColor === "#FFD700" ? "#1A1A2E" : "#fff";
}
function cardTextMuted(gameColor: string): string {
  return gameColor === "#FFD700" ? "rgba(26,26,46,0.6)" : "rgba(255,255,255,0.75)";
}

function GameCard({
  game,
  onPress,
}: {
  game: GameInfo;
  onPress: () => void;
}) {
  const ink = cardTextColor(game.color);
  const inkMuted = cardTextMuted(game.color);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gameCard,
        { backgroundColor: game.color },
        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Emoji — left */}
      <Text style={styles.gameEmoji}>{game.emoji}</Text>

      {/* Info — centre */}
      <View style={styles.gameInfo}>
        <Text style={[styles.gameTitle, { color: ink }]} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={[styles.gameDesc, { color: inkMuted }]} numberOfLines={2}>
          {game.description}
        </Text>
        <View style={styles.gameMeta}>
          <Text style={[styles.gameMetaText, { color: inkMuted }]}>{game.players}</Text>
          <Text style={[styles.gameMetaDot, { color: inkMuted }]}>·</Text>
          <Text style={[styles.gameMetaText, { color: inkMuted }]}>{game.duration}</Text>
        </View>
      </View>

      {/* Play button — right */}
      <View style={styles.playButton}>
        <Text style={[styles.playButtonText, { color: game.color }]}>Play</Text>
      </View>
    </Pressable>
  );
}

function OpponentCard({
  user,
  colors,
  isSelected,
  onPress,
}: {
  user: NearbyUser;
  colors: ReturnType<typeof useColors>;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.opponentCard,
        {
          backgroundColor: isSelected ? colors.primary + "25" : "rgba(255,255,255,0.07)",
          borderColor: isSelected ? colors.primary : "rgba(255,255,255,0.15)",
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <UserAvatar
        userId={user.id}
        name={user.name}
        photoUri={user.photoUrl || null}
        gallery={user.gallery}
        size={44}
        isOnline={user.isOnline}
        onlineColor={colors.success}
      />
      <Text
        style={[
          styles.opponentName,
          { color: isSelected ? colors.primary : "#fff" },
        ]}
        numberOfLines={1}
      >
        {user.name}
      </Text>
      {isSelected && (
        <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
          <Text style={styles.selectedCheckText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function GamesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const demo = isDemoMode(user?.loginMethod);
  const { users: nearbyUsers } = useDiscovery();
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<NearbyUser | null>(null);

  const users = useMemo(() => {
    if (demo || isAuthenticated) return nearbyUsers;
    return [];
  }, [demo, isAuthenticated, nearbyUsers]);
  const onlineUsers = demo
    ? users.filter((u) => u.isOnline).slice(0, 10)
    : users.slice(0, 10);

  const handleGameSelect = useCallback((game: GameInfo) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedGame(game);
    setSelectedOpponent(null);
  }, []);

  const handleOpponentSelect = useCallback((user: NearbyUser) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedOpponent(user);
  }, []);

  const handleStartGame = useCallback(() => {
    if (!selectedGame || !selectedOpponent) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/game-play",
      params: {
        gameType: selectedGame.type,
        opponentId: selectedOpponent.id,
        opponentName: selectedOpponent.name,
        opponentPhoto: selectedOpponent.photoUrl || "",
      },
    });
  }, [selectedGame, selectedOpponent, router]);

  const handleBack = useCallback(() => {
    setSelectedGame(null);
    setSelectedOpponent(null);
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.darkScreen}>

        {!selectedGame ? (
          // ── Game Selection ──
          <FlatList
            data={GAMES}
            keyExtractor={(item) => item.type}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Games</Text>
                <Text style={styles.headerSubtitle}>Play together, connect better</Text>
              </View>
            }
            renderItem={({ item }) => (
              <GameCard
                game={item}
                onPress={() => handleGameSelect(item)}
              />
            )}
            ListFooterComponent={<View style={styles.footerSpacer} />}
          />
        ) : (
          // ── Opponent Selection ──
          <View style={styles.opponentSection}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.backText, { color: colors.primary }]}>
                ← Back to games
              </Text>
            </Pressable>

            <View
              style={[
                styles.selectedGameBanner,
                { backgroundColor: selectedGame.color + "22", borderColor: selectedGame.color + "55" },
              ]}
            >
              <Text style={styles.selectedGameEmoji}>{selectedGame.emoji}</Text>
              <Text style={[styles.selectedGameTitle, { color: selectedGame.color }]}>
                {selectedGame.title}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Choose your opponent</Text>
            <Text style={styles.sectionSubtitle}>
              {onlineUsers.length} people online nearby
            </Text>

            {onlineUsers.length === 0 ? (
              <View style={styles.emptyOpponents}>
                <Text style={styles.emptyOpponentsEmoji}>👀</Text>
                <Text style={styles.emptyOpponentsTitle}>No one nearby right now</Text>
                <Text style={styles.emptyOpponentsSubtitle}>
                  Check in on the Radar tab so others can find you, then come back to play.
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)")}
                  style={({ pressed }) => [
                    styles.emptyRadarButton,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.emptyRadarButtonText}>Go to Radar</Text>
                </Pressable>
                <Pressable
                  onPress={handleBack}
                  style={({ pressed }) => [
                    styles.emptyBackButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.emptyBackButtonText, { color: colors.primary }]}>
                    ← Back to Games
                  </Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={onlineUsers}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.opponentRow}
                contentContainerStyle={styles.opponentList}
                renderItem={({ item }) => (
                  <OpponentCard
                    user={item}
                    colors={colors}
                    isSelected={selectedOpponent?.id === item.id}
                    onPress={() => handleOpponentSelect(item)}
                  />
                )}
              />
            )}

            {selectedOpponent && (
              <View style={styles.startButtonContainer}>
                <Pressable
                  onPress={handleStartGame}
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: selectedGame.color },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.startButtonText,
                      { color: cardTextColor(selectedGame.color) },
                    ]}
                  >
                    Start {selectedGame.title} with {selectedOpponent.name}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ── Wrapper ──
  darkScreen: {
    flex: 1,
    backgroundColor: DARK_BG,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 6,
    color: "rgba(255,255,255,0.5)",
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // ── Game Card ──
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    height: 120,
    borderRadius: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  gameEmoji: {
    fontSize: 48,
    width: 58,
    textAlign: "center",
  },
  gameInfo: {
    flex: 1,
    gap: 4,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  gameDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  gameMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  gameMetaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  gameMetaDot: {
    fontSize: 12,
  },
  playButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Footer spacer ──
  footerSpacer: {
    height: 16,
  },

  // ── Opponent empty state ──
  emptyOpponents: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 8,
  },
  emptyOpponentsEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyOpponentsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyOpponentsSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyRadarButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyRadarButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyBackButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emptyBackButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Opponent Selection ──
  opponentSection: {
    flex: 1,
  },
  backRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectedGameBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  selectedGameEmoji: {
    fontSize: 28,
  },
  selectedGameTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    paddingHorizontal: 20,
    color: "#fff",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 3,
    marginBottom: 14,
    color: "rgba(255,255,255,0.45)",
  },
  opponentList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  opponentRow: {
    gap: 10,
    marginBottom: 10,
  },
  opponentCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  opponentName: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCheckText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  startButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: DARK_BG,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
