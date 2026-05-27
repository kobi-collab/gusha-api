import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  isAgeVerified,
  isOnboardingComplete,
  isRegistrationComplete,
} from "@/lib/storage";

// ── Module-level direct state ──
// These are written synchronously by age-gate / onboarding immediately after
// a successful save, so auth-gate never has to wait on an async storage read.
// null = not yet set by a direct call (fall back to storage read).
let _ageOkDirect: boolean | null = null;
let _onboardingDoneDirect: boolean | null = null;

// Refs to the live React setState functions registered by useAuthGate while mounted.
let _setAgeOkRef: ((v: boolean) => void) | null = null;
let _setOnboardingDoneRef: ((v: boolean) => void) | null = null;
let _setRegistrationCompleteRef: ((v: boolean) => void) | null = null;

// Module-level ref so any screen can synchronously reset auth state before
// navigating to /age-gate, preventing the stale-ageOk redirect flash.
let _resetState: (() => void) | null = null;

/** Called by age-gate right after setAgeVerified(true) confirms. */
export function setAgeOkDirect(value: boolean) {
  _ageOkDirect = value;
  _setAgeOkRef?.(value);
}

/** Called by onboarding right after setOnboardingComplete() confirms. */
export function setOnboardingDoneDirect(value: boolean) {
  _onboardingDoneDirect = value;
  _setOnboardingDoneRef?.(value);
  if (value) {
    _setRegistrationCompleteRef?.(true);
  }
}

export function resetAuthState() {
  _ageOkDirect = null;
  _onboardingDoneDirect = null;
  _resetState?.();
}

/**
 * AuthGate monitors auth state and redirects:
 * - Incomplete registration → /welcome (then age-gate → onboarding)
 * - Complete registration → /(tabs)
 */
export function useAuthGate() {
  const { user, loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [gateChecked, setGateChecked] = useState(false);
  const [ageOk, setAgeOk] = useState<boolean>(() => _ageOkDirect ?? false);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => _onboardingDoneDirect ?? false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  useEffect(() => {
    _setAgeOkRef = setAgeOk;
    _setOnboardingDoneRef = setOnboardingDone;
    _setRegistrationCompleteRef = setRegistrationComplete;
    _resetState = () => {
      _ageOkDirect = null;
      _onboardingDoneDirect = null;
      setAgeOk(false);
      setOnboardingDone(false);
      setRegistrationComplete(false);
    };
    return () => {
      _setAgeOkRef = null;
      _setOnboardingDoneRef = null;
      _setRegistrationCompleteRef = null;
      _resetState = null;
    };
  }, []);

  const refreshGateState = async () => {
    const [verified, done, complete] = await Promise.all([
      isAgeVerified(),
      isOnboardingComplete(),
      isRegistrationComplete(),
    ]);
    if (_ageOkDirect === null) setAgeOk(verified);
    if (_onboardingDoneDirect === null) setOnboardingDone(done);
    setRegistrationComplete(complete);
  };

  useEffect(() => {
    (async () => {
      await refreshGateState();
      setGateChecked(true);
    })();
  }, []);

  useEffect(() => {
    const seg = segments[0];
    if (seg !== "age-gate" && seg !== "onboarding" && seg !== "welcome") return;
    refreshGateState();
  }, [segments[0]]);

  useEffect(() => {
    if (loading || !gateChecked) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const onWelcome = segments[0] === "welcome";
    const onOAuth = segments[0] === "oauth";
    const onAgeGate = segments[0] === "age-gate";
    const onOnboarding = segments[0] === "onboarding";
    const onLegal = segments[0] === "legal";

    if (onOAuth || onLegal) return;

    const inRegistrationFlow = onWelcome || onAgeGate || onOnboarding;

    // Main app is only reachable after the full Welcome → age → onboarding path.
    if (!registrationComplete) {
      if (inAuthGroup) {
        router.replace("/welcome");
        return;
      }

      if (!inRegistrationFlow) {
        router.replace("/welcome");
        return;
      }

      if (ageOk && onAgeGate) {
        router.replace("/onboarding");
        return;
      }

      if (ageOk && !onboardingDone && !onOnboarding && !onWelcome) {
        router.replace("/onboarding");
        return;
      }

      return;
    }

    // Registration done — leave funnel screens for the main app.
    if (onAgeGate || onOnboarding) {
      router.replace("/(tabs)");
      return;
    }

    if (isAuthenticated && onWelcome) {
      router.replace("/(tabs)");
    }
  }, [
    isAuthenticated,
    loading,
    segments,
    router,
    gateChecked,
    ageOk,
    onboardingDone,
    registrationComplete,
  ]);

  return { user, loading: loading || !gateChecked, isAuthenticated };
}

/**
 * Loading screen shown while auth state is being determined.
 */
export function AuthLoadingScreen() {
  const colors = useColors();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
