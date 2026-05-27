/**
 * Hook for managing push notifications on the client side.
 * Handles permission requests, token registration, and notification listeners.
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuth } from "./use-auth";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === "web") return null;

  try {
    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D946EF",
        sound: "default",
      });

      // Separate channels for different notification types
      await Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("taps", {
        name: "Taps",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });

      await Notifications.setNotificationChannelAsync("views", {
        name: "Profile Views",
        importance: Notifications.AndroidImportance.LOW,
      });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted");
      return null;
    }

    // Get the Expo push token
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log("[Push] No project ID found, using device token fallback");
      // In development, we can still get a device push token
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("[Push] Token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("[Push] Error registering:", error);
    return null;
  }
}

/**
 * Register the push token with the server.
 */
async function registerTokenWithServer(token: string) {
  try {
    const baseUrl = getApiBaseUrl();
    const authToken = await Auth.getSessionToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

    await fetch(`${baseUrl}/api/trpc/notifications.registerToken`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        json: { token, platform },
      }),
    });

    console.log("[Push] Token registered with server");
  } catch (error) {
    console.error("[Push] Failed to register token with server:", error);
  }
}

/**
 * Main hook for push notifications.
 * Call this in the root layout or main app component.
 */
export function usePushNotifications() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth({});
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>(undefined);
  const responseListener = useRef<Notifications.EventSubscription>(undefined);

  // Register for push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        registerTokenWithServer(token);
      }
    });

    // Check permission status
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status);
    });
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Listen for incoming notifications while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[Push] Notification received:", notification.request.content.title);
      }
    );

    // Listen for notification taps (user interacts with notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const url = data?.url;

        if (typeof url === "string") {
          // Navigate to the relevant screen
          try {
            router.push(url as any);
          } catch (e) {
            console.error("[Push] Navigation error:", e);
          }
        }
      }
    );

    // Handle notification that launched the app
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const url = data?.url;
        if (typeof url === "string") {
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            try {
              router.push(url as any);
            } catch (e) {
              console.error("[Push] Initial navigation error:", e);
            }
          }, 1000);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return {
    expoPushToken,
    permissionStatus,
  };
}

/**
 * Request notification permissions (can be called from settings).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
