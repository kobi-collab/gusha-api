import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Managed by Manus OAuth — do not modify core columns.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User profiles — app-specific data for each user.
 * Linked to users table via userId (foreign key).
 * Stores profile info, photo gallery, interests, and subscription plan.
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users.id */
  userId: int("userId").notNull().unique(),
  /** Display name (can differ from auth name) */
  displayName: varchar("displayName", { length: 100 }),
  /** Age */
  age: int("age"),
  /** Short bio / about text */
  bio: text("bio"),
  /**
   * Photo gallery stored as JSON array of PhotoItem objects:
   * [{ id: string, uri: string, isPrivate: boolean, order: number }]
   */
  gallery: json("gallery").$type<PhotoItemDB[]>(),
  /**
   * Interests stored as JSON array of strings:
   * ["Music", "Travel", "Art", ...]
   */
  interests: json("interests").$type<string[]>(),
  /**
   * Search preferences stored as JSON:
   * { minAge: number, maxAge: number, maxDistance: number, interests: string[] }
   */
  searchPreferences: json("searchPreferences").$type<SearchPreferencesDB>(),
  /** Subscription plan: free, plus, or premium */
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "plus", "premium"]).default("free").notNull(),
  /** When the subscription expires (null = free / no expiry) */
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  /** Last known latitude */
  latitude: text("latitude"),
  /** Last known longitude */
  longitude: text("longitude"),
  /** Grindr-style extended profile fields stored as JSON */
  extendedProfile: json("extendedProfile").$type<ExtendedProfileDB>(),
  /** Whether the profile is visible to others on the radar */
  isVisible: mysqlEnum("isVisible", ["true", "false"]).default("true").notNull(),
  /** Last time the user was seen online (updated via WebSocket heartbeat) */
  lastSeen: timestamp("lastSeen"),
  /** Profile creation timestamp */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Last profile update */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Extended profile fields stored in JSON column */
export type ExtendedProfileDB = {
  height?: number | null;
  bodyType?: string | null;
  relationshipStatus?: string | null;
  genderIdentity?: string | null;
  pronouns?: string | null;
  lookingFor?: string[];
  meetAt?: string[];
  acceptingNSFW?: string | null;
  tags?: string[];
  socialLinks?: { instagram?: string; spotify?: string };
  showAge?: boolean;
  incognito?: boolean;
};

/** Photo item shape stored in the gallery JSON column */
export type PhotoItemDB = {
  id: string;
  uri: string;
  isPrivate: boolean;
  order: number;
};

/** Search preferences shape stored in JSON column */
export type SearchPreferencesDB = {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  interests: string[];
};

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Messages table for chat conversations.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  type: mysqlEnum("type", ["text", "photo", "expiring_photo"]).default("text").notNull(),
  text: text("text"),
  photoUrl: text("photoUrl"),
  isRead: mysqlEnum("isRead", ["true", "false"]).default("false").notNull(),
  isUnsent: mysqlEnum("isUnsent", ["true", "false"]).default("false").notNull(),
  isExpired: mysqlEnum("isExpired", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Taps (quick interest signals like Grindr).
 */
export const taps = mysqlTable("taps", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  type: mysqlEnum("tapType", ["fire", "friendly", "wave"]).default("wave").notNull(),
  isRead: mysqlEnum("isRead", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tap = typeof taps.$inferSelect;
export type InsertTap = typeof taps.$inferInsert;

/**
 * Profile views (who viewed my profile).
 */
export const profileViews = mysqlTable("profile_views", {
  id: int("id").autoincrement().primaryKey(),
  viewerId: int("viewerId").notNull(),
  viewedUserId: int("viewedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProfileView = typeof profileViews.$inferSelect;
export type InsertProfileView = typeof profileViews.$inferInsert;

/**
 * Favorites (saved profiles).
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  favoriteUserId: int("favoriteUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Blocks.
 */
export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockerId: int("blockerId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

/**
 * Reports.
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  reportedUserId: int("reportedUserId").notNull(),
  reason: mysqlEnum("reason", ["spam", "harassment", "fake_profile", "inappropriate_content", "other"]).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Push notification tokens for each user device.
 * Stores Expo push tokens for sending remote notifications.
 */
export const pushTokens = mysqlTable("push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Expo push token (ExponentPushToken[xxx]) */
  token: varchar("token", { length: 255 }).notNull(),
  /** Device platform */
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull(),
  /** Whether this token is active */
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

/**
 * Notification preferences per user.
 * Controls which types of notifications the user wants to receive.
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Enable/disable all push notifications */
  pushEnabled: mysqlEnum("pushEnabled", ["true", "false"]).default("true").notNull(),
  /** New message notifications */
  messagesEnabled: mysqlEnum("messagesEnabled", ["true", "false"]).default("true").notNull(),
  /** Tap notifications */
  tapsEnabled: mysqlEnum("tapsEnabled", ["true", "false"]).default("true").notNull(),
  /** Profile view notifications (premium feature) */
  viewsEnabled: mysqlEnum("viewsEnabled", ["true", "false"]).default("true").notNull(),
  /** Favorite notifications */
  favoritesEnabled: mysqlEnum("favoritesEnabled", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * User subscriptions - tracks active subscription status.
 * Stores plan, duration, receipt info, and expiry.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Plan tier: plus or premium */
  planId: mysqlEnum("planId", ["plus", "premium"]).notNull(),
  /** Duration of the subscription */
  duration: mysqlEnum("duration", ["1_week", "1_month", "3_months", "12_months"]).notNull(),
  /** Store platform where purchase was made */
  store: mysqlEnum("store", ["apple", "google", "web"]).notNull(),
  /** Store-specific product ID */
  productId: varchar("productId", { length: 255 }).notNull(),
  /** Store transaction/receipt ID for validation */
  transactionId: varchar("transactionId", { length: 500 }),
  /** Receipt data for server-side validation */
  receiptData: text("receiptData"),
  /** Subscription status */
  status: mysqlEnum("status", ["active", "expired", "cancelled", "grace_period", "pending"]).default("active").notNull(),
  /** When the subscription started */
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  /** When the subscription expires */
  expiresAt: timestamp("expiresAt"),
  /** Whether auto-renew is enabled */
  autoRenew: mysqlEnum("autoRenew", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Boosts — temporary profile highlighting.
 * A boost places the user's profile at the top of the Grid for 1 hour.
 */
export const boosts = mysqlTable("boosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** When the boost started */
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  /** When the boost expires (typically 1 hour after start) */
  expiresAt: timestamp("expiresAt").notNull(),
  /** Whether the boost is currently active */
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Boost = typeof boosts.$inferSelect;
export type InsertBoost = typeof boosts.$inferInsert;
