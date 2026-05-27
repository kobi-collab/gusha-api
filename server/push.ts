/**
 * Push notification helper for Gusha.
 * Uses the Expo Push API to send notifications to users' devices.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { pushTokens, notificationPreferences, userProfiles } from "../drizzle/schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushNotificationType = "message" | "tap" | "view" | "favorite";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: "default" | null;
  categoryId?: string;
}

/**
 * Send a push notification to a specific user.
 * Checks notification preferences before sending.
 */
export async function sendPushToUser(
  userId: number,
  type: PushNotificationType,
  payload: PushPayload
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check notification preferences
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    const pref = prefs[0];
    if (pref) {
      // Check if push is globally disabled
      if (pref.pushEnabled === "false") return false;

      // Check per-type preferences
      switch (type) {
        case "message":
          if (pref.messagesEnabled === "false") return false;
          break;
        case "tap":
          if (pref.tapsEnabled === "false") return false;
          break;
        case "view":
          if (pref.viewsEnabled === "false") return false;
          break;
        case "favorite":
          if (pref.favoritesEnabled === "false") return false;
          break;
      }
    }

    // Get active push tokens for the user
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.isActive, "true")
        )
      );

    if (tokens.length === 0) return false;

    // Build Expo push messages
    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound ?? "default",
      badge: payload.badge,
      categoryId: payload.categoryId,
      channelId: "default",
    }));

    // Send via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("[Push] Expo API error:", response.status, await response.text());
      return false;
    }

    const result = await response.json();

    // Handle ticket errors (mark invalid tokens as inactive)
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === "error") {
          if (
            ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials"
          ) {
            // Deactivate the token
            await db
              .update(pushTokens)
              .set({ isActive: "false" })
              .where(eq(pushTokens.token, tokens[i].token));
            console.log(`[Push] Deactivated token for user ${userId}: ${ticket.details.error}`);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error("[Push] Error sending notification:", error);
    return false;
  }
}

/**
 * Send a push notification when a new message is received.
 */
export async function notifyNewMessage(
  receiverId: number,
  senderName: string,
  messagePreview: string
) {
  return sendPushToUser(receiverId, "message", {
    title: senderName,
    body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + "..." : messagePreview,
    data: {
      type: "message",
      url: "/chat-room",
    },
    categoryId: "message",
  });
}

/**
 * Send a push notification when a tap is received.
 */
export async function notifyNewTap(
  receiverId: number,
  senderName: string,
  tapType: string
) {
  const tapEmoji = tapType === "fire" ? "🔥" : tapType === "friendly" ? "😊" : "👋";
  return sendPushToUser(receiverId, "tap", {
    title: "New Tap!",
    body: `${senderName} sent you a ${tapType} tap ${tapEmoji}`,
    data: {
      type: "tap",
      url: "/(tabs)/taps",
    },
    categoryId: "tap",
  });
}

/**
 * Send a push notification when someone views your profile.
 */
export async function notifyProfileView(
  viewedUserId: number,
  viewerName: string
) {
  return sendPushToUser(viewedUserId, "view", {
    title: "Profile Viewed",
    body: `${viewerName} viewed your profile`,
    data: {
      type: "view",
      url: "/(tabs)/taps",
    },
    categoryId: "view",
  });
}

/**
 * Send a push notification when someone favorites you.
 */
export async function notifyNewFavorite(
  favoritedUserId: number,
  senderName: string
) {
  return sendPushToUser(favoritedUserId, "favorite", {
    title: "New Favorite!",
    body: `${senderName} added you to favorites ⭐`,
    data: {
      type: "favorite",
      url: "/(tabs)/taps",
    },
    categoryId: "favorite",
  });
}

// ── Push Token Management ──

export async function registerPushToken(
  userId: number,
  token: string,
  platform: "ios" | "android" | "web"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if token already exists for this user
  const existing = await db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing token to active
    await db
      .update(pushTokens)
      .set({ isActive: "true", platform })
      .where(eq(pushTokens.id, existing[0].id));
  } else {
    // Deactivate old tokens for this user on same platform
    await db
      .update(pushTokens)
      .set({ isActive: "false" })
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.platform, platform)));

    // Insert new token
    await db.insert(pushTokens).values({
      userId,
      token,
      platform,
      isActive: "true",
    });
  }
}

export async function unregisterPushToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(pushTokens)
    .set({ isActive: "false" })
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

// ── Notification Preferences ──

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (result.length === 0) {
    // Return defaults
    return {
      pushEnabled: "true" as const,
      messagesEnabled: "true" as const,
      tapsEnabled: "true" as const,
      viewsEnabled: "true" as const,
      favoritesEnabled: "true" as const,
    };
  }

  return result[0];
}

export async function updateNotificationPreferences(
  userId: number,
  prefs: {
    pushEnabled?: "true" | "false";
    messagesEnabled?: "true" | "false";
    tapsEnabled?: "true" | "false";
    viewsEnabled?: "true" | "false";
    favoritesEnabled?: "true" | "false";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(notificationPreferences)
      .set(prefs)
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      pushEnabled: prefs.pushEnabled ?? "true",
      messagesEnabled: prefs.messagesEnabled ?? "true",
      tapsEnabled: prefs.tapsEnabled ?? "true",
      viewsEnabled: prefs.viewsEnabled ?? "true",
      favoritesEnabled: prefs.favoritesEnabled ?? "true",
    });
  }
}

/**
 * Get display name for a user (for notification text).
 */
export async function getUserDisplayName(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Someone";

  const result = await db
    .select({ displayName: userProfiles.displayName })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return result[0]?.displayName || "Someone";
}
