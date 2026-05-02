// Service for /api/communication/v1 channel management endpoints.
import { authService } from "./auth";
import { request } from "../utils/request";
import type { ChannelResponse } from "../types/chat.types";

export type { ChannelResponse };

const COMM = "/api/communication/v1";

function getCurrentUserId(): string {
  return authService.getCurrentUser()?.id ?? "";
}

export async function createIncidentChannel(
  incidentId: string,
  incidentTitle: string,
): Promise<ChannelResponse> {
  const userId = getCurrentUserId();
  return request.post<ChannelResponse>(`${COMM}/channels/incident`, {
    incident_id: incidentId,
    incident_title: incidentTitle,
    user_id: userId,
  });
}

export async function createPublicChannel(name: string): Promise<ChannelResponse> {
  const userId = getCurrentUserId();
  return request.post<ChannelResponse>(`${COMM}/channels`, {
    name,
    user_id: userId,
  });
}

export async function listMyChannels(): Promise<ChannelResponse[]> {
  const userId = getCurrentUserId();
  return request.get<ChannelResponse[]>(`${COMM}/channels/me`, {
    params: { user_id: userId },
  });
}

export async function listPublicChannels(): Promise<ChannelResponse[]> {
  const userId = getCurrentUserId();
  return request.get<ChannelResponse[]>(`${COMM}/channels`, {
    params: { user_id: userId },
  });
}

export async function joinChannel(channelId: string): Promise<void> {
  const userId = getCurrentUserId();
  return request.post<void>(`${COMM}/channels/${channelId}/join`, {
    user_id: userId,
  });
}

export async function leaveChannel(channelId: string): Promise<void> {
  const userId = getCurrentUserId();
  return request.del<void>(`${COMM}/channels/${channelId}/members/${userId}`);
}
