import { Text, View, Pressable, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import * as Auth from "@/lib/_core/auth";
import { isRegistrationComplete } from "@/lib/storage";

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    isRegistrationComplete().then(setSetupDone);
  }, []);

  const handleGetStarted = () => {
    if (setupDone) {
      router.replace("/(tabs)");
    } else {
      router.push("/age-gate");
    }
  };

  const handleDemoMode = async () => {
    setLoading(true);
    try {
      const demoUser: Auth.User = {
        id: 999,
        openId: "demo-user-001",
        name: "Demo User",
        email: "demo@gusha.app",
        loginMethod: "demo",
        lastSignedIn: new Date(),
      };
      await Auth.setUserInfo(demoUser);
      if (Platform.OS === "web") {
        window.localStorage.setItem("demo_mode", "true");
      }
      await Auth.completeLogin("demo-session-token", demoUser);
    } catch (err) {
      console.error("[Welcome] Demo mode error:", err);
      Alert.alert("Error", "Failed to start demo mode");
    } finally {
      setLoading(false);
    }
  };

  const handleTryDemo = () => {
    if (setupDone) {
      handleDemoMode();
    } else {
      router.push("/age-gate");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.heroSection}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Gusha
          </Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>
            Meet people. Break the ice with games.
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <FeatureRow
            emoji="🎮"
            title="Icebreaker Games"
            description="Play fun games with people"
            blockColor="#FF6B6B"
          />
          <FeatureRow
            emoji="📡"
            title="Radar"
            description="See who's around you"
            blockColor="#D946A8"
          />
          <FeatureRow
            emoji="💬"
            title="Community Chat"
            description="Connect and chat with new people"
            blockColor="#FF6B35"
          />
        </View>

        <View style={styles.actionSection}>
          <Pressable
            onPress={handleGetStarted}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              loading && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {setupDone ? "Continue" : "Get Started"}
              </Text>
            )}
          </Pressable>

          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            No account sign-in required to get started.
          </Text>

          <Pressable
            onPress={handleTryDemo}
            disabled={loading}
            style={({ pressed }) => [
              styles.demoButton,
              { borderColor: colors.muted },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.demoButtonText, { color: colors.muted }]}>
              Try Demo Mode
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

function FeatureRow({
  emoji,
  title,
  description,
  blockColor,
}: {
  emoji: string;
  title: string;
  description: string;
  blockColor: string;
}) {
  return (
    <View style={[styles.featureRow, { backgroundColor: blockColor }]}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 16,
  },
  appName: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
    opacity: 0.75,
  },
  featuresSection: {
    gap: 10,
    paddingVertical: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  featureEmoji: {
    fontSize: 30,
    width: 40,
    textAlign: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
  },
  featureDesc: {
    fontSize: 13,
    marginTop: 2,
    color: "rgba(255,255,255,0.85)",
  },
  actionSection: {
    alignItems: "center",
    paddingBottom: 20,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  demoButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 12,
    borderWidth: 1,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
