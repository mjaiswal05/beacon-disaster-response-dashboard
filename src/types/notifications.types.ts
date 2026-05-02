export interface ApiNotification {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  body: string;
  category: string;
  channels: string[];
  recipients: string[];
  template_id: string;
  requires_ack: boolean;
  variables?: Record<string, unknown>;
  created_at: string;
  sent_at?: string;
  read_at?: string;
  expires_at?: string;
}

export type NotifCategory = "incident" | "message" | "system" | "ert";

export interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  description: string;
  timeLabel: string;
  timestampMs: number;
  read: boolean;
  severity?: "P0" | "P1" | "P2" | "P3";
  actionLabel?: string;
  actionPath?: string;
}
