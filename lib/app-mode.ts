import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEMO_MODE_KEY = "demo_mode";

/** True only when the user explicitly chose demo mode. */
export function isExplicitDemoMode(userLoginMethod?: string | null): boolean {
  if (userLoginMethod === "demo") return true;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(DEMO_MODE_KEY) === "true";
  }
  return false;
}

/** Native demo flag (async read from AsyncStorage). */
export async function isExplicitDemoModeAsync(userLoginMethod?: string | null): Promise<boolean> {
  if (isExplicitDemoMode(userLoginMethod)) return true;
  if (Platform.OS !== "web") {
    try {
      const flag = await AsyncStorage.getItem(DEMO_MODE_KEY);
      return flag === "true";
    } catch {
      return false;
    }
  }
  return false;
}
