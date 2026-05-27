// ── Photo Gallery Types ──

export interface PhotoItem {
  id: string;
  uri: string;
  isPrivate: boolean;
  order: number; // 0 = primary
}

/** Future-ready model for private photo access requests */
export interface PrivatePhotoRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  status: "pending" | "approved" | "denied";
  createdAt: number;
  respondedAt: number | null;
}

// ── Profile Field Options (Grindr-style) ──

export const BODY_TYPES = [
  "Slim", "Average", "Toned", "Muscular", "Large", "Prefer not to say",
] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const RELATIONSHIP_STATUSES = [
  "Single", "Seeing Someone", "Partnered", "Open Relationship", "Prefer not to say",
] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export const GENDER_IDENTITIES = [
  "Woman", "Cis Woman", "Trans Woman", "Man", "Cis Man", "Trans Man",
  "Non-binary", "Genderqueer", "Genderfluid", "Agender", "Two-Spirit",
  "Other", "Prefer not to say",
] as const;
export type GenderIdentity = (typeof GENDER_IDENTITIES)[number];

export const PRONOUNS_OPTIONS = [
  "She/Her", "They/Them", "He/Him", "Ze/Hir", "Ze/Zir",
  "Use My Name", "Ask Me",
] as const;
export type PronounsOption = (typeof PRONOUNS_OPTIONS)[number];

export const LOOKING_FOR_OPTIONS = [
  "Friends", "Hangouts", "Community", "Events", "Gaming Partners",
] as const;
export type LookingForOption = (typeof LOOKING_FOR_OPTIONS)[number];

export const MEET_AT_OPTIONS = [
  "Coffee Shop", "Bar", "Park", "Restaurant", "Community Event",
] as const;
export type MeetAtOption = (typeof MEET_AT_OPTIONS)[number];

export const NSFW_PREFS = [
  "No Thanks", "Maybe Later", "Sure",
] as const;
export type NSFWPref = (typeof NSFW_PREFS)[number];

// ── Mood Radar ──
export const MOOD_OPTIONS = [
  { key: "friends", emoji: "\u{1F91D}", label: "Looking for Friends", color: "#4CAF50" },
  { key: "hangout", emoji: "\u2615", label: "Down to Hang Out", color: "#FF9800" },
  { key: "vibing", emoji: "\u{1F3B6}", label: "Just Vibing", color: "#9C27B0" },
  { key: "buddy", emoji: "\u{1FAC2}", label: "Need a Buddy", color: "#00BCD4" },
  { key: "games", emoji: "\u{1F3AE}", label: "Up for Games", color: "#E91E63" },
] as const;
export type MoodKey = (typeof MOOD_OPTIONS)[number]["key"];
export function getMoodByKey(key: string | null | undefined) {
  return MOOD_OPTIONS.find(m => m.key === key) || null;
}

export const ALL_TAGS = [
  "Hiking", "Music", "Art", "Cooking", "Travel", "Photography",
  "Yoga", "Reading", "Coffee", "Film", "Dogs", "Cats",
  "Dancing", "Gaming", "Fitness", "Nature", "Writing", "Tech",
  "Plants", "Meditation", "Adventure", "Running", "Poetry",
  "Wine", "Beach", "Camping", "Cycling", "Surfing", "Climbing",
  "Tattoos", "Fashion", "Foodie", "Karaoke", "Board Games",
  "Volunteering", "Activism", "Astrology", "Spirituality",
] as const;

// ── User Types ──

export interface NearbyUser {
  id: string;
  displayName: string;
  age: number;
  showAge: boolean;
  aboutMe: string;
  photoUrl: string; // primary photo URI
  gallery: PhotoItem[];
  distance: number; // meters
  bearing: number; // degrees from north (0-360)
  isOnline: boolean;
  lastSeen: number; // timestamp
  // Grindr-style fields
  height: number | null; // cm
  bodyType: BodyType | null;
  relationshipStatus: RelationshipStatus | null;
  genderIdentity: GenderIdentity | null;
  pronouns: PronounsOption | null;
  lookingFor: LookingForOption[];
  meetAt: MeetAtOption[];
  acceptingNSFW: NSFWPref | null;
  tags: string[];
  socialLinks: { instagram?: string; spotify?: string };
  // Mood Radar
  mood: MoodKey | null;
  // Legacy compat
  interests: string[];
  bio: string;
  name: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  lastMessageType?: "text" | "photo" | "expiring_photo";
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type?: "text" | "photo" | "expiring_photo";
  photoUri?: string;
  isExpired?: boolean;
  isRead?: boolean;
  isUnsent?: boolean;
}

export interface TapItem {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: "fire" | "friendly" | "wave";
  createdAt: number;
  isRead: boolean;
}

export interface ProfileView {
  id: string;
  viewerId: string;
  viewerName: string;
  viewerPhoto: string;
  viewerAge: number;
  viewerDistance: number;
  viewedAt: number;
}

export interface FavoriteUser {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userAge: number;
  userDistance: number;
  isOnline: boolean;
  addedAt: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  age: number;
  showAge: boolean;
  aboutMe: string;
  photoUri: string | null; // backward compat – primary photo
  gallery: PhotoItem[];
  // Grindr-style fields
  height: number | null; // cm
  bodyType: BodyType | null;
  relationshipStatus: RelationshipStatus | null;
  genderIdentity: GenderIdentity | null;
  pronouns: PronounsOption | null;
  lookingFor: LookingForOption[];
  meetAt: MeetAtOption[];
  acceptingNSFW: NSFWPref | null;
  tags: string[];
  socialLinks: { instagram?: string; spotify?: string };
  // Mood Radar
  mood: MoodKey | null;
  // Settings
  isVisible: boolean;
  maxDistance: number;
  // Legacy compat
  interests: string[];
  name: string;
  bio: string;
}

export interface SearchPreferences {
  minAge: number;
  maxAge: number;
  maxDistance: number; // km
  interests: string[]; // empty = no filter
  bodyTypes: BodyType[];
  lookingFor: LookingForOption[];
  onlineOnly: boolean;
  showGenders: GenderIdentity[]; // empty = show everyone
}

// ── Defaults ──

export const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  minAge: 18,
  maxAge: 45,
  maxDistance: 5,
  interests: [],
  bodyTypes: [],
  lookingFor: [],
  onlineOnly: false,
  showGenders: [],
};

export const ALL_INTERESTS = ALL_TAGS.slice(0, 23) as unknown as string[];

const AVATAR_COLORS = [
  "#D946A8", "#E879C0", "#A855F7", "#8B5CF6",
  "#EC4899", "#F472B6", "#C084FC", "#818CF8",
];

export const DEFAULT_PROFILE: UserProfile = {
  id: "me",
  displayName: "",
  age: 25,
  showAge: true,
  aboutMe: "",
  photoUri: null,
  gallery: [],
  height: null,
  bodyType: null,
  relationshipStatus: null,
  genderIdentity: null,
  pronouns: null,
  lookingFor: [],
  meetAt: [],
  acceptingNSFW: null,
  tags: [],
  socialLinks: {},
  mood: null,
  isVisible: true,
  maxDistance: 5,
  // Legacy compat
  interests: [],
  name: "",
  bio: "",
};

// ── Gallery Helpers ──

/** Get the primary (public) photo from a gallery, or null */
export function getPrimaryPhoto(gallery: PhotoItem[]): string | null {
  if (!gallery || gallery.length === 0) return null;
  const sorted = [...gallery].sort((a, b) => a.order - b.order);
  const publicPhoto = sorted.find((p) => !p.isPrivate);
  return publicPhoto?.uri ?? null;
}

/** Count private photos in a gallery */
export function getPrivatePhotoCount(gallery: PhotoItem[]): number {
  if (!gallery) return 0;
  return gallery.filter((p) => p.isPrivate).length;
}

/** Get all public photos from a gallery, sorted by order */
export function getPublicPhotos(gallery: PhotoItem[]): PhotoItem[] {
  if (!gallery) return [];
  return [...gallery].filter((p) => !p.isPrivate).sort((a, b) => a.order - b.order);
}

/** Create a new PhotoItem */
export function createPhotoItem(uri: string, order: number, isPrivate = false): PhotoItem {
  return {
    id: `photo_${Date.now()}_${order}`,
    uri,
    isPrivate,
    order,
  };
}

/** Migrate old single-photo profile to gallery format */
export function migrateProfileToGallery(profile: UserProfile): UserProfile {
  if (profile.gallery && profile.gallery.length > 0) return profile;
  const gallery: PhotoItem[] = [];
  if (profile.photoUri) {
    gallery.push(createPhotoItem(profile.photoUri, 0, false));
  }
  return { ...profile, gallery };
}

/** Migrate old profile fields to new Grindr-style fields */
export function migrateProfileFields(profile: any): UserProfile {
  const migrated = { ...DEFAULT_PROFILE, ...profile };
  // Map old fields to new
  if (!migrated.displayName && migrated.name) {
    migrated.displayName = migrated.name;
  }
  if (!migrated.aboutMe && migrated.bio) {
    migrated.aboutMe = migrated.bio;
  }
  if (!migrated.tags && migrated.interests) {
    migrated.tags = migrated.interests;
  }
  // Ensure all new fields exist
  if (!migrated.lookingFor) migrated.lookingFor = [];
  if (!migrated.meetAt) migrated.meetAt = [];
  if (!migrated.socialLinks) migrated.socialLinks = {};
  if (!migrated.tags) migrated.tags = [];
  if (migrated.showAge === undefined) migrated.showAge = true;
  return migrated;
}

// ── Utility Functions ──

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatHeight(cm: number | null): string {
  if (!cm) return "";
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  return `${cm}cm (${feet}'${inches}")`;
}

export function getOnlineStatus(isOnline: boolean, lastSeen: number): "online" | "recent" | "offline" {
  if (isOnline) return "online";
  const minutesAgo = (Date.now() - lastSeen) / (1000 * 60);
  if (minutesAgo < 60) return "recent";
  return "offline";
}

// ── Mock Data (empty for production) ──

export const MOCK_NEARBY_USERS: NearbyUser[] = [];

export const MOCK_CONVERSATIONS: ChatConversation[] = [];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {};

export const MOCK_TAPS: TapItem[] = [];

export const MOCK_PROFILE_VIEWS: ProfileView[] = [];

export const MOCK_FAVORITES: FavoriteUser[] = [];

// ── Tap type helpers ──

export const TAP_TYPES = {
  fire: { emoji: "🔥", label: "Fire", description: "You're hot!" },
  friendly: { emoji: "😊", label: "Friendly", description: "Hey there!" },
  wave: { emoji: "👋", label: "Wave", description: "Hi!" },
} as const;
export type TapType = keyof typeof TAP_TYPES;
