import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { UserProfile, DEFAULT_PROFILE } from "@/lib/mock-data";
import { loadProfile, saveProfile } from "@/lib/storage";
import { UserAvatar } from "@/components/user-avatar";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_GAP = 4;
const PHOTO_COLS = 3;
const PHOTO_PADDING = 20;
const PHOTO_SIZE = (SCREEN_WIDTH - PHOTO_PADDING * 2 - PHOTO_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;

const INTEREST_OPTIONS = [
  "Hiking", "Music", "Art", "Cooking", "Travel", "Photography",
  "Yoga", "Reading", "Coffee", "Film", "Dogs", "Cats",
  "Dancing", "Gaming", "Fitness", "Nature", "Writing", "Tech",
];

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);

  // Reload profile every time this screen comes into focus
  // (e.g. returning from edit-profile after adding photos)
  useFocusEffect(
    useCallback(() => {
      loadProfile().then((p) => {
        setProfile(p);
        setEditName(p.name);
        setEditAge(p.age.toString());
        setEditBio(p.bio);
        setEditInterests([...p.interests]);
      });
    }, [])
  );

  const startEditing = useCallback(() => {
    setEditName(profile.name);
    setEditAge(profile.age.toString());
    setEditBio(profile.bio);
    setEditInterests([...profile.interests]);
    setIsEditing(true);
  }, [profile]);

  const handleSave = useCallback(async () => {
    const age = parseInt(editAge, 10);
    if (!editName.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter your name");
      } else {
        Alert.alert("Missing Name", "Please enter your name");
      }
      return;
    }
    if (isNaN(age) || age < 18 || age > 99) {
      if (Platform.OS === "web") {
        alert("Please enter a valid age (18-99)");
      } else {
        Alert.alert("Invalid Age", "Please enter a valid age (18-99)");
      }
      return;
    }
    const updated: UserProfile = {
      ...profile,
      name: editName.trim(),
      age,
      bio: editBio.trim(),
      interests: editInterests,
    };
    setProfile(updated);
    try {
      await saveProfile(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("[Profile] saveProfile failed:", err);
      if (Platform.OS === "web") {
        alert("Failed to save profile. Please try again.");
      } else {
        Alert.alert("Save Failed", "Could not save your profile. Please try again.");
      }
    }
  }, [editName, editAge, editBio, editInterests, profile]);

  const toggleInterest = (interest: string) => {
    setEditInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Profile</Text>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={isEditing ? handleSave : startEditing}
              style={({ pressed }) => [
                styles.editButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? "Save" : "Edit"}
              </Text>
            </Pressable>
            {!isEditing && (
              <Pressable
                onPress={() => router.push("/settings")}
                style={({ pressed }) => [
                  styles.settingsButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="gearshape.fill" size={20} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Avatar — tappable to go to photo management */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={() => router.push("/edit-profile")}
            style={({ pressed }) => [pressed && { opacity: 0.75 }]}
          >
            <UserAvatar
              userId={profile.id}
              name={profile.displayName || profile.name}
              photoUri={profile.photoUri}
              gallery={profile.gallery}
              size={100}
            />
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarEditBadgeText}>📷</Text>
            </View>
          </Pressable>
          {!isEditing && (profile.displayName || profile.name) ? (
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {profile.displayName || profile.name}, {profile.age}
            </Text>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.formSection}>
            {/* Manage Photos — top of edit form so it's always visible */}
            <Pressable
              onPress={() => router.push("/edit-profile")}
              style={({ pressed }) => [
                styles.managePhotosBtn,
                styles.managePhotosBtnTop,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.managePhotosBtnText, { color: "#fff" }]}>
                📷  Manage Photos
              </Text>
            </Pressable>

            {/* Name */}
            <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
            />

            {/* Age */}
            <Text style={[styles.label, { color: colors.muted }]}>Age</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
              ]}
              value={editAge}
              onChangeText={setEditAge}
              placeholder="Your age"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />

            {/* Bio */}
            <Text style={[styles.label, { color: colors.muted }]}>Bio</Text>
            <TextInput
              style={[
                styles.input,
                styles.bioInput,
                { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
              ]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell others about yourself..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

          {/* Interests */}
            <Text style={[styles.label, { color: colors.muted }]}>Interests</Text>
            <View style={styles.interestsGrid}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = editInterests.includes(interest);
                return (
                  <Pressable
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={({ pressed }) => [
                      styles.interestChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.interestText,
                        { color: selected ? "#fff" : colors.foreground },
                      ]}
                    >
                      {interest}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.displaySection}>
            {/* Manage Photos button — always visible in view mode */}
            <Pressable
              onPress={() => router.push("/edit-profile")}
              style={({ pressed }) => [
                styles.managePhotosBtn,
                styles.managePhotosBtnTop,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.managePhotosBtnText, { color: "#fff" }]}>
                📷  Manage Photos
              </Text>
            </Pressable>

            {/* Photo Grid */}
            {profile.gallery && profile.gallery.length > 0 ? (
              <View style={styles.photoGrid}>
                {profile.gallery.slice(0, 6).map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.uri }}
                    style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                    contentFit="cover"
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardText, { color: colors.muted, textAlign: "center" }]}>
                  Tap &quot;Manage Photos&quot; to add photos
                </Text>
              </View>
            )}

            {/* Bio */}
            {profile.bio ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>About</Text>
                <Text style={[styles.cardText, { color: colors.foreground }]}>{profile.bio}</Text>
              </View>
            ) : null}

            {/* Interests */}
            {profile.interests.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>Interests</Text>
                <View style={styles.interestsGrid}>
                  {profile.interests.map((interest) => (
                    <View
                      key={interest}
                      style={[
                        styles.interestChip,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.interestText, { color: "#fff" }]}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {!profile.name && (
              <View style={styles.setupPrompt}>
                <Text style={[styles.setupText, { color: colors.muted }]}>
                  Tap &quot;Edit&quot; to set up your profile and start connecting!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },
  headerButtons: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatarEditBadge: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarEditBadgeText: {
    fontSize: 13,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PHOTO_GAP,
    marginBottom: 16,
  },
  photoCell: {
    borderRadius: 8,
    overflow: "hidden",
  },
  profileName: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  formSection: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 18,
    opacity: 0.6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
  },
  interestText: {
    fontSize: 14,
    fontWeight: "700",
  },
  displaySection: {
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    opacity: 0.6,
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  setupPrompt: {
    alignItems: "center",
    paddingVertical: 40,
  },
  setupText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  managePhotosBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  managePhotosBtnTop: {
    marginBottom: 20,
    marginTop: 4,
  },
  managePhotosBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  linkAccountBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  linkAccountText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
