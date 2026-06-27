import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { loadProfile, saveProfile } from "@/lib/storage";
import {
  UserProfile,
  DEFAULT_PROFILE,
  migrateProfileFields,
  migrateProfileToGallery,
} from "@/lib/mock-data";

/**
 * Hook that manages profile state with server sync.
 * - Authenticated users: load/save via tRPC (server DB)
 * - Unauthenticated users: load/save via AsyncStorage (local)
 *
 * The server profile is the source of truth when authenticated.
 * Local profile is used as a cache and for offline/unauthenticated use.
 */
export function useProfile() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE, gallery: [] });
  const [loading, setLoading] = useState(true);

  // tRPC queries/mutations
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 30_000,
  });

  const updateMutation = trpc.profile.update.useMutation();

  // Convert server profile to local UserProfile type
  const serverToLocal = useCallback((serverProfile: any): UserProfile => {
    if (!serverProfile) return { ...DEFAULT_PROFILE, gallery: [] };
    const raw: any = {
      ...DEFAULT_PROFILE,
      id: String(serverProfile.userId ?? serverProfile.id ?? "me"),
      displayName: serverProfile.displayName || "",
      name: serverProfile.displayName || "",
      age: serverProfile.age || 25,
      aboutMe: serverProfile.bio || "",
      bio: serverProfile.bio || "",
      gallery: serverProfile.gallery || [],
      tags: serverProfile.interests || [],
      interests: serverProfile.interests || [],
      isVisible: serverProfile.isVisible === "true",
      maxDistance: serverProfile.searchPreferences?.maxDistance || 5,
      // Grindr-style fields from JSON
      height: serverProfile.height ?? null,
      bodyType: serverProfile.bodyType ?? null,
      relationshipStatus: serverProfile.relationshipStatus ?? null,
      genderIdentity: serverProfile.genderIdentity ?? null,
      pronouns: serverProfile.pronouns ?? null,
      lookingFor: serverProfile.lookingFor ?? [],
      meetAt: serverProfile.meetAt ?? [],
      acceptingNSFW: serverProfile.acceptingNSFW ?? null,
      socialLinks: serverProfile.socialLinks ?? {},
      showAge: serverProfile.showAge ?? true,
    };
    return migrateProfileToGallery(migrateProfileFields(raw));
  }, []);

  // Load profile
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated && profileQuery.data) {
        const converted = serverToLocal(profileQuery.data);
        setProfile(converted);
        // Also cache locally
        await saveProfile(converted);
      } else {
        // Fallback to local storage
        const local = await loadProfile();
        setProfile(local);
      }
    } catch (e) {
      console.warn("[useProfile] Failed to load:", e);
      const local = await loadProfile();
      setProfile(local);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, profileQuery.data, serverToLocal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save profile
  const save = useCallback(
    async (updated: UserProfile) => {
      setProfile(updated);
      // Always save locally
      await saveProfile(updated);

      // If authenticated, also sync to server
      if (isAuthenticated && user) {
        try {
          await updateMutation.mutateAsync({
            displayName: updated.displayName || updated.name || undefined,
            age: updated.age || undefined,
            bio: updated.aboutMe || updated.bio || undefined,
            gallery: (updated.gallery || []).map((p) => ({
              id: p.id,
              uri: p.uri,
              isPrivate: p.isPrivate,
              order: p.order,
            })),
            interests: updated.tags.length > 0 ? updated.tags : updated.interests.length > 0 ? updated.interests : undefined,
            searchPreferences: {
              minAge: 18,
              maxAge: 45,
              maxDistance: updated.maxDistance || 5,
              interests: updated.tags || [],
            },
            // Grindr-style extended fields
            height: updated.height,
            bodyType: updated.bodyType,
            relationshipStatus: updated.relationshipStatus,
            genderIdentity: updated.genderIdentity,
            pronouns: updated.pronouns,
            lookingFor: updated.lookingFor,
            meetAt: updated.meetAt,
            acceptingNSFW: updated.acceptingNSFW,
            tags: updated.tags,
            socialLinks: updated.socialLinks,
            showAge: updated.showAge,
          });
        } catch (e) {
          console.warn("[useProfile] Failed to sync to server:", e);
          // Local save already done, so user doesn't lose data
        }
      }
    },
    [isAuthenticated, user, updateMutation]
  );

  // Refresh from server
  const refresh = useCallback(async () => {
    if (isAuthenticated) {
      await profileQuery.refetch();
    }
    await loadData();
  }, [isAuthenticated, profileQuery, loadData]);

  return {
    profile,
    loading: loading || profileQuery.isLoading,
    save,
    refresh,
    setProfile,
  };
}
