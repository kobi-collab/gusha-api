import { useState, useEffect, useCallback } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  UserProfile,
  DEFAULT_PROFILE,
  PhotoItem,
  createPhotoItem,
  getPrimaryPhoto,
  BODY_TYPES,
  RELATIONSHIP_STATUSES,
  GENDER_IDENTITIES,
  PRONOUNS_OPTIONS,
  LOOKING_FOR_OPTIONS,
  MEET_AT_OPTIONS,
  NSFW_PREFS,
  ALL_TAGS,
  BodyType,
  RelationshipStatus,
  GenderIdentity,
  PronounsOption,
  LookingForOption,
  MeetAtOption,
  NSFWPref,
} from "@/lib/mock-data";
import { loadProfile, saveProfile } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GALLERY_PADDING = 16;
const GALLERY_GAP = 6;
const MAX_PHOTOS = 6;
const COLS = 3;
const SLOT_SIZE = (SCREEN_WIDTH - GALLERY_PADDING * 2 - GALLERY_GAP * (COLS - 1)) / COLS;

// Collapsible section component
function Section({
  title,
  icon,
  children,
  colors,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.sectionHeaderLeft}>
          <IconSymbol name={icon} size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {title}
          </Text>
        </View>
        <IconSymbol
          name="chevron.right"
          size={18}
          color={colors.muted}
          style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
        />
      </Pressable>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

// Multi-select chip group
function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
  colors,
  max,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (val: T) => void;
  colors: any;
  max?: number;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        const disabled = !isSelected && max !== undefined && selected.length >= max;
        return (
          <Pressable
            key={opt}
            onPress={() => !disabled && onToggle(opt)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
                opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? "#fff" : colors.foreground },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Single-select chip group
function SingleChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: readonly T[];
  selected: T | null;
  onSelect: (val: T | null) => void;
  colors: any;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(isSelected ? null : opt)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? "#fff" : colors.foreground },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function EditProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [age, setAge] = useState("");
  const [showAge, setShowAge] = useState(true);
  const [height, setHeight] = useState("");
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | null>(null);
  const [pronouns, setPronouns] = useState<PronounsOption | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingForOption[]>([]);
  const [meetAt, setMeetAt] = useState<MeetAtOption[]>([]);
  const [acceptingNSFW, setAcceptingNSFW] = useState<NSFWPref | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [spotify, setSpotify] = useState("");

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setDisplayName(p.displayName || p.name || "");
      setAboutMe(p.aboutMe || p.bio || "");
      setAge(p.age?.toString() || "25");
      setShowAge(p.showAge ?? true);
      setHeight(p.height?.toString() || "");
      setBodyType(p.bodyType || null);
      setRelationshipStatus(p.relationshipStatus || null);
      setGenderIdentity(p.genderIdentity || null);
      setPronouns(p.pronouns || null);
      setLookingFor(p.lookingFor || []);
      setMeetAt(p.meetAt || []);
      setAcceptingNSFW(p.acceptingNSFW || null);
      setTags(p.tags || p.interests || []);
      setInstagram(p.socialLinks?.instagram || "");
      setSpotify(p.socialLinks?.spotify || "");
      setLoaded(true);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const ageNum = parseInt(age, 10);
    if (!displayName.trim()) {
      const msg = "Please enter a display name";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Missing Name", msg);
      return;
    }
    if (displayName.trim().length > 15) {
      const msg = "Display name must be 15 characters or less";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Name Too Long", msg);
      return;
    }
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      const msg = "Please enter a valid age (18-99)";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Invalid Age", msg);
      return;
    }

    const heightNum = height ? parseInt(height, 10) : null;
    if (heightNum !== null && (heightNum < 100 || heightNum > 250)) {
      const msg = "Please enter a valid height (100-250 cm)";
      Platform.OS === "web" ? alert(msg) : Alert.alert("Invalid Height", msg);
      return;
    }

    const updated: UserProfile = {
      ...profile,
      displayName: displayName.trim(),
      name: displayName.trim(),
      age: ageNum,
      showAge,
      aboutMe: aboutMe.trim(),
      bio: aboutMe.trim(),
      height: heightNum,
      bodyType,
      relationshipStatus,
      genderIdentity,
      pronouns,
      lookingFor,
      meetAt,
      acceptingNSFW,
      tags,
      interests: tags,
      socialLinks: {
        instagram: instagram.trim() || undefined,
        spotify: spotify.trim() || undefined,
      },
    };
    await saveProfile(updated);
    router.back();
  }, [
    profile, displayName, aboutMe, age, showAge, height, bodyType,
    relationshipStatus, genderIdentity, pronouns, lookingFor, meetAt,
    acceptingNSFW, tags, instagram, spotify, router,
  ]);

  const pickImageForSlot = useCallback(
    async (slotIndex: number) => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const gallery = [...(profile.gallery || [])];
        const existingIdx = gallery.findIndex((p) => p.order === slotIndex);
        if (existingIdx >= 0) {
          gallery[existingIdx] = { ...gallery[existingIdx], uri };
        } else {
          gallery.push(createPhotoItem(uri, slotIndex, false));
        }
        const primaryUri = getPrimaryPhoto(gallery) || uri;
        const updated = { ...profile, gallery, photoUri: primaryUri };
        setProfile(updated);
        await saveProfile(updated);
      }
    },
    [profile]
  );

  const togglePhotoPrivacy = useCallback(
    async (photoId: string) => {
      const gallery = (profile.gallery || []).map((p) =>
        p.id === photoId ? { ...p, isPrivate: !p.isPrivate } : p
      );
      const primaryUri = getPrimaryPhoto(gallery);
      const updated = { ...profile, gallery, photoUri: primaryUri };
      setProfile(updated);
      await saveProfile(updated);
    },
    [profile]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      const gallery = (profile.gallery || []).filter((p) => p.id !== photoId);
      const primaryUri = getPrimaryPhoto(gallery);
      const updated = { ...profile, gallery, photoUri: primaryUri };
      setProfile(updated);
      await saveProfile(updated);
    },
    [profile]
  );

  const toggleMulti = <T extends string>(
    arr: T[],
    val: T,
    setter: (v: T[]) => void
  ) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const sortedGallery = [...(profile.gallery || [])].sort((a, b) => a.order - b.order);

  if (!loaded) return null;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Edit Profile
        </Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photos Section */}
        <Section title="Photos" icon="photo.fill" colors={colors}>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Add up to {MAX_PHOTOS} photos. Tap to add, long-press for options.
          </Text>
          <View style={styles.photoGrid}>
            {Array.from({ length: MAX_PHOTOS }).map((_, idx) => {
              const photo = sortedGallery.find((p) => p.order === idx);
              const hasPhoto = photo && photo.uri;
              return (
                <View key={idx} style={{ width: SLOT_SIZE, height: SLOT_SIZE, position: "relative" }}>
                  <Pressable
                    onPress={() => pickImageForSlot(idx)}
                    style={({ pressed }) => [
                      styles.photoSlot,
                      {
                        width: SLOT_SIZE,
                        height: SLOT_SIZE,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {hasPhoto ? (
                      <Image
                        source={{ uri: photo.uri }}
                        style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: 10 }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.emptySlot}>
                        <IconSymbol name="plus" size={24} color={colors.muted} />
                        <Text style={[styles.slotLabel, { color: colors.muted }]}>
                          {idx === 0 ? "Main" : `${idx + 1}`}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  {hasPhoto && (
                    <View style={styles.photoActions}>
                      <Pressable
                        onPress={() => togglePhotoPrivacy(photo.id)}
                        style={({ pressed }) => [
                          styles.photoActionBtn,
                          {
                            backgroundColor: photo.isPrivate
                              ? "rgba(239,68,68,0.9)"
                              : "rgba(0,0,0,0.5)",
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol
                          name={photo.isPrivate ? "lock.fill" : "eye.fill"}
                          size={12}
                          color="#fff"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => removePhoto(photo.id)}
                        style={({ pressed }) => [
                          styles.photoActionBtn,
                          { backgroundColor: "rgba(0,0,0,0.5)" },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <IconSymbol name="xmark" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Section>

        {/* Basics Section */}
        <Section title="Basics" icon="person.fill" colors={colors}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            Display Name ({displayName.length}/15)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            value={displayName}
            onChangeText={(t) => setDisplayName(t.slice(0, 15))}
            placeholder="Your display name"
            placeholderTextColor={colors.muted}
            maxLength={15}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
            About Me ({aboutMe.length}/225)
          </Text>
          <TextInput
            style={[styles.input, styles.bioInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            value={aboutMe}
            onChangeText={(t) => setAboutMe(t.slice(0, 225))}
            placeholder="Tell others about yourself..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={225}
          />
        </Section>

        {/* Stats Section */}
        <Section title="Stats" icon="ruler.fill" colors={colors}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Age</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.halfField}>
              <View style={styles.toggleRow}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Show Age</Text>
                <Pressable
                  onPress={() => setShowAge(!showAge)}
                  style={({ pressed }) => [
                    styles.toggle,
                    { backgroundColor: showAge ? colors.primary : colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.toggleDot, showAge && styles.toggleDotActive]} />
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
            Height (cm)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 165"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>Body Type</Text>
          <SingleChipGroup
            options={BODY_TYPES}
            selected={bodyType}
            onSelect={setBodyType}
            colors={colors}
          />

        </Section>

        {/* Identity Section */}
        <Section title="Identity" icon="person.2.fill" colors={colors}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Gender Identity</Text>
          <SingleChipGroup
            options={GENDER_IDENTITIES}
            selected={genderIdentity}
            onSelect={setGenderIdentity}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>Pronouns</Text>
          <SingleChipGroup
            options={PRONOUNS_OPTIONS}
            selected={pronouns}
            onSelect={setPronouns}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>Relationship Status</Text>
          <SingleChipGroup
            options={RELATIONSHIP_STATUSES}
            selected={relationshipStatus}
            onSelect={setRelationshipStatus}
            colors={colors}
          />
        </Section>

        {/* Preferences Section */}
        <Section title="Interests" icon="person.2.fill" colors={colors}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Looking For</Text>
          <ChipGroup
            options={LOOKING_FOR_OPTIONS}
            selected={lookingFor}
            onToggle={(v) => toggleMulti(lookingFor, v, setLookingFor)}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>Hang Out At</Text>
          <ChipGroup
            options={MEET_AT_OPTIONS}
            selected={meetAt}
            onToggle={(v) => toggleMulti(meetAt, v, setMeetAt)}
            colors={colors}
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>
            Photo Sharing Comfort
          </Text>
          <SingleChipGroup
            options={NSFW_PREFS}
            selected={acceptingNSFW}
            onSelect={setAcceptingNSFW}
            colors={colors}
          />
        </Section>

        {/* Tags Section */}
        <Section title="Tags" icon="tag.fill" colors={colors}>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Select up to 10 tags ({tags.length}/10)
          </Text>
          <ChipGroup
            options={ALL_TAGS}
            selected={tags}
            onToggle={(v) => toggleMulti(tags, v, setTags)}
            colors={colors}
            max={10}
          />
        </Section>

        {/* Social Links Section */}
        <Section title="Social Links" icon="link" colors={colors}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Instagram</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />

          <Text style={[styles.fieldLabel, { color: colors.muted, marginTop: 16 }]}>Spotify</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            value={spotify}
            onChangeText={setSpotify}
            placeholder="Spotify profile link"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    borderBottomWidth: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleDotActive: {
    alignSelf: "flex-end",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GALLERY_GAP,
  },
  photoSlot: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlot: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  photoActions: {
    position: "absolute",
    top: 4,
    right: 4,
    flexDirection: "row",
    gap: 3,
  },
  photoActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
