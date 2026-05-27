import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

/**
 * Hook for taps (quick interest signals).
 */
export function useTaps() {
  const { isAuthenticated } = useAuth();

  const receivedQuery = trpc.taps.received.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const sendMutation = trpc.taps.send.useMutation({
    onSuccess: () => receivedQuery.refetch(),
  });

  const markReadMutation = trpc.taps.markRead.useMutation({
    onSuccess: () => receivedQuery.refetch(),
  });

  const sendTap = useCallback(
    async (receiverId: number, type: "fire" | "friendly" | "wave" = "wave") => {
      await sendMutation.mutateAsync({ receiverId, type });
    },
    [sendMutation]
  );

  const markRead = useCallback(async () => {
    await markReadMutation.mutateAsync();
  }, [markReadMutation]);

  return {
    taps: receivedQuery.data || [],
    loading: receivedQuery.isLoading,
    sendTap,
    markRead,
    refetch: receivedQuery.refetch,
  };
}

/**
 * Hook for profile views (who viewed me).
 */
export function useProfileViews() {
  const { isAuthenticated } = useAuth();

  const viewsQuery = trpc.views.myViewers.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 30_000,
  });

  const recordMutation = trpc.views.record.useMutation();

  const recordView = useCallback(
    async (viewedUserId: number) => {
      await recordMutation.mutateAsync({ viewedUserId });
    },
    [recordMutation]
  );

  return {
    views: viewsQuery.data || [],
    loading: viewsQuery.isLoading,
    recordView,
    refetch: viewsQuery.refetch,
  };
}

/**
 * Hook for favorites.
 */
export function useFavorites() {
  const { isAuthenticated } = useAuth();

  const favoritesQuery = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 15_000,
  });

  const addMutation = trpc.favorites.add.useMutation({
    onSuccess: () => favoritesQuery.refetch(),
  });

  const removeMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => favoritesQuery.refetch(),
  });

  const addFavorite = useCallback(
    async (favoriteUserId: number) => {
      await addMutation.mutateAsync({ favoriteUserId });
    },
    [addMutation]
  );

  const removeFavorite = useCallback(
    async (favoriteUserId: number) => {
      await removeMutation.mutateAsync({ favoriteUserId });
    },
    [removeMutation]
  );

  const isFavorite = useCallback(
    (userId: number) => {
      return (favoritesQuery.data || []).some((f: any) => f.favoriteUserId === userId);
    },
    [favoritesQuery.data]
  );

  return {
    favorites: favoritesQuery.data || [],
    loading: favoritesQuery.isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: favoritesQuery.refetch,
  };
}

/**
 * Hook for block & report.
 */
export function useSafety() {
  const { isAuthenticated } = useAuth();

  const blockedQuery = trpc.safety.blockedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 30_000,
  });

  const blockMutation = trpc.safety.block.useMutation({
    onSuccess: () => blockedQuery.refetch(),
  });

  const unblockMutation = trpc.safety.unblock.useMutation({
    onSuccess: () => blockedQuery.refetch(),
  });

  const reportMutation = trpc.safety.report.useMutation();

  const blockUser = useCallback(
    async (userId: number) => {
      await blockMutation.mutateAsync({ userId });
    },
    [blockMutation]
  );

  const unblockUser = useCallback(
    async (userId: number) => {
      await unblockMutation.mutateAsync({ userId });
    },
    [unblockMutation]
  );

  const reportUser = useCallback(
    async (
      reportedUserId: number,
      reason: "spam" | "harassment" | "fake_profile" | "inappropriate_content" | "other",
      description?: string
    ) => {
      await reportMutation.mutateAsync({ reportedUserId, reason, description });
    },
    [reportMutation]
  );

  const isBlocked = useCallback(
    (userId: number) => {
      return (blockedQuery.data || []).some((b: any) => b.blockedUserId === userId);
    },
    [blockedQuery.data]
  );

  return {
    blockedUsers: blockedQuery.data || [],
    loading: blockedQuery.isLoading,
    blockUser,
    unblockUser,
    reportUser,
    isBlocked,
    refetch: blockedQuery.refetch,
  };
}
