import { Platform } from "react-native";

/** True only when the user explicitly chose demo mode. */
export function isExplicitDemoMode(userLoginMethod?: string | null): boolean {
  if (userLoginMethod === "demo") return true;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("demo_mode") === "true";
  }
  return false;
}
