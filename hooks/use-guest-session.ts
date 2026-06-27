import { useCallback, useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { getApiBaseUrl } from "@/constants/oauth";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { isRegistrationComplete, loadProfile } from "@/lib/storage";
import { localProfileToServerUpdate } from "@/lib/sync-profile";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export type GuestSessionResult =
  | { ok: true }
  | { ok: false; message: string };

type GuestSessionListener = () => void;
const listeners = new Set<GuestSessionListener>();

let _guestSessionAttempted = false;
let _guestSessionEstablishing = false;
let _guestSessionAttemptComplete = false;

function notifyGuestSessionStatus() {
  listeners.forEach((listener) => listener());
}

function setGuestSessionFlags(establishing: boolean, attemptComplete: boolean) {
  _guestSessionEstablishing = establishing;
  _guestSessionAttemptComplete = attemptComplete;
  notifyGuestSessionStatus();
}

export function subscribeGuestSessionStatus(listener: GuestSessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isGuestSessionEstablishing(): boolean {
  return _guestSessionEstablishing;
}

export function isGuestSessionAttemptComplete(): boolean {
  return _guestSessionAttemptComplete;
}

/** Reset after sign-out so the next launch can re-establish a guest session. */
export function resetGuestSessionAttempt(): void {
  _guestSessionAttempted = false;
  setGuestSessionFlags(false, false);
}

const GUEST_FETCH_TIMEOUT_MS = 20_000;
const GUEST_MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function showGuestSessionFailureAlert(
  message: string,
  onRetry?: () => void
): void {
  const buttons = onRetry
    ? [
        { text: "Try Again", onPress: onRetry },
        { text: "OK", style: "cancel" as const },
      ]
    : [{ text: "OK" }];
  Alert.alert("Connection Problem", message, buttons);
}

async function postGuestSession(
  url: string,
  deviceId: string,
  displayName: string | undefined
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GUEST_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({
        deviceId,
        displayName,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ensures a server session exists for users who completed local registration.
 */
export async function ensureGuestSession(): Promise<GuestSessionResult> {
  const existing = await Auth.getUserInfo();
  if (existing) return { ok: true };

  const registered = await isRegistrationComplete();
  if (!registered) {
    return { ok: false, message: "Please finish setup before continuing." };
  }

  const deviceId = await getOrCreateDeviceId();
  const profile = await loadProfile();
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/auth/guest` : "/api/auth/guest";
  const displayName = profile.displayName || profile.name || undefined;

  let lastMessage =
    "Could not connect to Gusha. Check your internet connection and try again.";

  for (let attempt = 1; attempt <= GUEST_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await postGuestSession(url, deviceId, displayName);

      if (!response.ok) {
        let message = lastMessage;
        try {
          const err = (await response.json()) as { error?: string };
          if (err.error === "Failed to create guest user") {
            message =
              "Our servers are temporarily unavailable. Please try again in a moment.";
          } else if (err.error) {
            message = err.error;
          }
        } catch {
          // use default message
        }
        lastMessage = message;
        console.warn("[GuestSession] register failed:", response.status, message);
        if (attempt < GUEST_MAX_ATTEMPTS) {
          await delay(attempt * 1000);
          continue;
        }
        return { ok: false, message: lastMessage };
      }

      const data = (await response.json()) as {
        sessionToken: string;
        user: {
          id: number;
          openId: string;
          name: string | null;
          email: string | null;
          loginMethod: string | null;
          lastSignedIn: string;
        };
      };

      const user: Auth.User = {
        id: data.user.id,
        openId: data.user.openId,
        name: data.user.name,
        email: data.user.email,
        loginMethod: data.user.loginMethod,
        lastSignedIn: new Date(data.user.lastSignedIn),
      };

      if (Platform.OS === "web" && data.sessionToken) {
        await Api.establishSession(data.sessionToken);
      }
      await Auth.completeLogin(data.sessionToken, user);
      return { ok: true };
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      lastMessage = aborted
        ? "The connection timed out. Please check your network and try again."
        : "Could not reach Gusha servers. Check your internet connection and try again.";
      console.warn("[GuestSession] network error:", e);
      if (attempt < GUEST_MAX_ATTEMPTS) {
        await delay(attempt * 1000);
        continue;
      }
    }
  }

  return { ok: false, message: lastMessage };
}

/** Wraps ensureGuestSession and tracks establishment state for auth-gate. */
export async function connectGuestSession(): Promise<GuestSessionResult> {
  setGuestSessionFlags(true, false);
  try {
    return await ensureGuestSession();
  } finally {
    setGuestSessionFlags(false, true);
  }
}

/** Auto-establish guest session after local registration completes. */
export function useGuestSession() {
  const { isAuthenticated, loading, refetch } = useAuth();
  const updateMutation = trpc.profile.update.useMutation();

  const syncLocalProfile = useCallback(async () => {
    const profile = await loadProfile();
    await updateMutation.mutateAsync(localProfileToServerUpdate(profile));
  }, [updateMutation]);

  const ensureSession = useCallback(async () => {
    const result = await connectGuestSession();
    if (result.ok) {
      await refetch();
      try {
        await syncLocalProfile();
      } catch (e) {
        console.warn("[GuestSession] profile sync failed:", e);
      }
    }
    return result;
  }, [refetch, syncLocalProfile]);

  useEffect(() => {
    if (loading || isAuthenticated || _guestSessionAttempted) return;
    _guestSessionAttempted = true;
    (async () => {
      if (await isRegistrationComplete()) {
        await ensureSession();
      } else {
        setGuestSessionFlags(false, true);
      }
    })();
  }, [loading, isAuthenticated, ensureSession]);

  return { ensureSession, isEstablishing: updateMutation.isPending };
}
