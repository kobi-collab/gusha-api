import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Text, View, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet, Modal,
  Alert, Dimensions, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as ImagePicker from "expo-image-picker";
import { ChatMessage, formatTime } from "@/lib/mock-data";
import { DEMO_MESSAGES, DEMO_CONVERSATIONS } from "@/lib/demo-data";
import { useWebSocket, sendTyping, sendStopTyping, type WsMessage } from "@/hooks/use-websocket";
import { useUserOnlineStatus, formatLastSeen } from "@/hooks/use-online-status";
import { isExplicitDemoMode } from "@/lib/app-mode";

function isDemoMode(userLoginMethod?: string | null): boolean {
  return isExplicitDemoMode(userLoginMethod);
}

const SCREEN_WIDTH = Dimensions.get("window").width;

interface ServerMessage {
  id: number;
  senderId: number;
  receiverId: number;
  type: "text" | "photo" | "expiring_photo";
  text: string | null;
  photoUrl: string | null;
  isRead: string;
  isUnsent: string;
  isExpired: string;
  createdAt: string;
}

function serverToLocal(msg: ServerMessage, myId: number): ChatMessage {
  return {
    id: String(msg.id),
    senderId: msg.senderId === myId ? "me" : String(msg.senderId),
    text: msg.text || "",
    timestamp: new Date(msg.createdAt).getTime(),
    type: msg.type || "text",
    photoUri: msg.photoUrl || undefined,
    isRead: msg.isRead === "true",
    isUnsent: msg.isUnsent === "true",
    isExpired: msg.isExpired === "true",
  };
}

function MessageBubble(props: {
  message: ChatMessage;
  isMe: boolean;
  colors: any;
  onLongPress: () => void;
  onPhotoPress?: () => void;
}) {
  const { message, isMe, colors, onLongPress, onPhotoPress } = props;

  if (message.isUnsent) {
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, styles.unsentBubble, { backgroundColor: colors.surface }]}>
          <Text style={[styles.unsentText, { color: colors.muted }]}>Message unsent</Text>
        </View>
      </View>
    );
  }

  const isPhoto = message.type === "photo" || message.type === "expiring_photo";
  const isExpired = message.type === "expiring_photo" && message.isExpired;

  const renderContent = () => {
    if (!isPhoto) {
      return (
        <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
          {message.text}
        </Text>
      );
    }
    if (isExpired) {
      return (
        <View style={[styles.expiredPhoto, { backgroundColor: colors.surface }]}>
          <IconSymbol name="timer" size={24} color={colors.muted} />
          <Text style={[styles.expiredText, { color: colors.muted }]}>Photo expired</Text>
        </View>
      );
    }
    if (message.photoUri) {
      return (
        <Pressable onPress={onPhotoPress}>
          <Image source={{ uri: message.photoUri }} style={styles.photoImage} contentFit="cover" transition={200} />
          {message.type === "expiring_photo" && (
            <View style={styles.expiringBadge}>
              <IconSymbol name="timer" size={14} color="#fff" />
              <Text style={styles.expiringText}>Expiring</Text>
            </View>
          )}
        </Pressable>
      );
    }
    return null;
  };

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
      <Pressable
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.bubble,
          isMe ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                : [styles.bubbleOther, { backgroundColor: colors.surface }],
          isPhoto && styles.photoBubble,
          pressed && { opacity: 0.9 },
        ]}
      >
        {renderContent()}
        <View style={styles.bubbleFooter}>
          <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.7)" : colors.muted }]}>
            {formatTime(message.timestamp)}
          </Text>
          {isMe && message.isRead && (
            <IconSymbol name="checkmark.circle.fill" size={14} color={isMe ? "rgba(255,255,255,0.7)" : colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

export default function ChatRoomScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { conversationId, userName, userId } = useLocalSearchParams<{
    conversationId: string;
    userName: string;
    userId: string;
  }>();

  // Match chat.tsx / explore.tsx demo detection so registered-but-not-OAuth'd
  // users on iOS still see the sample conversation history they came from.
  const demo = isDemoMode(user?.loginMethod);
  const partnerId = parseInt(userId || conversationId || "0", 10);
  const myId = user?.id || 0;

  // In demo mode, resolve messages from static demo data keyed by conversationId/userId
  const demoMessages = useMemo<ChatMessage[]>(() => {
    if (!demo) return [];
    const conv = DEMO_CONVERSATIONS.find(
      (c) => c.userId === conversationId || c.userId === userId
    );
    return conv ? (DEMO_MESSAGES[conv.id] ?? []) : [];
  }, [demo, conversationId, userId]);
  const { isOnline: partnerOnline, lastSeen: partnerLastSeen } = useUserOnlineStatus(partnerId > 0 ? partnerId : undefined);

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server queries — reduced polling since WebSocket handles real-time
  const messagesQuery = trpc.messages.list.useQuery(
    { partnerId, limit: 50 },
    { enabled: isAuthenticated && partnerId > 0, staleTime: 30_000, refetchInterval: 60_000 }
  );
  const sendMutation = trpc.messages.send.useMutation();
  const unsendMutation = trpc.messages.unsend.useMutation();
  const markReadMutation = trpc.messages.markRead.useMutation();
  const blockMutation = trpc.safety.block.useMutation();

  const handleBlock = useCallback(() => {
    const numId = parseInt(userId || "0", 10);
    Alert.alert("Block " + (userName || "this user") + "?", "They won't be able to see your profile or message you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: () => {
          if (isAuthenticated && numId > 0) {
            blockMutation.mutate({ userId: numId });
          }
          router.back();
        },
      },
    ]);
  }, [userId, userName, isAuthenticated, blockMutation, router]);

  // ── WebSocket Real-Time Handler ──
  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case "new_message": {
        const wsMsg = msg.message as any;
        if (!wsMsg) break;
        // Only handle messages from/to this conversation partner
        const msgSenderId = wsMsg.senderId as number;
        if (msgSenderId !== partnerId) break;

        const localMsg: ChatMessage = {
          id: String(wsMsg.id || `ws_${Date.now()}`),
          senderId: String(msgSenderId),
          text: wsMsg.text || "",
          timestamp: new Date(wsMsg.createdAt).getTime(),
          type: wsMsg.type || "text",
          photoUri: wsMsg.photoUrl || undefined,
          isRead: false,
          isUnsent: false,
          isExpired: false,
        };

        setLocalMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === localMsg.id)) return prev;
          return [...prev, localMsg];
        });

        // Mark as read since we're in the conversation
        if (isAuthenticated) {
          markReadMutation.mutate({ senderId: partnerId });
        }
        break;
      }

      case "messages_read": {
        const readByUserId = msg.readByUserId as number;
        if (readByUserId !== partnerId) break;
        // Mark all our messages as read
        setLocalMessages((prev) =>
          prev.map((m) => (m.senderId === "me" ? { ...m, isRead: true } : m))
        );
        break;
      }

      case "message_unsent": {
        const messageId = String(msg.messageId);
        setLocalMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isUnsent: true } : m))
        );
        break;
      }

      case "typing": {
        const typingUserId = msg.userId as number;
        if (typingUserId !== partnerId) break;
        setIsPartnerTyping(true);
        // Auto-clear typing after 5 seconds
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
        }
        partnerTypingTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 5000);
        break;
      }

      case "stop_typing": {
        const stopTypingUserId = msg.userId as number;
        if (stopTypingUserId !== partnerId) break;
        setIsPartnerTyping(false);
        break;
      }
    }
  }, [partnerId, isAuthenticated, markReadMutation]);

  useWebSocket(handleWsMessage);

  // Convert server messages to local format
  useEffect(() => {
    if (messagesQuery.data) {
      const converted = (messagesQuery.data as unknown as ServerMessage[])
        .map((m) => serverToLocal(m, myId))
        .reverse(); // Server returns desc, we want asc
      setLocalMessages(converted);
    }
  }, [messagesQuery.data, myId]);

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (isAuthenticated && partnerId > 0) {
      markReadMutation.mutate({ senderId: partnerId });
    }
  }, [isAuthenticated, partnerId]);

  // Cleanup typing timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (partnerTypingTimeoutRef.current) clearTimeout(partnerTypingTimeoutRef.current);
    };
  }, []);

  // ── Typing Indicator ──
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);

    if (text.length > 0 && partnerId > 0) {
      sendTyping(partnerId);
      // Debounce stop_typing
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(partnerId);
      }, 3000);
    } else if (text.length === 0 && partnerId > 0) {
      sendStopTyping(partnerId);
    }
  }, [partnerId]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Stop typing indicator
    if (partnerId > 0) sendStopTyping(partnerId);

    // Optimistic local message
    const tempId = `temp_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: "me",
      text,
      timestamp: Date.now(),
      type: "text",
      isRead: false,
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      if (isAuthenticated && partnerId > 0) {
        await sendMutation.mutateAsync({ receiverId: partnerId, type: "text", text });
        // Refetch to get the real message ID from server
        messagesQuery.refetch();
      }
    } catch (e) {
      console.warn("[ChatRoom] Send failed:", e);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, isAuthenticated, partnerId, sendMutation, messagesQuery]);

  const handleSendPhoto = useCallback(async (isExpiring: boolean) => {
    setShowPhotoOptions(false);

    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to send photos."
      );
      return;
    }

    // Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const photoUri = result.assets[0].uri;
    const msgType = isExpiring ? "expiring_photo" : "photo";
    const tempId = `temp_photo_${Date.now()}`;

    const optimistic: ChatMessage = {
      id: tempId,
      senderId: "me",
      text: "",
      timestamp: Date.now(),
      type: msgType as any,
      photoUri,
      isExpired: false,
      isRead: false,
    };
    setLocalMessages((prev) => [...prev, optimistic]);

    try {
      if (isAuthenticated && partnerId > 0) {
        await sendMutation.mutateAsync({
          receiverId: partnerId,
          type: msgType as any,
          photoUrl: photoUri,
        });
        messagesQuery.refetch();
      }
    } catch (e) {
      console.warn("[ChatRoom] Photo send failed:", e);
    }
  }, [isAuthenticated, partnerId, sendMutation, messagesQuery]);

  const handleUnsend = useCallback((messageId: string) => {
    Alert.alert("Unsend Message", "This message will be removed for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unsend",
        style: "destructive",
        onPress: async () => {
          setLocalMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, isUnsent: true } : m))
          );
          const numId = parseInt(messageId, 10);
          if (!isNaN(numId) && isAuthenticated) {
            try {
              await unsendMutation.mutateAsync({ messageId: numId });
            } catch (e) {
              console.warn("[ChatRoom] Unsend failed:", e);
            }
          }
        },
      },
    ]);
  }, [isAuthenticated, unsendMutation]);

  const handleLongPress = useCallback(
    (message: ChatMessage) => {
      if (message.senderId !== "me") return;
      Alert.alert("Message Options", undefined, [
        { text: "Unsend", style: "destructive", onPress: () => handleUnsend(message.id) },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [handleUnsend]
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (userId) {
                router.push({ pathname: "/user-detail", params: { userId, userName: userName || "" } });
              }
            }}
            style={({ pressed }) => [styles.headerCenter, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {userName || "Chat"}
            </Text>
            {isPartnerTyping ? (
              <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
            ) : partnerOnline ? (
              <Text style={[styles.typingText, { color: colors.success }]}>Online</Text>
            ) : partnerLastSeen ? (
              <Text style={[styles.typingText, { color: colors.muted }]}>{formatLastSeen(partnerLastSeen)}</Text>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert("Options", undefined, [
                { text: "Block", style: "destructive", onPress: handleBlock },
                { text: "Report", style: "destructive", onPress: () => userId && router.push({ pathname: "/report", params: { userId, userName: userName || "" } }) },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            style={({ pressed }) => [styles.moreButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="ellipsis" size={24} color={colors.muted} />
          </Pressable>
        </View>

        {/* Messages */}
        {!demo && messagesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={demo ? [...demoMessages, ...localMessages] : localMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMe={item.senderId === "me"}
                colors={colors}
                onLongPress={() => handleLongPress(item)}
                onPhotoPress={() => {
                  if (item.photoUri && !item.isExpired) {
                    setFullscreenPhoto(item.photoUri);
                  }
                }}
              />
            )}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Typing Indicator */}
        {isPartnerTyping && (
          <View style={[styles.typingBar, { backgroundColor: colors.surface }]}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, { backgroundColor: colors.muted }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.muted, opacity: 0.7 }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.muted, opacity: 0.4 }]} />
            </View>
            <Text style={[styles.typingBarText, { color: colors.muted }]}>
              {userName || "User"} is typing...
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <Pressable
            onPress={() => setShowPhotoOptions(true)}
            style={({ pressed }) => [styles.photoButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="camera.fill" size={22} color={colors.primary} />
          </Pressable>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.foreground }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={handleTextChange}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline={false}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: inputText.trim() ? colors.primary : colors.surface },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <IconSymbol name="paperplane.fill" size={20} color={inputText.trim() ? "#fff" : colors.muted} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Photo Options Modal */}
      <Modal visible={showPhotoOptions} transparent animationType="slide" onRequestClose={() => setShowPhotoOptions(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPhotoOptions(false)}>
          <View style={[styles.photoOptionsSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Send Photo</Text>
            <Pressable
              onPress={() => handleSendPhoto(false)}
              style={({ pressed }) => [styles.sheetOption, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="photo.fill" size={24} color={colors.primary} />
              <View style={styles.sheetOptionInfo}>
                <Text style={[styles.sheetOptionTitle, { color: colors.foreground }]}>Photo</Text>
                <Text style={[styles.sheetOptionSub, { color: colors.muted }]}>Send a photo that stays in the chat</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => handleSendPhoto(true)}
              style={({ pressed }) => [styles.sheetOption, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="timer" size={24} color={colors.warning} />
              <View style={styles.sheetOptionInfo}>
                <Text style={[styles.sheetOptionTitle, { color: colors.foreground }]}>Expiring Photo</Text>
                <Text style={[styles.sheetOptionSub, { color: colors.muted }]}>Photo disappears after viewing</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => setShowPhotoOptions(false)} style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.6 }]}>
              <Text style={[styles.sheetCancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Fullscreen Photo Viewer */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(null)}>
        <Pressable style={styles.fullscreenOverlay} onPress={() => setFullscreenPhoto(null)}>
          <Pressable onPress={() => setFullscreenPhoto(null)} style={styles.fullscreenClose}>
            <IconSymbol name="xmark" size={28} color="#fff" />
          </Pressable>
          {fullscreenPhoto && (
            <Image source={{ uri: fullscreenPhoto }} style={styles.fullscreenImage} contentFit="contain" transition={200} />
          )}
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backButton: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  typingText: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  moreButton: { padding: 4 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  bubbleRow: { marginBottom: 8 },
  bubbleRowMe: { alignItems: "flex-end" },
  bubbleRowOther: { alignItems: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  photoBubble: { padding: 4, overflow: "hidden" },
  unsentBubble: { borderStyle: "dashed", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  unsentText: { fontSize: 14, fontStyle: "italic" },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  bubbleFooter: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  bubbleTime: { fontSize: 11 },
  photoImage: { width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.55, borderRadius: 14 },
  expiringBadge: { position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  expiringText: { color: "#fff", fontSize: 11, marginLeft: 3, fontWeight: "600" },
  expiredPhoto: { width: SCREEN_WIDTH * 0.4, height: 80, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 4 },
  expiredText: { fontSize: 12 },
  // Typing indicator bar
  typingBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 16, marginBottom: 4, borderRadius: 16 },
  typingDots: { flexDirection: "row", gap: 4, marginRight: 8 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  typingBarText: { fontSize: 13 },
  // Input bar
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 0.5, gap: 8 },
  photoButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 16, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  // Photo options sheet
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  photoOptionsSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  sheetOption: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, marginBottom: 8, gap: 14 },
  sheetOptionInfo: { flex: 1 },
  sheetOptionTitle: { fontSize: 16, fontWeight: "600" },
  sheetOptionSub: { fontSize: 13, marginTop: 2 },
  sheetCancel: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  sheetCancelText: { fontSize: 16, fontWeight: "600" },
  // Fullscreen photo
  fullscreenOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  fullscreenClose: { position: "absolute", top: 60, right: 20, zIndex: 10, padding: 8 },
  fullscreenImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
});
