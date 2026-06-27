import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import * as push from "./push";
import * as subscription from "./subscription";
import * as ws from "./websocket";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Profile ──
  profile: router({
    get: protectedProcedure.query(({ ctx }) => {
      return db.getProfile(ctx.user.id);
    }),

    getById: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => {
        return db.getProfile(input.userId);
      }),

    update: protectedProcedure
      .input(z.object({
        displayName: z.string().max(100).optional(),
        age: z.number().min(18).max(120).optional(),
        bio: z.string().max(500).optional(),
        gallery: z.array(z.object({
          id: z.string(),
          uri: z.string(),
          isPrivate: z.boolean(),
          order: z.number(),
        })).optional(),
        interests: z.array(z.string()).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        isVisible: z.enum(["true", "false"]).optional(),
        subscriptionPlan: z.enum(["free", "plus", "premium"]).optional(),
        searchPreferences: z.object({
          minAge: z.number(),
          maxAge: z.number(),
          maxDistance: z.number(),
          interests: z.array(z.string()),
        }).optional(),
        // Grindr-style extended profile fields
        height: z.number().min(100).max(250).nullable().optional(),
        bodyType: z.string().max(50).nullable().optional(),
        relationshipStatus: z.string().max(50).nullable().optional(),
        genderIdentity: z.string().max(50).nullable().optional(),
        pronouns: z.string().max(50).nullable().optional(),
        lookingFor: z.array(z.string()).optional(),
        meetAt: z.array(z.string()).optional(),
        acceptingNSFW: z.string().max(50).nullable().optional(),
        tags: z.array(z.string()).optional(),
        socialLinks: z.object({
          instagram: z.string().optional(),
          spotify: z.string().optional(),
        }).optional(),
        showAge: z.boolean().optional(),
        incognito: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { isVisible: _ignored, ...rest } = input;
        return db.upsertProfile(ctx.user.id, rest);
      }),

    /** Toggle incognito mode (Premium only) */
    toggleIncognito: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getProfile(ctx.user.id);
        if (!profile) throw new Error("Profile not found");
        const ext = (profile.extendedProfile as any) || {};
        ext.incognito = input.enabled;
        await db.upsertProfile(ctx.user.id, { extendedProfile: ext } as any);
        return { incognito: input.enabled };
      }),

    /** Get incognito status */
    getIncognito: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!profile) return { incognito: false };
      const ext = (profile.extendedProfile as any) || {};
      return { incognito: ext.incognito === true };
    }),

    /** Whether others can see this user as online */
    getShowOnline: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (!profile) return { showOnline: true };
      const ext = (profile.extendedProfile as Record<string, unknown>) || {};
      return { showOnline: ext.showOnline !== false };
    }),

    setShowOnline: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getProfile(ctx.user.id);
        const ext = { ...((profile?.extendedProfile as Record<string, unknown>) || {}) };
        ext.showOnline = input.enabled;
        await db.upsertProfile(ctx.user.id, { extendedProfile: ext } as any);
        return { showOnline: input.enabled };
      }),
  }),

  // ── Discovery (Grid) ──
  discover: router({
    nearby: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(({ ctx, input }) => {
        return db.getNearbyProfiles(ctx.user.id, input?.limit ?? 100);
      }),

    /** Radar check-in status for the current user */
    radarStatus: protectedProcedure.query(({ ctx }) => {
      return db.getRadarStatus(ctx.user.id);
    }),

    /** Record explicit consent to appear on the radar map */
    setMapConsent: protectedProcedure
      .input(z.object({ consented: z.boolean() }))
      .mutation(({ ctx, input }) => {
        return db.setMapVisibilityConsent(ctx.user.id, input.consented);
      }),

    /** Manual check-in — user appears on radar until session expires */
    radarCheckIn: protectedProcedure
      .input(z.object({
        latitude: z.string(),
        longitude: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.radarCheckIn(ctx.user.id, input.latitude, input.longitude);
        } catch (error) {
          if (error instanceof Error && error.message.includes("consent")) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: error.message,
            });
          }
          throw error;
        }
      }),

    /** Manual check-out — hide from radar immediately */
    radarCheckOut: protectedProcedure.mutation(({ ctx }) => {
      return db.radarCheckOut(ctx.user.id);
    }),

    /** Explore: discover profiles from any location (Plus/Premium feature) */
    explore: protectedProcedure
      .input(z.object({
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
        limit: z.number().min(1).max(200).optional(),
      }))
      .query(({ ctx, input }) => {
        return db.getExploreProfiles(ctx.user.id, {
          city: input.city,
          country: input.country,
          limit: input.limit ?? 100,
        });
      }),
  }),

  // ── Messages ──
  messages: router({
    conversations: protectedProcedure.query(({ ctx }) => {
      return db.getConversations(ctx.user.id);
    }),

    list: protectedProcedure
      .input(z.object({
        partnerId: z.number(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(({ ctx, input }) => {
        return db.getMessages(ctx.user.id, input.partnerId, input.limit ?? 50);
      }),

    send: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        type: z.enum(["text", "photo", "expiring_photo"]).optional(),
        text: z.string().max(2000).optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.sendMessage({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          type: input.type ?? "text",
          text: input.text ?? null,
          photoUrl: input.photoUrl ?? null,
        });
        // Send push notification
        const senderName = await push.getUserDisplayName(ctx.user.id);
        const preview = input.type === "photo" || input.type === "expiring_photo"
          ? "Sent a photo"
          : input.text ?? "";
        push.notifyNewMessage(input.receiverId, senderName, preview).catch(console.error);
        // Real-time WebSocket notification
        ws.notifyNewMessage(input.receiverId, {
          id: (result as any)?.id ?? 0,
          senderId: ctx.user.id,
          type: input.type ?? "text",
          text: input.text ?? null,
          photoUrl: input.photoUrl ?? null,
          createdAt: new Date().toISOString(),
        });
        return result;
      }),

    markRead: protectedProcedure
      .input(z.object({ senderId: z.number() }))
      .mutation(({ ctx, input }) => {
        // Notify sender their messages were read
        ws.notifyMessagesRead(input.senderId, ctx.user.id);
        return db.markMessagesRead(ctx.user.id, input.senderId);
      }),

    unsend: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.unsendMessage(input.messageId, ctx.user.id);
        // Notify the other user about the unsent message
        // We don't know the receiverId here easily, but the client can handle it
        return result;
      }),
  }),

  // ── Taps ──
  taps: router({
    send: protectedProcedure
      .input(z.object({
        receiverId: z.number(),
        type: z.enum(["fire", "friendly", "wave"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.sendTap({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          type: input.type ?? "wave",
        });
        // Send push notification
        const senderName = await push.getUserDisplayName(ctx.user.id);
        push.notifyNewTap(input.receiverId, senderName, input.type ?? "wave").catch(console.error);
        // Real-time WebSocket notification
        ws.notifyNewTap(input.receiverId, ctx.user.id, input.type ?? "wave");
      }),

    received: protectedProcedure.query(({ ctx }) => {
      return db.getReceivedTaps(ctx.user.id);
    }),

    markRead: protectedProcedure.mutation(({ ctx }) => {
      return db.markTapsRead(ctx.user.id);
    }),
  }),

  // ── Profile Views ──
  views: router({
    record: protectedProcedure
      .input(z.object({ viewedUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if viewer is in incognito mode — if so, don't record the view
        const viewerProfile = await db.getProfile(ctx.user.id);
        const ext = (viewerProfile?.extendedProfile as any) || {};
        if (ext.incognito === true) {
          // Incognito: view is not recorded, no notification sent
          return;
        }
        await db.recordProfileView(ctx.user.id, input.viewedUserId);
        // Send push notification for profile view
        const viewerName = await push.getUserDisplayName(ctx.user.id);
        push.notifyProfileView(input.viewedUserId, viewerName).catch(console.error);
        // Real-time WebSocket notification
        ws.notifyProfileView(input.viewedUserId, ctx.user.id);
      }),

    myViewers: protectedProcedure.query(({ ctx }) => {
      return db.getProfileViews(ctx.user.id);
    }),
  }),

  // ── Favorites ──
  favorites: router({
    list: protectedProcedure.query(({ ctx }) => {
      return db.getFavorites(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({ favoriteUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.addFavorite(ctx.user.id, input.favoriteUserId);
        // Send push notification
        const senderName = await push.getUserDisplayName(ctx.user.id);
        push.notifyNewFavorite(input.favoriteUserId, senderName).catch(console.error);
      }),

    remove: protectedProcedure
      .input(z.object({ favoriteUserId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.removeFavorite(ctx.user.id, input.favoriteUserId);
      }),
  }),

  // ── Block & Report ──
  safety: router({
    block: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.blockUser(ctx.user.id, input.userId);
      }),

    unblock: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.unblockUser(ctx.user.id, input.userId);
      }),

    blockedList: protectedProcedure.query(({ ctx }) => {
      return db.getBlockedUsersWithProfiles(ctx.user.id);
    }),

    report: protectedProcedure
      .input(z.object({
        reportedUserId: z.number(),
        reason: z.enum(["spam", "harassment", "fake_profile", "inappropriate_content", "other"]),
        description: z.string().max(1000).optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.reportUser({
          reporterId: ctx.user.id,
          reportedUserId: input.reportedUserId,
          reason: input.reason,
          description: input.description ?? null,
        });
      }),
  }),

  // ── Subscriptions ──
  subscription: router({
    /** Get the current active subscription for the logged-in user */
    active: protectedProcedure.query(({ ctx }) => {
      return subscription.getActiveSubscription(ctx.user.id);
    }),

    /** Get subscription history */
    history: protectedProcedure.query(({ ctx }) => {
      return subscription.getSubscriptionHistory(ctx.user.id);
    }),

    /** Purchase a subscription — disabled in v1.0.2 (free launch) */
    purchase: protectedProcedure
      .input(z.object({
        planId: z.enum(["plus", "premium"]),
        duration: z.enum(["1_week", "1_month", "3_months", "12_months"]),
        store: z.enum(["apple", "google", "web"]),
        productId: z.string(),
        transactionId: z.string().optional(),
        receiptData: z.string().optional(),
      }))
      .mutation(() => {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "In-app purchases are not available in Gusha v1.0.2. All features are free.",
        });
      }),

    /** Cancel subscription (stops auto-renew) */
    cancel: protectedProcedure.mutation(({ ctx }) => {
      return subscription.cancelSubscription(ctx.user.id);
    }),

    /** Restore subscription (after reinstall) */
    restore: protectedProcedure.mutation(({ ctx }) => {
      return subscription.restoreSubscription(ctx.user.id);
    }),

    /** Validate a receipt from Apple/Google */
    validateReceipt: protectedProcedure
      .input(z.object({
        store: z.enum(["apple", "google", "web"]),
        receiptData: z.string(),
      }))
      .mutation(({ input }) => {
        return subscription.validateReceipt(input.store, input.receiptData);
      }),
  }),

  // ── Notifications ──
  notifications: router({
    registerToken: protectedProcedure
      .input(z.object({
        token: z.string(),
        platform: z.enum(["ios", "android", "web"]),
      }))
      .mutation(({ ctx, input }) => {
        return push.registerPushToken(ctx.user.id, input.token, input.platform);
      }),

    unregisterToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(({ ctx, input }) => {
        return push.unregisterPushToken(ctx.user.id, input.token);
      }),

    getPreferences: protectedProcedure.query(({ ctx }) => {
      return push.getNotificationPreferences(ctx.user.id);
    }),

    updatePreferences: protectedProcedure
      .input(z.object({
        pushEnabled: z.enum(["true", "false"]).optional(),
        messagesEnabled: z.enum(["true", "false"]).optional(),
        tapsEnabled: z.enum(["true", "false"]).optional(),
        viewsEnabled: z.enum(["true", "false"]).optional(),
        favoritesEnabled: z.enum(["true", "false"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        return push.updateNotificationPreferences(ctx.user.id, input);
      }),
  }),

  // ── Boost ──
  boost: router({
    /** Get active boost for current user */
    active: protectedProcedure.query(({ ctx }) => {
      return db.getActiveBoost(ctx.user.id);
    }),

    /** Activate a 1-hour boost */
    activate: protectedProcedure.mutation(async ({ ctx }) => {
      return db.activateBoost(ctx.user.id);
    }),
  }),

  // ── Online Status ──
  online: router({
    /** Get online status for a list of user IDs */
    status: protectedProcedure
      .input(z.object({ userIds: z.array(z.number()).max(200) }))
      .query(async ({ input }) => {
        return ws.getOnlineStatuses(input.userIds);
      }),
  }),

  // ── Account ──
  account: router({
    delete: protectedProcedure
      .input(z.object({
        confirmation: z.literal("DELETE"),
      }))
      .mutation(async ({ ctx }) => {
        await db.deleteUserAccount(ctx.user.id);
        // Clear session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true };
      }),
  }),

  // ── Photo Upload ──
  upload: router({
    photo: protectedProcedure
      .input(z.object({
        base64: z.string(),
        fileName: z.string(),
        contentType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const key = `photos/${ctx.user.id}/${input.fileName}-${randomSuffix}`;
        const { url } = await storagePut(key, buffer, input.contentType ?? "image/jpeg");
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
