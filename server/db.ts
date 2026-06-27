import { eq, and, desc, or, ne, notInArray, sql, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  userProfiles, InsertUserProfile,
  messages, InsertMessage,
  taps, InsertTap,
  profileViews, InsertProfileView,
  favorites, InsertFavorite,
  blocks, InsertBlock,
  reports, InsertReport,
  boosts, InsertBoost,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Profile Queries ──

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (result.length === 0) return undefined;
  // Flatten extendedProfile into the result for client convenience
  const row = result[0];
  const ext = (row.extendedProfile as any) || {};
  return { ...row, ...ext };
}

export async function upsertProfile(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Separate extended profile fields from core fields
  const {
    height, bodyType, relationshipStatus, genderIdentity, pronouns,
    lookingFor, meetAt, acceptingNSFW, tags, socialLinks, showAge,
    ...coreData
  } = data;

  // Build extendedProfile JSON if any Grindr-style fields are provided
  const extFields: any = {};
  let hasExtFields = false;
  for (const [k, v] of Object.entries({
    height, bodyType, relationshipStatus, genderIdentity, pronouns,
    lookingFor, meetAt, acceptingNSFW, tags, socialLinks, showAge,
  })) {
    if (v !== undefined) {
      extFields[k] = v;
      hasExtFields = true;
    }
  }

  const existing = await getProfile(userId);
  const updateData: any = { ...coreData, updatedAt: new Date() };
  if (hasExtFields) {
    // Merge with existing extended profile
    const existingExt = existing?.extendedProfile || {};
    updateData.extendedProfile = { ...existingExt, ...extFields };
  }

  if (existing) {
    await db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ ...updateData, userId });
  }
}

const RADAR_CHECK_IN_MS = 2 * 60 * 60 * 1000;

function isActiveRadarSession(ext: Record<string, unknown> | null | undefined): boolean {
  const expires = ext?.radarCheckInExpiresAt;
  if (typeof expires !== "string" || !expires) return false;
  return new Date(expires) > new Date();
}

function flattenProfileRow(row: (typeof userProfiles.$inferSelect)) {
  const ext = (row.extendedProfile as Record<string, unknown>) || {};
  return { ...row, ...ext };
}

export async function expireRadarSessionIfNeeded(userId: number): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile) return false;
  const ext = (profile.extendedProfile as Record<string, unknown>) || {};
  if (!ext.radarCheckInExpiresAt) return false;
  if (isActiveRadarSession(ext)) return false;
  await radarCheckOut(userId);
  return true;
}

export async function getRadarStatus(userId: number) {
  await expireRadarSessionIfNeeded(userId);
  const profile = await getProfile(userId);
  if (!profile) {
    return {
      mapVisibilityConsent: false,
      isCheckedIn: false,
      checkInExpiresAt: null as string | null,
      latitude: null as string | null,
      longitude: null as string | null,
    };
  }
  const ext = (profile.extendedProfile as Record<string, unknown>) || {};
  const active = profile.isVisible === "true" && isActiveRadarSession(ext);
  return {
    mapVisibilityConsent: ext.mapVisibilityConsent === true,
    isCheckedIn: active,
    checkInExpiresAt: active && typeof ext.radarCheckInExpiresAt === "string"
      ? ext.radarCheckInExpiresAt
      : null,
    latitude: active ? profile.latitude ?? null : null,
    longitude: active ? profile.longitude ?? null : null,
  };
}

export async function setMapVisibilityConsent(userId: number, consented: boolean) {
  const profile = await getProfile(userId);
  const ext = (profile?.extendedProfile as Record<string, unknown>) || {};
  await upsertProfile(userId, {
    extendedProfile: { ...ext, mapVisibilityConsent: consented },
  });
  if (!consented) {
    await radarCheckOut(userId);
  }
  return { consented };
}

export async function radarCheckIn(
  userId: number,
  latitude: string,
  longitude: string
) {
  const profile = await getProfile(userId);
  const ext = (profile?.extendedProfile as Record<string, unknown>) || {};
  if (ext.mapVisibilityConsent !== true) {
    throw new Error("Map visibility consent is required before checking in");
  }
  const expiresAt = new Date(Date.now() + RADAR_CHECK_IN_MS).toISOString();
  await upsertProfile(userId, {
    latitude,
    longitude,
    isVisible: "true",
    extendedProfile: { ...ext, radarCheckInExpiresAt: expiresAt },
  });
  return { expiresAt };
}

export async function radarCheckOut(userId: number) {
  const profile = await getProfile(userId);
  const ext = { ...((profile?.extendedProfile as Record<string, unknown>) || {}) };
  delete ext.radarCheckInExpiresAt;
  await upsertProfile(userId, {
    isVisible: "false",
    latitude: null,
    longitude: null,
    extendedProfile: ext,
  });
  return { success: true as const };
}

function filterActiveRadarProfiles<T extends { extendedProfile: unknown; isVisible: string }>(
  rows: T[]
): T[] {
  const now = new Date();
  return rows.filter((row) => {
    if (row.isVisible !== "true") return false;
    const ext = (row.extendedProfile as Record<string, unknown>) || {};
    const expires = ext.radarCheckInExpiresAt;
    return typeof expires === "string" && new Date(expires) > now;
  });
}

export async function getNearbyProfiles(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  await expireRadarSessionIfNeeded(userId);
  // Get blocked user IDs
  const blockedRows = await db.select({ blockedUserId: blocks.blockedUserId })
    .from(blocks).where(eq(blocks.blockerId, userId));
  const blockedByRows = await db.select({ blockerId: blocks.blockerId })
    .from(blocks).where(eq(blocks.blockedUserId, userId));
  const excludeIds = [
    userId,
    ...blockedRows.map(r => r.blockedUserId),
    ...blockedByRows.map(r => r.blockerId),
  ];
  const rows = await db.select()
    .from(userProfiles)
    .where(and(
      notInArray(userProfiles.userId, excludeIds),
      eq(userProfiles.isVisible, "true"),
    ))
    .limit(limit);
  return filterActiveRadarProfiles(rows).map(flattenProfileRow);
}

/**
 * Explore: get profiles from any location (not just nearby).
 * For now, returns all visible profiles excluding blocked users,
 * ordered randomly. City/country filtering is a placeholder for
 * when real geolocation is stored.
 */
export async function getExploreProfiles(
  userId: number,
  opts: { city?: string; country?: string; limit?: number }
) {
  const db = await getDb();
  if (!db) return [];
  const blockedRows = await db.select({ blockedUserId: blocks.blockedUserId })
    .from(blocks).where(eq(blocks.blockerId, userId));
  const blockedByRows = await db.select({ blockerId: blocks.blockerId })
    .from(blocks).where(eq(blocks.blockedUserId, userId));
  const excludeIds = [
    userId,
    ...blockedRows.map(r => r.blockedUserId),
    ...blockedByRows.map(r => r.blockerId),
  ];
  const rows = await db.select()
    .from(userProfiles)
    .where(and(
      notInArray(userProfiles.userId, excludeIds),
      eq(userProfiles.isVisible, "true"),
    ))
    .orderBy(sql`RAND()`)
    .limit(opts.limit ?? 100);
  return filterActiveRadarProfiles(rows).map(flattenProfileRow);
}

/**
 * Get profiles with boosted users sorted to the top.
 * Boosted profiles appear first, then regular profiles.
 */
export async function getNearbyProfilesWithBoosts(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return getNearbyProfiles(userId, limit);
  const blockedRows = await db.select({ blockedUserId: blocks.blockedUserId })
    .from(blocks).where(eq(blocks.blockerId, userId));
  const blockedByRows = await db.select({ blockerId: blocks.blockerId })
    .from(blocks).where(eq(blocks.blockedUserId, userId));
  const excludeIds = [
    userId,
    ...blockedRows.map(r => r.blockedUserId),
    ...blockedByRows.map(r => r.blockerId),
  ];
  // Check for active boosts
  const now = new Date();
  const activeBoosts = await db.select({ userId: boosts.userId })
    .from(boosts)
    .where(and(
      gt(boosts.expiresAt, now),
      eq(boosts.isActive, "true"),
    ));
  const boostedUserIds = new Set(activeBoosts.map(b => b.userId));

  const profiles = filterActiveRadarProfiles(
    await db.select()
      .from(userProfiles)
      .where(and(
        notInArray(userProfiles.userId, excludeIds),
        eq(userProfiles.isVisible, "true"),
      ))
      .limit(limit)
  ).map(flattenProfileRow);

  // Sort boosted profiles to the top
  return profiles.sort((a, b) => {
    const aBoost = boostedUserIds.has(a.userId) ? 1 : 0;
    const bBoost = boostedUserIds.has(b.userId) ? 1 : 0;
    return bBoost - aBoost;
  });
}

/**
 * Activate a 1-hour boost for a user.
 */
export async function activateBoost(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  // Deactivate any existing boost
  await db.update(boosts)
    .set({ isActive: "false" })
    .where(eq(boosts.userId, userId));
  // Create new boost
  await db.insert(boosts).values({
    userId,
    startedAt: now,
    expiresAt,
    isActive: "true",
  });
  return { startedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
}

/**
 * Get the active boost for a user (if any).
 */
export async function getActiveBoost(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const result = await db.select()
    .from(boosts)
    .where(and(
      eq(boosts.userId, userId),
      eq(boosts.isActive, "true"),
      gt(boosts.expiresAt, now),
    ))
    .limit(1);
  return result[0] ?? null;
}

// ── Message Queries ──

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get distinct conversation partners
  const sent = await db.select({ partnerId: messages.receiverId })
    .from(messages).where(eq(messages.senderId, userId)).groupBy(messages.receiverId);
  const received = await db.select({ partnerId: messages.senderId })
    .from(messages).where(eq(messages.receiverId, userId)).groupBy(messages.senderId);
  const partnerIds = [...new Set([...sent.map(r => r.partnerId), ...received.map(r => r.partnerId)])];
  return partnerIds;
}

export async function getMessages(userId: number, partnerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages)
    .where(or(
      and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
      and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId)),
    ))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function sendMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return result[0].insertId;
}

export async function markMessagesRead(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isRead: "true" })
    .where(and(
      eq(messages.receiverId, userId),
      eq(messages.senderId, senderId),
      eq(messages.isRead, "false"),
    ));
}

export async function unsendMessage(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isUnsent: "true" })
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)));
}

// ── Tap Queries ──

export async function sendTap(data: InsertTap) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(taps).values(data);
}

export async function getReceivedTaps(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taps)
    .where(eq(taps.receiverId, userId))
    .orderBy(desc(taps.createdAt))
    .limit(50);
}

export async function markTapsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(taps)
    .set({ isRead: "true" })
    .where(and(eq(taps.receiverId, userId), eq(taps.isRead, "false")));
}

// ── Profile View Queries ──

export async function recordProfileView(viewerId: number, viewedUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(profileViews).values({ viewerId, viewedUserId });
}

export async function getProfileViews(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileViews)
    .where(eq(profileViews.viewedUserId, userId))
    .orderBy(desc(profileViews.createdAt))
    .limit(50);
}

// ── Favorite Queries ──

export async function addFavorite(userId: number, favoriteUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(favorites).values({ userId, favoriteUserId });
}

export async function removeFavorite(userId: number, favoriteUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.favoriteUserId, favoriteUserId))
  );
}

export async function getFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

// ── Block Queries ──

export async function blockUser(blockerId: number, blockedUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blocks).values({ blockerId, blockedUserId });
  // Also remove from favorites
  await removeFavorite(blockerId, blockedUserId);
  await removeFavorite(blockedUserId, blockerId);
}

export async function unblockUser(blockerId: number, blockedUserId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blocks).where(
    and(eq(blocks.blockerId, blockerId), eq(blocks.blockedUserId, blockedUserId))
  );
}

export async function getBlockedUsers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blocks).where(eq(blocks.blockerId, userId));
}

export async function getBlockedUsersWithProfiles(userId: number) {
  const blocked = await getBlockedUsers(userId);
  const result = [];
  for (const row of blocked) {
    const profile = await getProfile(row.blockedUserId);
    result.push({
      blockedUserId: row.blockedUserId,
      displayName: profile?.displayName || "User",
      createdAt: row.createdAt,
    });
  }
  return result;
}

// ── Report Queries ──

export async function reportUser(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reports).values(data);
}

// ── Account Deletion ──

export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all user data in order (respecting foreign key-like relationships)
  await db.delete(reports).where(
    or(eq(reports.reporterId, userId), eq(reports.reportedUserId, userId))
  );
  await db.delete(blocks).where(
    or(eq(blocks.blockerId, userId), eq(blocks.blockedUserId, userId))
  );
  await db.delete(favorites).where(
    or(eq(favorites.userId, userId), eq(favorites.favoriteUserId, userId))
  );
  await db.delete(profileViews).where(
    or(eq(profileViews.viewerId, userId), eq(profileViews.viewedUserId, userId))
  );
  await db.delete(taps).where(
    or(eq(taps.senderId, userId), eq(taps.receiverId, userId))
  );
  await db.delete(messages).where(
    or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
  );
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}

// ── Photo Upload Helper ──

export async function updateProfileGallery(userId: number, gallery: { id: string; uri: string; isPrivate: boolean; order: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles)
    .set({ gallery, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId));
}
