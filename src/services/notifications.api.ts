import type {
  ApiNotification,
  Notification,
  NotifCategory,
} from "../types/notifications.types";
import { formatTimeAgo } from "../utils/date.utils";
import { request } from "../utils/request";

export type { ApiNotification, Notification, NotifCategory };

const NOTIF = "/api/notification/v1";

const CATEGORY_MAP: Record<string, NotifCategory> = {
  incident: "incident",
  message: "message",
  system: "system",
  ert: "ert",
};

const TYPE_TO_CATEGORY: Record<string, NotifCategory> = {
  DISASTER_ALERT: "incident",
  EVACUATION: "incident",
  ALL_CLEAR: "incident",
  RESOURCE_UPDATE: "ert",
  GENERAL: "system",
};

function resolveActionPath(raw: ApiNotification): string | undefined {
  const data = raw.variables?.data as Record<string, unknown> | undefined;
  const screen = data?.screen as string | undefined;
  const resourceId = data?.resource_id as string | undefined;
  switch (screen) {
    case "incident_detail":
      return resourceId ? `/incidents/${resourceId}` : "/incidents";
    case "dispatch_detail":
      return resourceId ? `/dispatches/${resourceId}/track` : undefined;
    case "evacuation":
    case "safety":
      return resourceId ? `/incidents/${resourceId}/evacuation` : "/incidents";
    default:
      return undefined;
  }
}

function mapApiNotification(raw: ApiNotification): Notification {
  const category: NotifCategory =
    CATEGORY_MAP[raw.category] ??
    TYPE_TO_CATEGORY[raw.type] ??
    "system";

  const priority = raw.priority as "P0" | "P1" | "P2" | "P3" | undefined;

  return {
    id: raw.id,
    category,
    title: raw.title
      || (raw.variables?.notification as Record<string, unknown>)?.title as string
      || raw.type
      || "Notification",
    description: raw.body
      || (raw.variables?.notification as Record<string, unknown>)?.body as string
      || "",
    timeLabel: formatTimeAgo(raw.created_at),
    timestampMs: new Date(raw.created_at).getTime(),
    read: raw.status === "READ" || !!raw.read_at,
    severity: priority && ["P0", "P1", "P2", "P3"].includes(priority)
      ? priority
      : undefined,
    actionPath: resolveActionPath(raw),
  };
}

export async function listNotifications(): Promise<Notification[]> {
  const data = await request.get<any>(`${NOTIF}/notifications`);
  const raw: ApiNotification[] = data?.success ? data.data ?? [] : [];
  return raw.map(mapApiNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await request.patch(`${NOTIF}/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await request.patch(`${NOTIF}/notifications/read`, {});
}

