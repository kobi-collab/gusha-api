import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { completeLogout } from "@/lib/_core/auth";
import {
  UserProfile,
  SearchPreferences,
  MoodKey,
  DEFAULT_PROFILE,
  DEFAULT_SEARCH_PREFERENCES,
  migrateProfileFields,
} from "./mock-data";

/** Legacy keys — may persist in iOS Keychain after app delete/reinstall. */
const LEGACY_KEYS = {
  ageVerified: "age_verified",
  onboardingComplete: "onboarding_complete",
} as const;

const KEYS = {
  profile: "user_profile",
  searchPrefs: "search_preferences",
  myMood: "my_mood",
  // v2: ignores stale Keychain values from earlier builds / dev installs.
  ageVerified: "age_verified_v2",
  onboardingComplete: "onboarding_complete_v2",
} as const;

// ── In-memory cache ──
// Set synchronously when a flag is written so that rapid re-reads (especially
// on web where SecureStore is stubbed and AsyncStorage flushes are async)
// always return the freshly-written value without a storage round-trip.
let _ageVerifiedCache: boolean | null = null;
let _onboardingCompleteCache: boolean | null = null;

// ── Profile ──

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.profile);
    if (!raw) return { ...DEFAULT_PROFILE };
    return migrateProfileFields(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
  } catch (err) {
    console.error("[storage] saveProfile failed:", err);
    throw err;
  }
}

// ── Search Preferences ──

export async function loadSearchPreferences(): Promise<SearchPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.searchPrefs);
    if (!raw) return { ...DEFAULT_SEARCH_PREFERENCES };
    return { ...DEFAULT_SEARCH_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SEARCH_PREFERENCES };
  }
}

export async function saveSearchPreferences(prefs: SearchPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.searchPrefs, JSON.stringify(prefs));
  } catch (err) {
    console.error("[storage] saveSearchPreferences failed:", err);
    throw err;
  }
}

// ── Mood ──

export async function loadMyMood(): Promise<MoodKey | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.myMood);
    return (raw as MoodKey | null) ?? null;
  } catch {
    return null;
  }
}

export async function saveMyMood(mood: MoodKey | null): Promise<void> {
  if (mood === null) {
    await AsyncStorage.removeItem(KEYS.myMood);
  } else {
    await AsyncStorage.setItem(KEYS.myMood, mood);
  }
}

async function deleteSecureKey(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

/** True only when age gate, onboarding, and a real local profile exist. */
export async function isRegistrationComplete(): Promise<boolean> {
  const [ageOk, onboardingOk, profile] = await Promise.all([
    isAgeVerified(),
    isOnboardingComplete(),
    loadProfile(),
  ]);
  if (!ageOk || !onboardingOk) return false;

  const name = (profile.displayName || profile.name || "").trim();
  if (!name) return false;
  if (!profile.genderIdentity) return false;
  return true;
}

// ── Debug ──

export async function clearAllStorage(): Promise<void> {
  // Reset in-memory caches first so subsequent reads don't return stale true values
  _ageVerifiedCache = null;
  _onboardingCompleteCache = null;

  for (const key of [
    KEYS.ageVerified,
    KEYS.onboardingComplete,
    LEGACY_KEYS.ageVerified,
    LEGACY_KEYS.onboardingComplete,
  ]) {
    await deleteSecureKey(key);
  }

  try {
    await AsyncStorage.multiRemove([
      KEYS.profile,
      KEYS.searchPrefs,
      KEYS.myMood,
      KEYS.ageVerified,
      KEYS.onboardingComplete,
      LEGACY_KEYS.ageVerified,
      LEGACY_KEYS.onboardingComplete,
      "gusha_demo_intent",
      "demo_radar_consent",
      "demo_radar_checked_in",
      "gusha_device_id",
    ]);
  } catch (err) {
    console.warn("[storage] clearAllStorage: failed to clear AsyncStorage keys", err);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("demo_mode");
    window.localStorage.removeItem("gusha_demo_intent");
  }

  try {
    await completeLogout();
  } catch (err) {
    console.warn("[storage] clearAllStorage: completeLogout failed", err);
  }

  const { clearDemoMode } = await import("@/lib/demo-session");
  await clearDemoMode().catch(() => {});

  const { resetGuestSessionAttempt } = await import("@/hooks/use-guest-session");
  resetGuestSessionAttempt();
  const { clearDemoRadarState } = await import("@/lib/demo-radar");
  await clearDemoRadarState().catch(() => {});
}

/** Sign out of server session without wiping local registration data. */
export async function signOutSession(): Promise<void> {
  try {
    const { logout } = await import("@/lib/_core/api");
    await logout().catch(() => {});
  } catch {
    // Best-effort server logout
  }
  await completeLogout();
  const { clearDemoMode } = await import("@/lib/demo-session");
  await clearDemoMode().catch(() => {});
  const { pauseAutoGuestSession } = await import("@/hooks/use-guest-session");
  pauseAutoGuestSession();
  const { clearDemoRadarState } = await import("@/lib/demo-radar");
  await clearDemoRadarState().catch(() => {});
}

// ── Age Verification ──

export async function isAgeVerified(): Promise<boolean> {
  if (_ageVerifiedCache !== null) {
    return _ageVerifiedCache;
  }
  try {
    const raw = await SecureStore.getItemAsync(KEYS.ageVerified);
    const value = raw === "true";
    _ageVerifiedCache = value;
    return value;
  } catch (err) {
    console.warn("[storage] isAgeVerified: SecureStore failed, falling back to AsyncStorage", err);
    try {
      const raw = await AsyncStorage.getItem(KEYS.ageVerified);
      const value = raw === "true";
      _ageVerifiedCache = value;
      return value;
    } catch (fallbackErr) {
      console.error("[storage] isAgeVerified: AsyncStorage fallback also failed", fallbackErr);
      return false;
    }
  }
}

// ── Onboarding ──

export async function isOnboardingComplete(): Promise<boolean> {
  if (_onboardingCompleteCache !== null) {
    return _onboardingCompleteCache;
  }
  try {
    const raw = await SecureStore.getItemAsync(KEYS.onboardingComplete);
    const value = raw === "true";
    _onboardingCompleteCache = value;
    return value;
  } catch (err) {
    console.warn("[storage] isOnboardingComplete: SecureStore failed, falling back to AsyncStorage", err);
    try {
      const raw = await AsyncStorage.getItem(KEYS.onboardingComplete);
      const value = raw === "true";
      _onboardingCompleteCache = value;
      return value;
    } catch (fallbackErr) {
      console.error("[storage] isOnboardingComplete: AsyncStorage fallback also failed", fallbackErr);
      return false;
    }
  }
}

export async function setOnboardingComplete(): Promise<void> {
  _onboardingCompleteCache = true;
  try {
    await SecureStore.setItemAsync(KEYS.onboardingComplete, "true");
  } catch (err) {
    console.warn("[storage] setOnboardingComplete: SecureStore failed, falling back to AsyncStorage", err);
    try {
      await AsyncStorage.setItem(KEYS.onboardingComplete, "true");
    } catch (fallbackErr) {
      console.error("[storage] setOnboardingComplete: AsyncStorage fallback also failed", fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function clearOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.onboardingComplete);
  } catch (err) {
    console.warn("[storage] clearOnboardingComplete: SecureStore delete failed, falling back to AsyncStorage remove", err);
    try {
      await AsyncStorage.removeItem(KEYS.onboardingComplete);
    } catch (fallbackErr) {
      console.error("[storage] clearOnboardingComplete: AsyncStorage fallback also failed", fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function setAgeVerified(verified: boolean): Promise<void> {
  _ageVerifiedCache = verified;
  if (!verified) {
    try {
      await SecureStore.deleteItemAsync(KEYS.ageVerified);
    } catch (err) {
      console.warn("[storage] setAgeVerified: SecureStore delete failed, falling back to AsyncStorage remove", err);
      try {
        await AsyncStorage.removeItem(KEYS.ageVerified);
      } catch (fallbackErr) {
        console.error("[storage] setAgeVerified: AsyncStorage fallback also failed", fallbackErr);
        throw fallbackErr;
      }
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(KEYS.ageVerified, "true");
  } catch (err) {
    console.warn("[storage] setAgeVerified: SecureStore failed, falling back to AsyncStorage", err);
    try {
      await AsyncStorage.setItem(KEYS.ageVerified, "true");
    } catch (fallbackErr) {
      console.error("[storage] setAgeVerified: AsyncStorage fallback also failed", fallbackErr);
      throw fallbackErr;
    }
  }
}
