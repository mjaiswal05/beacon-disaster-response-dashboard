/**
 * Support Bot conversation types
 * Domain: /api/support-bot/v1
 */

export interface BotMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export interface ConversationHistory {
  messages: BotMessage[];
}

/**
 * Risk assessment levels returned by the support bot
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Suggested resources for the user
 */
export interface SuggestedResource {
  title: string;
  url: string;
}

/**
 * Interactive action button returned alongside a bot response.
 */
export interface BotAction {
  type: 'sos' | 'call' | 'navigate' | 'link' | 'escalate';
  label: string;
  value?: string;
}

/**
 * Response from the support bot API
 */
export interface BotMessageResponse {
  message_id: string;
  conversation_id: string;
  response: string;
  risk_level: RiskLevel;
  requires_escalation: boolean;
  suggested_resources: string[];
  actions: BotAction[];
}

/**
 * Request payload to start a new conversation
 */
export interface StartConversationRequest {
  user_id: string;
  message: string;
}

/**
 * Request payload to continue an existing conversation
 */
export interface ContinueConversationRequest {
  user_id: string;
  conversation_id: string;
  message: string;
}

/**
 * Unified request type for both start and continue
 */
export type ConversationRequest = StartConversationRequest | ContinueConversationRequest;

/**
 * Full API response wrapper
 */
export interface SupportBotApiResponse<T> {
  success: boolean;
  data: T;
  trace_id: string;
}
