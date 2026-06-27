import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";

const DEMO_MODE_KEY = "demo_mode";

/** Start a local demo session (no server required). */
export async function enterDemoMode(): Promise<void> {
  const demoUser: Auth.User = {
    id: 999,
    openId: "demo-user-001",
    name: "Demo User",
    email: "demo@gusha.app",
    loginMethod: "demo",
    lastSignedIn: new Date(),
  };
  await Auth.setUserInfo(demoUser);
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(DEMO_MODE_KEY, "true");
  } else {
    await AsyncStorage.setItem(DEMO_MODE_KEY, "true").catch(() => {});
  }
  await Auth.completeLogin("demo-session-token", demoUser);
}

/** Clear demo mode flags (e.g. on sign out). */
export async function clearDemoMode(): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(DEMO_MODE_KEY);
  } else {
    await AsyncStorage.removeItem(DEMO_MODE_KEY).catch(() => {});
  }
}
