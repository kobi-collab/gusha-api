import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        // Check for demo mode first
        const isDemoMode = window.localStorage.getItem("demo_mode") === "true";
        if (isDemoMode) {
          console.log("[useAuth] Web: Demo mode detected, using cached user");
          const cachedUser = await Auth.getUserInfo();
          if (cachedUser) {
            setUser(cachedUser);
            setLoading(false);
            return;
          }
        }

        // Not demo mode — try to get user from server (cookie-based)
        console.log("[useAuth] Web: Fetching user from server...");
        const serverUser = await Api.getMe();
        if (serverUser) {
          const u: Auth.User = {
            id: serverUser.id,
            openId: serverUser.openId,
            name: serverUser.name,
            email: serverUser.email,
            loginMethod: serverUser.loginMethod,
            lastSignedIn: new Date(serverUser.lastSignedIn),
          };
          await Auth.setUserInfo(u);
          setUser(u);
          console.log("[useAuth] Web: User fetched from server:", u.name);
        } else {
          console.log("[useAuth] Web: No user on server, not logged in");
          setUser(null);
        }
      } else {
        // Native platform: use stored user info
        console.log("[useAuth] Native: Checking stored user info...");
        const cachedUser = await Auth.getUserInfo();
        if (cachedUser) {
          console.log("[useAuth] Native: User found in SecureStore:", cachedUser.name);
          setUser(cachedUser);
        } else {
          console.log("[useAuth] Native: No stored user info");
          setUser(null);
        }
      }
    } catch (err) {
      console.error("[useAuth] fetchUser error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  // Subscribe to auth state changes (login/logout events from completeLogin/completeLogout)
  useEffect(() => {
    const unsubscribe = Auth.onAuthChange(() => {
      console.log("[useAuth] Auth state changed, re-fetching user");
      fetchUser();
    });
    return unsubscribe;
  }, [fetchUser]);

  const logout = useCallback(async () => {
    console.log("[useAuth] logout called");
    try {
      if (Platform.OS === "web") {
        window.localStorage.removeItem("demo_mode");
        // Best-effort server logout (clears cookie)
        await Api.logout().catch((e) => console.warn("[useAuth] Server logout failed:", e));
      }
      await Auth.completeLogout();
      setUser(null);
    } catch (err) {
      console.error("[useAuth] logout error:", err);
    }
  }, []);

  const isAuthenticated = useMemo(() => user !== null, [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    logout,
    refetch: fetchUser,
  };
}
