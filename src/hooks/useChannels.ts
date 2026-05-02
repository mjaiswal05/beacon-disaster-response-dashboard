import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as chatApi from "../services/chat.api";

// Normalise a raw API response that may be a bare array or a wrapped object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toChannelArray(data: any): import("../types/chat.types").ChannelResponse[] {
  if (Array.isArray(data)) return data;
  // Try common wrapper keys the backend might use
  const wrapped = data?.channels ?? data?.data ?? data?.rooms ?? data?.results;
  if (Array.isArray(wrapped)) return wrapped;
  console.warn("[useChannels] Unexpected response shape:", data);
  return [];
}

export function useMyChannels() {
  return useQuery({
    queryKey: ["myChannels"],
    queryFn: chatApi.listMyChannels,
    staleTime: 30_000,
    select: (data) => {
      const arr = toChannelArray(data);
      return [...arr].sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });
    },
  });
}

export function usePublicChannels() {
  return useQuery({
    queryKey: ["publicChannels"],
    queryFn: chatApi.listPublicChannels,
    staleTime: 60_000,
    select: toChannelArray,
  });
}

export function useCreateIncidentChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      incidentId,
      incidentTitle,
    }: {
      incidentId: string;
      incidentTitle: string;
    }) => chatApi.createIncidentChannel(incidentId, incidentTitle),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myChannels"] }),
  });
}

export function useCreatePublicChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => chatApi.createPublicChannel(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myChannels"] });
      qc.invalidateQueries({ queryKey: ["publicChannels"] });
    },
  });
}

export function useJoinChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => chatApi.joinChannel(channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myChannels"] });
      qc.invalidateQueries({ queryKey: ["publicChannels"] });
    },
  });
}

export function useLeaveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => chatApi.leaveChannel(channelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myChannels"] }),
  });
}
