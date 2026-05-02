import type { BotAction } from './supportBot.types';

export type { BotAction };

export interface Reaction {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  room_id: string;
  content: string;
  message_type: "text" | "image" | "location";
  created_at: string;
  reply_to_id?: string;
  reactions?: Reaction[];
  isMe?: boolean;
  bot_actions?: BotAction[];
}

export interface ChannelResponse {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_public: boolean;
  is_member: boolean;
  last_message_at: string | null;
  created_at: string;
}

export interface WSMessagePayload {
  room_id: string;
  content: string;
  message_type: "text" | "reaction_toggle" | "typing_start" | "typing_stop";
  reply_to_id?: string;
  /** Optional sender override - used to broadcast beacon-ai responses through the room */
  sender_id?: string;
}

export interface ReactionUpdateEvent {
  type: "reaction_update";
  message_id: string;
  user_id: string;
  emoji: string;
  action: "added" | "removed";
}
