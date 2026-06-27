import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const DEMO_INTENT_KEY = "gusha_demo_intent";

export async function setDemoIntent(): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(DEMO_INTENT_KEY, "true");
    return;
  }
  await AsyncStorage.setItem(DEMO_INTENT_KEY, "true");
}

export async function peekDemoIntent(): Promise<boolean> {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(DEMO_INTENT_KEY) === "true";
  }
  const raw = await AsyncStorage.getItem(DEMO_INTENT_KEY);
  return raw === "true";
}

/** Returns true once, then clears the flag. */
export async function consumeDemoIntent(): Promise<boolean> {
  const active = await peekDemoIntent();
  if (!active) return false;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(DEMO_INTENT_KEY);
  } else {
    await AsyncStorage.removeItem(DEMO_INTENT_KEY);
  }
  return true;
}
