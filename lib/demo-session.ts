import { Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";

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
    window.localStorage.setItem("demo_mode", "true");
  }
  await Auth.completeLogin("demo-session-token", demoUser);
}
