import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const.js";
import * as db from "./db";

// ── Types ──

type AuthenticatedSocket = WebSocket & {
  userId: number;
  isAlive: boolean;
};

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

// ── Online Users Tracking ──

/** Map of userId → Set of connected sockets (one user can have multiple devices) */
const connectedUsers = new Map<number, Set<AuthenticatedSocket>>();

/** Get all currently online user IDs */
export function getOnlineUserIds(): number[] {
  return Array.from(connectedUsers.keys());
}

/** Check if a specific user is online */
export function isUserOnline(userId: number): boolean {
  const sockets = connectedUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

/** Get online status for multiple users */
export function getOnlineStatuses(userIds: number[]): Record<number, boolean> {
  const result: Record<number, boolean> = {};
  for (const id of userIds) {
    result[id] = isUserOnline(id);
  }
  return result;
}

/** Send a message to a specific user (all their connected devices) */
export function sendToUser(userId: number, message: WsMessage): boolean {
  const sockets = connectedUsers.get(userId);
  if (!sockets || sockets.size === 0) return false;

  const data = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
  return true;
}

/** Broadcast a message to multiple users */
export function broadcastToUsers(userIds: number[], message: WsMessage): void {
  const data = JSON.stringify(message);
  for (const userId of userIds) {
    const sockets = connectedUsers.get(userId);
    if (!sockets) continue;
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}

// ── Authentication ──

async function authenticateConnection(req: IncomingMessage): Promise<number | null> {
  try {
    // Try Bearer token from URL query
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    // Try session cookie
    const cookieHeader = req.headers.cookie;
    let sessionToken = token || undefined;
    if (!sessionToken && cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      sessionToken = cookies[COOKIE_NAME] || undefined;
    }

    // Try Authorization header
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    if (!sessionToken) return null;

    // Verify the JWT session
    const session = await sdk.verifySession(sessionToken);
    if (!session?.openId) return null;

    // Look up the user by openId
    const user = await db.getUserByOpenId(session.openId);
    return user?.id ?? null;
  } catch (err) {
    console.warn("[WebSocket] Auth error:", err);
    return null;
  }
}

// ── Last Seen Updates ──

async function updateLastSeen(userId: number): Promise<void> {
  try {
    const database = await db.getDb();
    if (!database) return;
    const { userProfiles } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    await database
      .update(userProfiles)
      .set({ lastSeen: new Date() })
      .where(eq(userProfiles.userId, userId));
  } catch (err) {
    // Silently fail — non-critical
  }
}

// ── WebSocket Server Setup ──

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  console.log("[WebSocket] Server initialized on /ws");

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const socket = ws as AuthenticatedSocket;

    // Authenticate
    const userId = await authenticateConnection(req);
    if (!userId) {
      socket.close(4001, "Unauthorized");
      return;
    }

    socket.userId = userId;
    socket.isAlive = true;

    // Track connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket);

    console.log(`[WebSocket] User ${userId} connected (${connectedUsers.get(userId)!.size} devices)`);

    // Notify others this user came online
    broadcastStatusChange(userId, true);

    // Update last seen
    updateLastSeen(userId);

    // Handle pong for heartbeat
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    // Handle incoming messages
    socket.on("message", (rawData: WebSocket.RawData) => {
      try {
        const data = JSON.parse(rawData.toString()) as WsMessage;
        handleClientMessage(socket, data);
      } catch (err) {
        console.warn("[WebSocket] Invalid message from user", userId);
      }
    });

    // Handle disconnect
    socket.on("close", () => {
      const sockets = connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          connectedUsers.delete(userId);
          // Notify others this user went offline
          broadcastStatusChange(userId, false);
          // Update last seen
          updateLastSeen(userId);
        }
      }
      console.log(`[WebSocket] User ${userId} disconnected`);
    });

    socket.on("error", (err: Error) => {
      console.warn(`[WebSocket] Error for user ${userId}:`, err.message);
    });

    // Send welcome message
    socket.send(JSON.stringify({
      type: "connected",
      userId,
      onlineUsers: getOnlineUserIds(),
    }));
  });

  // Heartbeat interval — check every 30 seconds
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedSocket;
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

// ── Message Handlers ──

function handleClientMessage(socket: AuthenticatedSocket, data: WsMessage): void {
  switch (data.type) {
    case "typing":
      handleTyping(socket, data);
      break;
    case "stop_typing":
      handleStopTyping(socket, data);
      break;
    case "heartbeat":
      // Just update last seen
      updateLastSeen(socket.userId);
      socket.send(JSON.stringify({ type: "heartbeat_ack" }));
      break;
    case "get_online_status":
      handleGetOnlineStatus(socket, data);
      break;
    default:
      break;
  }
}

function handleTyping(socket: AuthenticatedSocket, data: WsMessage): void {
  const receiverId = data.receiverId as number;
  if (!receiverId) return;
  sendToUser(receiverId, {
    type: "typing",
    userId: socket.userId,
  });
}

function handleStopTyping(socket: AuthenticatedSocket, data: WsMessage): void {
  const receiverId = data.receiverId as number;
  if (!receiverId) return;
  sendToUser(receiverId, {
    type: "stop_typing",
    userId: socket.userId,
  });
}

function handleGetOnlineStatus(socket: AuthenticatedSocket, data: WsMessage): void {
  const userIds = data.userIds as number[];
  if (!Array.isArray(userIds)) return;
  const statuses = getOnlineStatuses(userIds);
  socket.send(JSON.stringify({
    type: "online_status",
    statuses,
  }));
}

function broadcastStatusChange(userId: number, isOnline: boolean): void {
  // Broadcast to all connected users (they can filter on client side)
  const message: WsMessage = {
    type: "status_change",
    userId,
    isOnline,
    timestamp: Date.now(),
  };

  // Send to all connected users except the one who changed status
  for (const [connectedUserId, sockets] of connectedUsers) {
    if (connectedUserId === userId) continue;
    const data = JSON.stringify(message);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}

// ── Public API for Server-Side Events ──

/** Notify a user about a new message in real-time */
export function notifyNewMessage(
  receiverId: number,
  message: {
    id: number;
    senderId: number;
    type: string;
    text: string | null;
    photoUrl: string | null;
    createdAt: string;
  }
): void {
  sendToUser(receiverId, {
    type: "new_message",
    message,
  });
}

/** Notify a user that their messages were read */
export function notifyMessagesRead(senderId: number, readByUserId: number): void {
  sendToUser(senderId, {
    type: "messages_read",
    readByUserId,
  });
}

/** Notify a user that a message was unsent */
export function notifyMessageUnsent(receiverId: number, messageId: number): void {
  sendToUser(receiverId, {
    type: "message_unsent",
    messageId,
  });
}

/** Notify a user about a new tap */
export function notifyNewTap(receiverId: number, senderId: number, tapType: string): void {
  sendToUser(receiverId, {
    type: "new_tap",
    senderId,
    tapType,
  });
}

/** Notify a user about a new profile view */
export function notifyProfileView(viewedUserId: number, viewerId: number): void {
  sendToUser(viewedUserId, {
    type: "profile_view",
    viewerId,
  });
}
