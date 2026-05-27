import { useMemo } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  NearbyUser,
  SearchPreferences,
  DEFAULT_SEARCH_PREFERENCES,
} from "@/lib/mock-data";
import { DEMO_NEARBY_USERS } from "@/lib/demo-data";

function isDemoMode(): boolean {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("demo_mode") === "true";
  }
  return false;
}

/**
 * Hook that loads nearby profiles from the server.
 * Falls back to demo data when in demo mode, or empty array when not authenticated.
 */
export function useDiscovery(prefs: SearchPreferences = DEFAULT_SEARCH_PREFERENCES) {
  const { isAuthenticated } = useAuth();
  const demo = isDemoMode();

  const nearbyQuery = trpc.discover.nearby.useQuery(
    { limit: 200 },
    {
      enabled: isAuthenticated && !demo,
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  // Convert server profiles to NearbyUser format
  const users: NearbyUser[] = useMemo(() => {
    // Demo mode: return demo profiles
    if (demo) return DEMO_NEARBY_USERS;

    if (!nearbyQuery.data || nearbyQuery.data.length === 0) return DEMO_NEARBY_USERS;
    return nearbyQuery.data.map((p: any) => ({
      id: String(p.userId ?? p.id),
      displayName: p.displayName || "Anonymous",
      age: p.age || 0,
      showAge: p.showAge ?? true,
      aboutMe: p.bio || "",
      photoUrl: p.gallery?.[0]?.uri || "",
      gallery: p.gallery || [],
      distance: 0,
      bearing: 0,
      isOnline: false,
      lastSeen: new Date(p.updatedAt).getTime(),
      height: p.height ?? null,
      bodyType: p.bodyType ?? null,
      relationshipStatus: p.relationshipStatus ?? null,
      genderIdentity: p.genderIdentity ?? null,
      pronouns: p.pronouns ?? null,
      lookingFor: p.lookingFor ?? [],
      meetAt: p.meetAt ?? [],
      acceptingNSFW: p.acceptingNSFW ?? null,
      tags: p.interests || [],
      socialLinks: p.socialLinks ?? {},
      mood: p.mood ?? null,
      interests: p.interests || [],
      bio: p.bio || "",
      name: p.displayName || "",
    }));
  }, [nearbyQuery.data, demo]);

  // Apply local filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.age && (user.age < prefs.minAge || user.age > prefs.maxAge)) return false;
      if (prefs.onlineOnly && !user.isOnline) return false;
      return true;
    });
  }, [users, prefs]);

  return {
    users: filteredUsers,
    allUsers: users,
    loading: demo ? false : nearbyQuery.isLoading,
    refetch: nearbyQuery.refetch,
    isRefetching: demo ? false : nearbyQuery.isRefetching,
  };
}
