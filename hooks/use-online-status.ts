import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket, type WsMessage } from "./use-websocket";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// ── Types ──

export interface OnlineStatus {
  isOnline: boolean;
  lastSeen?: number; // timestamp
}

// ── Global Online Status Cache ──

const onlineStatusCache = new Map<number, OnlineStatus>();
const statusListeners = new Set<() => void>();

function updateCache(userId: number, status: OnlineStatus): void {
  onlineStatusCache.set(userId, status);
  for (const listener of statusListeners) {
    listener();
  }
}

// ── Format Last Seen ──

export function formatLastSeen(lastSeen?: number | null): string {
  if (!lastSeen) return "";

  const now = Date.now();
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return "";
}

// ── Hook: Track online status for a set of user IDs ──

export function useOnlineStatus(userIds: number[]) {
  const { isAuthenticated } = useAuth();
  const [statuses, setStatuses] = useState<Map<number, OnlineStatus>>(new Map());
  const userIdsRef = useRef(userIds);
  userIdsRef.current = userIds;

  // Handle WebSocket status change events
  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "status_change") {
      const userId = msg.userId as number;
      const isOnline = msg.isOnline as boolean;
      const timestamp = msg.timestamp as number;

      updateCache(userId, {
        isOnline,
        lastSeen: isOnline ? undefined : timestamp,
      });
    }

    if (msg.type === "online_status") {
      const statusList = msg.statuses as Array<{ userId: number; isOnline: boolean; lastSeen?: number }>;
      if (Array.isArray(statusList)) {
        for (const s of statusList) {
          updateCache(s.userId, { isOnline: s.isOnline, lastSeen: s.lastSeen });
        }
      }
    }

    if (msg.type === "connected") {
      const onlineUsers = msg.onlineUsers as number[];
      if (Array.isArray(onlineUsers)) {
        for (const uid of onlineUsers) {
          updateCache(uid, { isOnline: true });
        }
      }
    }
  }, []);

  useWebSocket(handleWsMessage);

  // Fetch initial statuses via tRPC
  const statusQuery = trpc.online.status.useQuery(
    { userIds: userIds.slice(0, 200) },
    {
      enabled: isAuthenticated && userIds.length > 0,
      staleTime: 30_000,
      refetchInterval: 60_000,
    }
  );

  // Update cache from server response
  useEffect(() => {
    const data = statusQuery.data;
    if (!data) return;
    if (Array.isArray(data)) {
      for (const s of data as Array<{ userId: number; isOnline: boolean; lastSeen?: number }>) {
        updateCache(s.userId, { isOnline: s.isOnline, lastSeen: s.lastSeen });
      }
      return;
    }
    if (typeof data === "object") {
      for (const [id, isOnline] of Object.entries(data as Record<string, boolean>)) {
        updateCache(Number(id), { isOnline: Boolean(isOnline) });
      }
    }
  }, [statusQuery.data]);

  // Subscribe to cache changes
  useEffect(() => {
    const listener = () => {
      const newStatuses = new Map<number, OnlineStatus>();
      for (const uid of userIdsRef.current) {
        const cached = onlineStatusCache.get(uid);
        if (cached) {
          newStatuses.set(uid, cached);
        }
      }
      setStatuses(newStatuses);
    };

    statusListeners.add(listener);
    // Initial sync
    listener();

    return () => {
      statusListeners.delete(listener);
    };
  }, [userIds.join(",")]);

  const isOnline = useCallback((userId: number): boolean => {
    return statuses.get(userId)?.isOnline ?? false;
  }, [statuses]);

  const getLastSeen = useCallback((userId: number): number | undefined => {
    return statuses.get(userId)?.lastSeen;
  }, [statuses]);

  return { statuses, isOnline, getLastSeen };
}

// ── Hook: Single user online status ──

export function useUserOnlineStatus(userId: number | undefined) {
  const userIds = userId ? [userId] : [];
  const { isOnline, getLastSeen } = useOnlineStatus(userIds);

  return {
    isOnline: userId ? isOnline(userId) : false,
    lastSeen: userId ? getLastSeen(userId) : undefined,
  };
}
