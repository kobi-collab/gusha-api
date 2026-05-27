# Gusha - App Interface Design

## Overview

**Gusha** is a location-based dating app designed for the lesbian community. Its signature feature is a **radar-style circular discovery view** where the current user is at the center and nearby users appear as avatars positioned by their real distance and compass direction. The design follows Apple Human Interface Guidelines for a native iOS feel.

---

## Screen List

| Screen | Purpose |
|--------|---------|
| **Radar (Home)** | Main discovery screen with circular radar view showing nearby users |
| **Profile Detail** | View another user's full profile when tapped on radar |
| **My Profile** | View and edit your own profile |
| **Chat List** | List of active conversations |
| **Chat Room** | Individual messaging conversation |
| **Settings** | App preferences and account settings |

---

## Color Choices

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#D946A8` | `#E879C0` | Main brand accent — warm magenta/pink |
| `background` | `#FAFAFF` | `#121218` | Screen backgrounds |
| `surface` | `#F0EFF5` | `#1C1C24` | Cards, elevated surfaces |
| `foreground` | `#1A1A2E` | `#EEEEF2` | Primary text |
| `muted` | `#7E7E8F` | `#9898A8` | Secondary text |
| `border` | `#E0DFE8` | `#2E2E3E` | Borders and dividers |
| `success` | `#22C55E` | `#4ADE80` | Online status, success |
| `warning` | `#F59E0B` | `#FBBF24` | Warning states |
| `error` | `#EF4444` | `#F87171` | Error states |
| `radar` | `#D946A8` | `#E879C0` | Radar rings and sweep animation |

---

## Primary Content and Functionality

### Radar Screen (Home Tab)
- **Circular radar view** fills most of the screen
- Current user avatar at the exact center
- Concentric distance rings (e.g., 500m, 1km, 2km, 5km)
- Other users shown as circular avatar thumbnails positioned by distance (radial) and compass direction (angular)
- Subtle radar sweep animation (rotating line from center)
- Tap on a user avatar to open their profile detail
- Distance labels on each ring
- Pull-to-refresh to update nearby users
- Filter button (top-right) for age range / distance range

### Profile Detail (Modal Sheet)
- Large profile photo at top
- Name, age, short bio
- Distance indicator ("850m away")
- Interest tags / labels
- "Send Message" button (primary action)
- "Like" heart button

### My Profile (Tab)
- Profile photo with edit overlay
- Display name, age, bio fields (editable)
- Interest tags (add/remove)
- Profile photo picker from device gallery

### Chat List (Tab)
- List of conversations sorted by most recent
- Each row: avatar, name, last message preview, timestamp
- Unread message badge
- Tap to open chat room

### Chat Room
- Message bubbles (sent = primary color, received = surface color)
- Text input bar at bottom with send button
- Timestamps on messages
- Back navigation to chat list

### Settings
- Profile visibility toggle
- Distance unit preference (km / miles)
- Max discovery distance slider
- Dark mode toggle
- About / Terms
- Logout

---

## Key User Flows

### Discovery Flow
1. User opens app → Radar screen loads
2. App requests location permission (if not granted)
3. Radar populates with nearby users as avatars on concentric rings
4. User taps an avatar → Profile Detail sheet slides up
5. User taps "Send Message" → Chat Room opens

### Profile Setup Flow
1. User navigates to My Profile tab
2. Taps profile photo → Image picker opens
3. Fills in name, age, bio
4. Adds interest tags
5. Saves profile → Returns to radar

### Messaging Flow
1. User taps Chat tab → Chat List screen
2. Taps a conversation → Chat Room opens
3. Types message → Sends
4. Receives messages in real-time display

---

## Layout Specifications (Mobile Portrait 9:16)

### Radar Screen Layout
- **Status bar area**: System status bar (handled by SafeArea)
- **Header**: "Gusha" title (left), filter icon (right) — 44pt height
- **Radar area**: Fills remaining space, centered circle
  - Circle diameter: ~90% of screen width
  - 4 concentric rings at 25%, 50%, 75%, 100% of radius
  - Center: current user avatar (48x48)
  - Other users: 40x40 circular avatars
- **Tab bar**: Bottom navigation

### Tab Bar
- 3 tabs: Radar (home icon), Chat (message icon), Profile (person icon)
- Active tab uses primary color
- Standard iOS tab bar height

---

## Data Model (Local with AsyncStorage)

Since this is a local demo app, we use **mock/simulated data** for nearby users and **AsyncStorage** for the user's own profile. The radar positions are calculated from simulated coordinates.

### UserProfile (own profile - stored locally)
```
{
  id: string,
  name: string,
  age: number,
  bio: string,
  photoUri: string | null,
  interests: string[],
  isVisible: boolean,
  maxDistance: number (km),
}
```

### NearbyUser (simulated)
```
{
  id: string,
  name: string,
  age: number,
  bio: string,
  photoUrl: string,
  distance: number (meters),
  bearing: number (degrees from north),
  isOnline: boolean,
  interests: string[],
}
```

### ChatMessage (stored locally)
```
{
  id: string,
  senderId: string,
  receiverId: string,
  text: string,
  timestamp: number,
}
```
