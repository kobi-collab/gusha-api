// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  "house.fill": "home",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "arrow.left": "arrow-back",
  // Tabs
  "location.circle.fill": "my-location",
  "message.fill": "chat-bubble",
  "person.fill": "person",
  "hand.tap.fill": "touch-app",
  // Actions
  "paperplane.fill": "send",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "xmark": "close",
  "plus": "add",
  "trash.fill": "delete",
  // Settings / UI
  "gearshape.fill": "settings",
  "slider.horizontal.3": "tune",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  // Grid / Radar toggle
  "square.grid.3x3.fill": "grid-view",
  "scope": "radar",
  // Chat features
  "photo.on.rectangle": "photo-library",
  "timer": "timer",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  // Profile fields
  "ruler.fill": "straighten",
  "figure.stand": "accessibility",
  "person.2.fill": "people",
  "tag.fill": "label",
  "link": "link",
  // Taps
  "flame.fill": "local-fire-department",
  "hand.wave.fill": "waving-hand",
  "face.smiling.fill": "sentiment-satisfied",
  // Viewed Me
  "eye.circle.fill": "remove-red-eye",
  // Favorites
  "star.fill": "star",
  "star": "star-border",
  // Safety
  "exclamationmark.shield.fill": "report",
  "nosign": "block",
  // Subscription
  "crown.fill": "workspace-premium",
  "bolt.fill": "bolt",
  // Explore
  "globe": "public",
  "airplane": "flight",
  // Incognito
  "person.fill.questionmark": "person-off",
  // Boost
  "flame.circle.fill": "rocket-launch",
  // Misc
  "magnifyingglass": "search",
  "ellipsis": "more-horiz",
  "arrow.up.right": "open-in-new",
  "map.fill": "map",
  "location.fill": "location-on",
  "bell.fill": "notifications",
  "pencil": "edit",
  "person.badge.shield.checkmark.fill": "verified-user",
  "doc.text.fill": "description",
  "shield.fill": "shield",
  "exclamationmark.triangle.fill": "warning",
  "person.crop.circle.badge.xmark": "person-remove",
  // Games
  "gamecontroller.fill": "sports-esports",
  "dice.fill": "casino",
  "questionmark.circle.fill": "help",
  "square.grid.2x2.fill": "grid-on",
  "trophy.fill": "emoji-events",
  "play.fill": "play-arrow",
  "arrow.counterclockwise": "replay",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
