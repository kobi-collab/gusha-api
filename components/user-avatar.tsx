import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import {
  getAvatarColor,
  PhotoItem,
  getPrimaryPhoto,
  getPrivatePhotoCount,
} from "@/lib/mock-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface UserAvatarProps {
  userId: string;
  name: string;
  /** Direct photo URI (backward compat) */
  photoUri?: string | null;
  /** Full gallery – if provided, primary photo is derived from here */
  gallery?: PhotoItem[];
  size: number;
  isOnline?: boolean;
  onlineColor?: string;
  /** Show lock badge with private photo count */
  showPrivateIndicator?: boolean;
}

export function UserAvatar({
  userId,
  name,
  photoUri,
  gallery,
  size,
  isOnline,
  onlineColor = "#22C55E",
  showPrivateIndicator = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const avatarColor = getAvatarColor(userId);
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";
  const borderW = isOnline ? Math.max(2, size * 0.05) : 0;

  // Gallery takes priority; if gallery is empty or all-private, fall back to photoUri
  const resolvedPhoto = (gallery ? getPrimaryPhoto(gallery) : null) ?? photoUri ?? null;
  const privateCount = gallery ? getPrivatePhotoCount(gallery) : 0;

  const showImage = !!resolvedPhoto && !imgError;

  return (
    <View style={{ position: "relative" }}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isOnline ? onlineColor : "transparent",
            borderWidth: borderW,
            overflow: "hidden",
          },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri: resolvedPhoto! }}
            style={{ width: size, height: size }}
            contentFit="cover"
            transition={200}
            onError={() => setImgError(true)}
          />
        ) : (
          <View
            style={[
              styles.initialsContainer,
              { backgroundColor: avatarColor, width: size, height: size },
            ]}
          >
            <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
              {initials}
            </Text>
          </View>
        )}
      </View>

      {/* Private photos indicator */}
      {showPrivateIndicator && privateCount > 0 && (
        <View style={[styles.privateBadge, { bottom: -2, right: -2 }]}>
          <IconSymbol name="lock.fill" size={10} color="#fff" />
          <Text style={styles.privateBadgeText}>{privateCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "700",
  },
  privateBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privateBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
