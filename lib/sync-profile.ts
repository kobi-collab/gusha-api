import type { UserProfile } from "@/lib/mock-data";

/**
 * Map local UserProfile to server profile.update payload.
 */
export function localProfileToServerUpdate(profile: UserProfile) {
  return {
    displayName: profile.displayName || profile.name || undefined,
    age: profile.age || undefined,
    bio: profile.aboutMe || profile.bio || undefined,
    gallery: (profile.gallery || []).map((p) => ({
      id: p.id,
      uri: p.uri,
      isPrivate: p.isPrivate,
      order: p.order,
    })),
    interests:
      profile.tags.length > 0
        ? profile.tags
        : profile.interests.length > 0
          ? profile.interests
          : undefined,
    searchPreferences: {
      minAge: 18,
      maxAge: 45,
      maxDistance: profile.maxDistance || 5,
      interests: profile.tags || [],
    },
    height: profile.height,
    bodyType: profile.bodyType,
    relationshipStatus: profile.relationshipStatus,
    genderIdentity: profile.genderIdentity,
    pronouns: profile.pronouns,
    lookingFor: profile.lookingFor,
    meetAt: profile.meetAt,
    acceptingNSFW: profile.acceptingNSFW,
    tags: profile.tags,
    socialLinks: profile.socialLinks,
    showAge: profile.showAge,
  };
}
