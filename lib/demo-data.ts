/**
 * Demo data for Preview mode - realistic profiles, conversations, and taps.
 * Only used when the app is in demo/preview mode (no real server connection).
 */

import type {
  NearbyUser,
  ChatConversation,
  ChatMessage,
  TapItem,
  ProfileView,
  FavoriteUser,
} from "./mock-data";

// ── Demo Avatar URLs (AI-generated, hosted on CDN) ──

const AV = {
  maya: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-1-FX5AgneWdh5YtPgknJWaCm.webp",
  alex: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-2-9veaWBHiQSerMY4Gv7iVAt.webp",
  zara: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-3-4s7QKPEcJEYWLJPbUJLL6x.webp",
  yuki: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-4-8kPDXWF5npxjC7fzTx6Qr7.webp",
  sofia: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-5-Jxf7MS8KVqRetXDEDWHqh9.webp",
  rowan: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-6-KAqbSBAjiHedJjKLsU8b9m.webp",
  noor: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-7-gvmgWfYG4NgarS7LVLQPSv.webp",
  jordan: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-8-L996N4rdkLY6qfsm7uup2b.webp",
  dana: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-9-EfxTiFrUX9Wf8ieefWbE52.webp",
  mei: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-10-DAMWtAG77PjMqDAUQjD5XQ.webp",
  casey: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-11b-KPGrxd3BRRva7wHtxhD2kX.webp",
  priya: "https://d2xsxph8kpxj0f.cloudfront.net/310519663414187707/WzQiwpS9LvFdHCkwfb6ZLL/demo-avatar-12-RWBfbTAys9jNngCNx7zNUA.webp",
};

function gal(url: string) {
  return [{ id: "g" + Math.random().toString(36).slice(2, 6), uri: url, isPrivate: false, order: 0 }];
}

const now = Date.now();
const h = 3600_000;
const m = 60_000;

// ── 12 Demo Nearby Users ──

export const DEMO_NEARBY_USERS: NearbyUser[] = [
  {
    id: "demo-1", displayName: "Maya", age: 26, showAge: true,
    aboutMe: "Coffee lover, bookworm, and aspiring chef. Looking for someone to explore farmers markets with on lazy Sunday mornings.",
    photoUrl: AV.maya, gallery: gal(AV.maya), distance: 120, bearing: 45,
    isOnline: true, lastSeen: now,
    height: 165, bodyType: "Slim", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Community"], meetAt: ["Coffee Shop", "Restaurant"],
    acceptingNSFW: "Maybe Later",
    tags: ["Coffee", "Cooking", "Reading"], socialLinks: { instagram: "@maya.reads" },
    interests: ["Coffee", "Cooking", "Reading"], bio: "", name: "Maya",
    mood: "friends",
  },
  {
    id: "demo-2", displayName: "Alex", age: 28, showAge: true,
    aboutMe: "Photographer by day, DJ by night. Let me take you to the best underground spots in the city.",
    photoUrl: AV.alex, gallery: gal(AV.alex), distance: 350, bearing: 120,
    isOnline: true, lastSeen: now,
    height: 170, bodyType: "Toned", relationshipStatus: "Single",
    genderIdentity: "Non-binary", pronouns: "They/Them",
    lookingFor: ["Hangouts", "Friends"], meetAt: ["Bar", "Coffee Shop"],
    acceptingNSFW: "Maybe Later",
    tags: ["Photography", "Music", "Dancing"], socialLinks: { instagram: "@alex.shoots" },
    interests: ["Photography", "Music", "Dancing"], bio: "", name: "Alex",
    mood: "hangout",
  },
  {
    id: "demo-3", displayName: "Zara", age: 31, showAge: true,
    aboutMe: "Community organizer and plant mom. I have 47 houseplants and counting. Looking for deep conversations and genuine connections.",
    photoUrl: AV.zara, gallery: gal(AV.zara), distance: 800, bearing: 200,
    isOnline: false, lastSeen: now - 25 * m,
    height: 173, bodyType: "Average", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Community", "Friends"], meetAt: ["Coffee Shop", "Restaurant"],
    acceptingNSFW: "No Thanks",
    tags: ["Plants", "Activism", "Cooking"], socialLinks: {},
    interests: ["Plants", "Activism", "Cooking"], bio: "", name: "Zara",
    mood: "friends",
  },
  {
    id: "demo-4", displayName: "Yuki", age: 24, showAge: true,
    aboutMe: "Software engineer who loves anime, board games, and late-night ramen runs. Introvert looking for my fellow introvert.",
    photoUrl: AV.yuki, gallery: gal(AV.yuki), distance: 450, bearing: 90,
    isOnline: true, lastSeen: now,
    height: 158, bodyType: "Slim", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Friends"], meetAt: ["Coffee Shop", "Restaurant"],
    acceptingNSFW: "Maybe Later",
    tags: ["Gaming", "Tech", "Cooking"], socialLinks: {},
    interests: ["Gaming", "Tech", "Cooking"], bio: "", name: "Yuki",
    mood: "vibing",
  },
  {
    id: "demo-5", displayName: "Sofia", age: 29, showAge: true,
    aboutMe: "Marine biologist who loves the ocean as much as she loves a good sunset. Weekend surfer, weekday scientist.",
    photoUrl: AV.sofia, gallery: gal(AV.sofia), distance: 1200, bearing: 270,
    isOnline: false, lastSeen: now - 2 * h,
    height: 168, bodyType: "Toned", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Community"], meetAt: ["Coffee Shop", "Bar"],
    acceptingNSFW: "Maybe Later",
    tags: ["Surfing", "Nature", "Travel"], socialLinks: { instagram: "@sofia.ocean" },
    interests: ["Surfing", "Nature", "Travel"], bio: "", name: "Sofia",
    mood: "hangout",
  },
  {
    id: "demo-6", displayName: "Rowan", age: 32, showAge: true,
    aboutMe: "Outdoor enthusiast and trail runner. I can identify most wildflowers and I make a mean campfire breakfast.",
    photoUrl: AV.rowan, gallery: gal(AV.rowan), distance: 2100, bearing: 315,
    isOnline: false, lastSeen: now - 5 * h,
    height: 175, bodyType: "Toned", relationshipStatus: "Single",
    genderIdentity: "Man", pronouns: "He/Him",
    lookingFor: ["Community"], meetAt: ["Coffee Shop"],
    acceptingNSFW: "No Thanks",
    tags: ["Hiking", "Running", "Camping"], socialLinks: {},
    interests: ["Hiking", "Running", "Camping"], bio: "", name: "Rowan",
    mood: null,
  },
  {
    id: "demo-7", displayName: "Noor", age: 25, showAge: true,
    aboutMe: "Fashion design student with a love for vintage finds and rooftop parties. Life is too short for boring outfits.",
    photoUrl: AV.noor, gallery: gal(AV.noor), distance: 600, bearing: 160,
    isOnline: true, lastSeen: now,
    height: 163, bodyType: "Slim", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Friends", "Gaming Partners"], meetAt: ["Bar", "Coffee Shop"],
    acceptingNSFW: "Maybe Later",
    tags: ["Fashion", "Art", "Dancing"], socialLinks: { instagram: "@noor.style" },
    interests: ["Fashion", "Art", "Dancing"], bio: "", name: "Noor",
    mood: "games",
  },
  {
    id: "demo-8", displayName: "Jordan", age: 27, showAge: true,
    aboutMe: "Visual artist and gallery curator. I spend my weekends painting and my weeknights at open mic nights.",
    photoUrl: AV.jordan, gallery: gal(AV.jordan), distance: 900, bearing: 30,
    isOnline: false, lastSeen: now - 40 * m,
    height: 170, bodyType: "Average", relationshipStatus: "Single",
    genderIdentity: "Non-binary", pronouns: "They/Them",
    lookingFor: ["Hangouts", "Friends"], meetAt: ["Bar", "Coffee Shop"],
    acceptingNSFW: "Maybe Later",
    tags: ["Art", "Music", "Poetry"], socialLinks: {},
    interests: ["Art", "Music", "Poetry"], bio: "", name: "Jordan",
    mood: "buddy",
  },
  {
    id: "demo-9", displayName: "Dana", age: 30, showAge: true,
    aboutMe: "Personal trainer and wellness coach. I believe in balance - gym in the morning, wine in the evening.",
    photoUrl: AV.dana, gallery: gal(AV.dana), distance: 300, bearing: 180,
    isOnline: true, lastSeen: now,
    height: 172, bodyType: "Muscular", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Community"], meetAt: ["Coffee Shop", "Restaurant"],
    acceptingNSFW: "Maybe Later",
    tags: ["Fitness", "Yoga", "Cooking"], socialLinks: { instagram: "@dana.fit" },
    interests: ["Fitness", "Yoga", "Cooking"], bio: "", name: "Dana",
    mood: "hangout",
  },
  {
    id: "demo-10", displayName: "Mei", age: 23, showAge: true,
    aboutMe: "Botany student who talks to her plants. I make my own kombucha and I am not sorry about it.",
    photoUrl: AV.mei, gallery: gal(AV.mei), distance: 700, bearing: 240,
    isOnline: false, lastSeen: now - 1 * h,
    height: 160, bodyType: "Slim", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Hangouts", "Friends"], meetAt: ["Coffee Shop"],
    acceptingNSFW: "No Thanks",
    tags: ["Plants", "Nature", "Cooking"], socialLinks: {},
    interests: ["Plants", "Nature", "Cooking"], bio: "", name: "Mei",
    mood: "buddy",
  },
  {
    id: "demo-11", displayName: "Casey", age: 22, showAge: true,
    aboutMe: "Music nerd and vinyl collector. I will judge you by your record collection (gently). Let us go to a show together.",
    photoUrl: AV.casey, gallery: gal(AV.casey), distance: 500, bearing: 100,
    isOnline: true, lastSeen: now,
    height: 167, bodyType: "Average", relationshipStatus: "Single",
    genderIdentity: "Trans Man", pronouns: "He/Him",
    lookingFor: ["Hangouts", "Friends"], meetAt: ["Bar", "Coffee Shop"],
    acceptingNSFW: "Maybe Later",
    tags: ["Music", "Art", "Coffee"], socialLinks: { spotify: "casey_vinyl" },
    interests: ["Music", "Art", "Coffee"], bio: "", name: "Casey",
    mood: "vibing",
  },
  {
    id: "demo-12", displayName: "Priya", age: 28, showAge: true,
    aboutMe: "Writer and tea enthusiast. Currently working on my first novel. I love deep conversations and cozy evenings.",
    photoUrl: AV.priya, gallery: gal(AV.priya), distance: 1500, bearing: 60,
    isOnline: false, lastSeen: now - 3 * h,
    height: 162, bodyType: "Average", relationshipStatus: "Single",
    genderIdentity: "Woman", pronouns: "She/Her",
    lookingFor: ["Community", "Friends"], meetAt: ["Coffee Shop", "Restaurant"],
    acceptingNSFW: "No Thanks",
    tags: ["Writing", "Reading", "Coffee"], socialLinks: { instagram: "@priya.writes" },
    interests: ["Writing", "Reading", "Coffee"], bio: "", name: "Priya",
    mood: "friends",
  },
];

// ── Demo Conversations (3 active chats) ──

export const DEMO_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv-1", userId: "demo-1", userName: "Maya", userPhoto: AV.maya,
    lastMessage: "That sounds amazing! Which farmers market?",
    lastMessageTime: now - 12 * m, unreadCount: 2, lastMessageType: "text",
  },
  {
    id: "conv-2", userId: "demo-9", userName: "Dana", userPhoto: AV.dana,
    lastMessage: "See you at 7! Looking forward to it",
    lastMessageTime: now - 2 * h, unreadCount: 0, lastMessageType: "text",
  },
  {
    id: "conv-3", userId: "demo-7", userName: "Noor", userPhoto: AV.noor,
    lastMessage: "Have you been to that new gallery on 5th?",
    lastMessageTime: now - 8 * h, unreadCount: 1, lastMessageType: "text",
  },
];

export const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  "conv-1": [
    { id: "m1", senderId: "me", text: "Hey Maya! Love your profile. Are you into the local food scene?", timestamp: now - 2 * h, type: "text" },
    { id: "m2", senderId: "demo-1", text: "Yes! I go to the farmers market almost every weekend", timestamp: now - 1.5 * h, type: "text" },
    { id: "m3", senderId: "me", text: "Same here! We should go together sometime", timestamp: now - 1 * h, type: "text" },
    { id: "m4", senderId: "demo-1", text: "That sounds amazing! Which farmers market?", timestamp: now - 12 * m, type: "text" },
  ],
  "conv-2": [
    { id: "m5", senderId: "demo-9", text: "Hey! I saw you are into yoga too", timestamp: now - 6 * h, type: "text" },
    { id: "m6", senderId: "me", text: "Yes! I have been practicing for about 2 years now", timestamp: now - 5 * h, type: "text" },
    { id: "m7", senderId: "demo-9", text: "Nice! Want to try that new studio downtown?", timestamp: now - 4 * h, type: "text" },
    { id: "m8", senderId: "me", text: "Absolutely! When are you free?", timestamp: now - 3 * h, type: "text" },
    { id: "m9", senderId: "demo-9", text: "See you at 7! Looking forward to it", timestamp: now - 2 * h, type: "text" },
  ],
  "conv-3": [
    { id: "m10", senderId: "demo-7", text: "Love your style! Where do you shop?", timestamp: now - 24 * h, type: "text" },
    { id: "m11", senderId: "me", text: "Mostly vintage stores and online. You?", timestamp: now - 20 * h, type: "text" },
    { id: "m12", senderId: "demo-7", text: "Same! We should go thrifting together", timestamp: now - 16 * h, type: "text" },
    { id: "m13", senderId: "demo-7", text: "Have you been to that new gallery on 5th?", timestamp: now - 8 * h, type: "text" },
  ],
};

// ── Demo Taps (6 received taps) ──

export const DEMO_TAPS: TapItem[] = [
  { id: "tap-1", senderId: "demo-2", senderName: "Alex", senderPhoto: AV.alex, type: "fire", createdAt: now - 30 * m, isRead: false },
  { id: "tap-2", senderId: "demo-5", senderName: "Sofia", senderPhoto: AV.sofia, type: "wave", createdAt: now - 2 * h, isRead: false },
  { id: "tap-3", senderId: "demo-11", senderName: "Casey", senderPhoto: AV.casey, type: "friendly", createdAt: now - 4 * h, isRead: true },
  { id: "tap-4", senderId: "demo-8", senderName: "Jordan", senderPhoto: AV.jordan, type: "fire", createdAt: now - 8 * h, isRead: true },
  { id: "tap-5", senderId: "demo-10", senderName: "Mei", senderPhoto: AV.mei, type: "wave", createdAt: now - 12 * h, isRead: true },
  { id: "tap-6", senderId: "demo-12", senderName: "Priya", senderPhoto: AV.priya, type: "friendly", createdAt: now - 24 * h, isRead: true },
];

// ── Demo Profile Views (8 viewers) ──

export const DEMO_VIEWS: ProfileView[] = [
  { id: "v-1", viewerId: "demo-2", viewerName: "Alex", viewerPhoto: AV.alex, viewerAge: 28, viewerDistance: 350, viewedAt: now - 15 * m },
  { id: "v-2", viewerId: "demo-5", viewerName: "Sofia", viewerPhoto: AV.sofia, viewerAge: 29, viewerDistance: 1200, viewedAt: now - 1 * h },
  { id: "v-3", viewerId: "demo-3", viewerName: "Zara", viewerPhoto: AV.zara, viewerAge: 31, viewerDistance: 800, viewedAt: now - 3 * h },
  { id: "v-4", viewerId: "demo-6", viewerName: "Rowan", viewerPhoto: AV.rowan, viewerAge: 32, viewerDistance: 2100, viewedAt: now - 5 * h },
  { id: "v-5", viewerId: "demo-11", viewerName: "Casey", viewerPhoto: AV.casey, viewerAge: 22, viewerDistance: 500, viewedAt: now - 8 * h },
  { id: "v-6", viewerId: "demo-4", viewerName: "Yuki", viewerPhoto: AV.yuki, viewerAge: 24, viewerDistance: 450, viewedAt: now - 12 * h },
  { id: "v-7", viewerId: "demo-12", viewerName: "Priya", viewerPhoto: AV.priya, viewerAge: 28, viewerDistance: 1500, viewedAt: now - 18 * h },
  { id: "v-8", viewerId: "demo-8", viewerName: "Jordan", viewerPhoto: AV.jordan, viewerAge: 27, viewerDistance: 900, viewedAt: now - 24 * h },
];

// ── Demo Favorites ──

export const DEMO_FAVORITES: FavoriteUser[] = [
  { id: "fav-1", userId: "demo-1", userName: "Maya", userPhoto: AV.maya, userAge: 26, userDistance: 120, isOnline: true, addedAt: now - 2 * h },
  { id: "fav-2", userId: "demo-9", userName: "Dana", userPhoto: AV.dana, userAge: 30, userDistance: 300, isOnline: true, addedAt: now - 12 * h },
];

// ── Helper: check if demo mode is active ──

export function isDemoMode(): boolean {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("demo_mode") === "true";
  }
  return false;
}
