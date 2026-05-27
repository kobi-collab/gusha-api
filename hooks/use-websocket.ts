import { useEffect, useRef, useCallback, useState } from "react";
import { AppState, Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { useAuth } from "@/hooks/use-auth";

// ── Types ──

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

type MessageHandler = (message: WsMessage) => void;

// ── Singleton WebSocket Manager ──

let globalWs: WebSocket | null = null;
let globalHandlers = new Set<MessageHandler>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 2000;
let isConnecting = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function getWsUrl(): string {
  const apiBase = getApiBaseUrl();
  // Convert http(s) to ws(s)
  const wsBase = apiBase.replace(/^http/, "ws");
  return `${wsBase}/ws`;
}

async function connect(): Promise<void> {
  if (isConnecting || (globalWs && globalWs.readyState === WebSocket.OPEN)) {
    return;
  }

  isConnecting = true;

  try {
    const token = await Auth.getSessionToken();
    if (!token) {
      isConnecting = false;
      return;
    }

    const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WS] Connected");
      isConnecting = false;
      reconnectAttempts = 0;
      globalWs = ws;

      // Start heartbeat
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 25_000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage;
        for (const handler of globalHandlers) {
          handler(data);
        }
      } catch (err) {
        // Ignore invalid messages
      }
    };

    ws.onclose = (event) => {
      console.log("[WS] Disconnected:", event.code, event.reason);
      isConnecting = false;
      globalWs = null;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      // Don't reconnect if intentionally closed (4001 = unauthorized)
      if (event.code === 4001) return;

      // Reconnect with exponential backoff
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.warn("[WS] Error:", error);
      isConnecting = false;
    };
  } catch (err) {
    console.warn("[WS] Connection failed:", err);
    isConnecting = false;
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("[WS] Max reconnect attempts reached");
    return;
  }

  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), 30_000);
  reconnectAttempts++;

  console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
  if (globalWs) {
    globalWs.close(1000, "User disconnected");
    globalWs = null;
  }
}

export function sendWsMessage(message: WsMessage): boolean {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// ── React Hook ──

/**
 * Hook to manage WebSocket connection and subscribe to messages.
 * Auto-connects on login, disconnects on logout.
 * Handles app state changes (background/foreground).
 */
export function useWebSocket(onMessage?: MessageHandler) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Connection status tracking handler
  useEffect(() => {
    const statusHandler: MessageHandler = (msg) => {
      if (msg.type === "connected") {
        setIsConnected(true);
      }
    };
    globalHandlers.add(statusHandler);
    return () => {
      globalHandlers.delete(statusHandler);
    };
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!onMessage) return;

    const handler: MessageHandler = (msg) => {
      onMessageRef.current?.(msg);
    };
    globalHandlers.add(handler);
    return () => {
      globalHandlers.delete(handler);
    };
  }, [onMessage]);

  // Auto-connect on auth, disconnect on logout
  useEffect(() => {
    if (isAuthenticated) {
      reconnectAttempts = 0;
      connect();
    } else {
      disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  // Handle app state changes
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isAuthenticated) {
        // App came to foreground — reconnect if needed
        if (!globalWs || globalWs.readyState !== WebSocket.OPEN) {
          reconnectAttempts = 0;
          connect();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  const send = useCallback((message: WsMessage) => {
    return sendWsMessage(message);
  }, []);

  return { isConnected, send };
}

// ── Typing Indicator Helpers ──

export function sendTyping(receiverId: number): void {
  sendWsMessage({ type: "typing", receiverId });
}

export function sendStopTyping(receiverId: number): void {
  sendWsMessage({ type: "stop_typing", receiverId });
}

// ── Online Status Helpers ──

export function requestOnlineStatus(userIds: number[]): void {
  sendWsMessage({ type: "get_online_status", userIds });
}
