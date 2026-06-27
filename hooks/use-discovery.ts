import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  NearbyUser,
  SearchPreferences,
  DEFAULT_SEARCH_PREFERENCES,
} from "@/lib/mock-data";
import { DEMO_NEARBY_USERS } from "@/lib/demo-data";
import { isExplicitDemoMode } from "@/lib/app-mode";
import { useDemoRadarStatus } from "@/lib/demo-radar";
import { bearingDegrees, distanceMeters, parseCoord } from "@/lib/geo";

type ViewerLocation = {
  latitude: string | null;
  longitude: string | null;
};

/**
 * Loads nearby profiles from the server, or demo data in explicit demo mode.
 */
export function useDiscovery(
  prefs: SearchPreferences = DEFAULT_SEARCH_PREFERENCES,
  viewerLocation: ViewerLocation = { latitude: null, longitude: null }
) {
  const { isAuthenticated, user } = useAuth();
  const demo = isExplicitDemoMode(user?.loginMethod);
  const demoRadar = useDemoRadarStatus();

  const nearbyQuery = trpc.discover.nearby.useQuery(
    { limit: 200 },
    {
      enabled: isAuthenticated && !demo,
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  const nearbyUserIds = useMemo(() => {
    if (demo || !nearbyQuery.data) return [];
    return nearbyQuery.data
      .map((p: { userId?: number; id?: number }) => Number(p.userId ?? p.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
  }, [demo, nearbyQuery.data]);

  const onlineQuery = trpc.online.status.useQuery(
    { userIds: nearbyUserIds },
    {
      enabled: isAuthenticated && !demo && nearbyUserIds.length > 0,
      staleTime: 30_000,
    }
  );

  const viewerLat = parseCoord(viewerLocation.latitude);
  const viewerLon = parseCoord(viewerLocation.longitude);

  const users: NearbyUser[] = useMemo(() => {
    if (demo) {
      return demoRadar.isCheckedIn ? DEMO_NEARBY_USERS : [];
    }
    if (!nearbyQuery.data || nearbyQuery.data.length === 0) return [];

    const onlineMap = onlineQuery.data as Record<number, boolean> | undefined;

    return nearbyQuery.data.map((p: {
      userId?: number;
      id?: number;
      displayName?: string;
      age?: number;
      showAge?: boolean;
      bio?: string;
      gallery?: { uri: string }[];
      updatedAt: string;
      height?: number | null;
      bodyType?: string | null;
      relationshipStatus?: string | null;
      genderIdentity?: string | null;
      pronouns?: string | null;
      lookingFor?: string[];
      meetAt?: string[];
      acceptingNSFW?: string | null;
      mood?: string | null;
      interests?: string[];
    }) => {
      const userId = Number(p.userId ?? p.id);
      const lat = parseCoord((p as { latitude?: string }).latitude);
      const lon = parseCoord((p as { longitude?: string }).longitude);
      let distance = 0;
      let bearing = 0;
      if (viewerLat != null && viewerLon != null && lat != null && lon != null) {
        distance = distanceMeters(viewerLat, viewerLon, lat, lon);
        bearing = bearingDegrees(viewerLat, viewerLon, lat, lon);
      }

      return {
        id: String(userId),
        displayName: p.displayName || "Anonymous",
        age: p.age || 0,
        showAge: p.showAge ?? true,
        aboutMe: p.bio || "",
        photoUrl: p.gallery?.[0]?.uri || "",
        gallery: p.gallery || [],
        distance,
        bearing,
        isOnline: onlineMap?.[userId] ?? false,
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
        socialLinks: (p as { socialLinks?: Record<string, string> }).socialLinks ?? {},
        mood: p.mood ?? null,
        interests: p.interests || [],
        bio: p.bio || "",
        name: p.displayName || "",
      };
    });
  }, [nearbyQuery.data, demo, demoRadar.isCheckedIn, viewerLat, viewerLon, onlineQuery.data]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.age && (user.age < prefs.minAge || user.age > prefs.maxAge)) return false;
      if (prefs.onlineOnly && !user.isOnline) return false;
      if (user.distance > prefs.maxDistance * 1000) return false;
      if (prefs.interests.length > 0) {
        const hasMatch = user.interests.some((i) => prefs.interests.includes(i));
        if (!hasMatch) return false;
      }
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
