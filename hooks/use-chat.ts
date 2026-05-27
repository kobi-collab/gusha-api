import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { ChatMessage, ChatConversation } from "@/lib/mock-data";

/**
 * Hook for managing chat conversations via tRPC.
 * Polls for new messages when a conversation is active.
 */
export function useChatConversations() {
  const { isAuthenticated, user } = useAuth();

  const conversationsQuery = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 10_000,
    refetchInterval: 15_000, // Poll every 15s
  });

  // Get profile info for each conversation partner
  const partnerIds: number[] = conversationsQuery.data || [];

  return {
    partnerIds,
    loading: conversationsQuery.isLoading,
    refetch: conversationsQuery.refetch,
  };
}

/**
 * Hook for managing messages in a specific conversation.
 */
export function useChatMessages(partnerId: number | null) {
  const { isAuthenticated, user } = useAuth();

  const messagesQuery = trpc.messages.list.useQuery(
    { partnerId: partnerId!, limit: 100 },
    {
      enabled: isAuthenticated && partnerId !== null,
      retry: 1,
      staleTime: 5_000,
      refetchInterval: 5_000, // Poll every 5s for new messages
    }
  );

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => messagesQuery.refetch(),
  });

  const markReadMutation = trpc.messages.markRead.useMutation();
  const unsendMutation = trpc.messages.unsend.useMutation({
    onSuccess: () => messagesQuery.refetch(),
  });

  // Convert server messages to ChatMessage format
  const messages: ChatMessage[] = (messagesQuery.data || [])
    .map((m: any) => ({
      id: String(m.id),
      senderId: String(m.senderId),
      text: m.text || "",
      timestamp: new Date(m.createdAt).getTime(),
      type: m.type || "text",
      photoUri: m.photoUrl || undefined,
      isExpired: m.isExpired === "true",
      isRead: m.isRead === "true",
      isUnsent: m.isUnsent === "true",
    }))
    .reverse(); // Server returns desc, we need asc

  const sendMessage = useCallback(
    async (text: string, type: "text" | "photo" | "expiring_photo" = "text", photoUrl?: string) => {
      if (!partnerId) return;
      await sendMutation.mutateAsync({
        receiverId: partnerId,
        type,
        text: type === "text" ? text : undefined,
        photoUrl,
      });
    },
    [partnerId, sendMutation]
  );

  const markRead = useCallback(async () => {
    if (!partnerId) return;
    await markReadMutation.mutateAsync({ senderId: partnerId });
  }, [partnerId, markReadMutation]);

  const unsend = useCallback(
    async (messageId: number) => {
      await unsendMutation.mutateAsync({ messageId });
    },
    [unsendMutation]
  );

  return {
    messages,
    loading: messagesQuery.isLoading,
    sendMessage,
    markRead,
    unsend,
    refetch: messagesQuery.refetch,
    isSending: sendMutation.isPending,
  };
}
