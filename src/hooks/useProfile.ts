import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMySessions,
  revokeSession,
  getMyDevices,
  getMyActivity,
} from "../services/iam.api";

export function useMyProfile() {
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: getMyProfile,
  });
}

export function useMySessions() {
  return useQuery({
    queryKey: ["me", "sessions"],
    queryFn: getMySessions,
    refetchInterval: 30_000,
  });
}

export function useMyDevices() {
  return useQuery({
    queryKey: ["me", "devices"],
    queryFn: getMyDevices,
  });
}

export function useMyActivity() {
  return useQuery({
    queryKey: ["me", "activity"],
    queryFn: () => getMyActivity(50),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "profile"] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me", "sessions"] }),
  });
}
