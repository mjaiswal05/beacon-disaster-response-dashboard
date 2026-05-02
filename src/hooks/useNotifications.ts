import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.api";
import type { Notification } from "../types/notifications.types";

export function useNotifications() {
  const userId = authService.getCurrentUser()?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => listNotifications(),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  return {
    notifications: (data ?? []) as Notification[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
