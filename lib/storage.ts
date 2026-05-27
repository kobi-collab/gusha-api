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
    console.log("[storage] clearAllStorage: deleted SecureStore", key);
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
    ]);
    console.log("[storage] clearAllStorage: cleared AsyncStorage keys");
  } catch (err) {
    console.warn("[storage] clearAllStorage: failed to clear AsyncStorage keys", err);
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("demo_mode");
    console.log("[storage] clearAllStorage: removed demo_mode from localStorage");
  }

  try {
    await completeLogout();
    console.log("[storage] clearAllStorage: session token and user info cleared");
  } catch (err) {
    console.warn("[storage] clearAllStorage: completeLogout failed", err);
  }

  console.log("[storage] clearAllStorage: done");
}

// ── Age Verification ──

export async function isAgeVerified(): Promise<boolean> {
  if (_ageVerifiedCache !== null) {
    console.log("[storage] isAgeVerified: cache hit →", _ageVerifiedCache);
    return _ageVerifiedCache;
  }
  try {
    const raw = await SecureStore.getItemAsync(KEYS.ageVerified);
    console.log("[storage] isAgeVerified: SecureStore returned", raw);
    const value = raw === "true";
    _ageVerifiedCache = value;
    return value;
  } catch (err) {
    console.warn("[storage] isAgeVerified: SecureStore failed, falling back to AsyncStorage", err);
    try {
      const raw = await AsyncStorage.getItem(KEYS.ageVerified);
      console.log("[storage] isAgeVerified: AsyncStorage returned", raw);
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
    console.log("[storage] isOnboardingComplete: cache hit →", _onboardingCompleteCache);
    return _onboardingCompleteCache;
  }
  try {
    const raw = await SecureStore.getItemAsync(KEYS.onboardingComplete);
    console.log("[storage] isOnboardingComplete: SecureStore returned", raw);
    const value = raw === "true";
    _onboardingCompleteCache = value;
    return value;
  } catch (err) {
    console.warn("[storage] isOnboardingComplete: SecureStore failed, falling back to AsyncStorage", err);
    try {
      const raw = await AsyncStorage.getItem(KEYS.onboardingComplete);
      console.log("[storage] isOnboardingComplete: AsyncStorage returned", raw);
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
    console.log("[storage] setOnboardingComplete: SecureStore saved");
  } catch (err) {
    console.warn("[storage] setOnboardingComplete: SecureStore failed, falling back to AsyncStorage", err);
    try {
      await AsyncStorage.setItem(KEYS.onboardingComplete, "true");
      console.log("[storage] setOnboardingComplete: AsyncStorage saved");
    } catch (fallbackErr) {
      console.error("[storage] setOnboardingComplete: AsyncStorage fallback also failed", fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function clearOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.onboardingComplete);
    console.log("[storage] clearOnboardingComplete: SecureStore deleted key");
  } catch (err) {
    console.warn("[storage] clearOnboardingComplete: SecureStore delete failed, falling back to AsyncStorage remove", err);
    try {
      await AsyncStorage.removeItem(KEYS.onboardingComplete);
      console.log("[storage] clearOnboardingComplete: AsyncStorage removed key");
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
      console.log("[storage] setAgeVerified: SecureStore deleted key");
    } catch (err) {
      console.warn("[storage] setAgeVerified: SecureStore delete failed, falling back to AsyncStorage remove", err);
      try {
        await AsyncStorage.removeItem(KEYS.ageVerified);
        console.log("[storage] setAgeVerified: AsyncStorage removed key");
      } catch (fallbackErr) {
        console.error("[storage] setAgeVerified: AsyncStorage fallback also failed", fallbackErr);
        throw fallbackErr;
      }
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(KEYS.ageVerified, "true");
    console.log("[storage] setAgeVerified: SecureStore saved true");
  } catch (err) {
    console.warn("[storage] setAgeVerified: SecureStore failed, falling back to AsyncStorage", err);
    try {
      await AsyncStorage.setItem(KEYS.ageVerified, "true");
      console.log("[storage] setAgeVerified: AsyncStorage saved true");
    } catch (fallbackErr) {
      console.error("[storage] setAgeVerified: AsyncStorage fallback also failed", fallbackErr);
      throw fallbackErr;
    }
  }
}
