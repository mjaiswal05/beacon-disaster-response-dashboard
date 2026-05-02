/**
 * Support Bot service - /api/support-bot/v1
 * Handles conversations with the AI support bot for mental health and crisis support
 * Uses request util with auth: true (default)
 */
import type {
    BotMessage,
    BotMessageResponse,
    ContinueConversationRequest,
    ConversationHistory,
    StartConversationRequest
} from "../types/supportBot.types";
import { request } from "../utils/request";

export type {
    BotMessage, BotMessageResponse, ContinueConversationRequest, ConversationHistory, RiskLevel, StartConversationRequest, SuggestedResource,
    SupportBotApiResponse
} from "../types/supportBot.types";

const BOT = "/api/support-bot/v1";

/**
 * Unwraps API response that may be nested under a .data property
 */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function normaliseRole(role: string): "user" | "assistant" {
  return role === "user" ? "user" : "assistant";
}

/**
 * Start a new conversation with the support bot
 * @param userId - Unique identifier for the user
 * @param message - Initial message from the user
 * @returns Bot response with conversation_id, risk assessment, and resources
 */
export async function startConversation(
  userId: string,
  message: string,
): Promise<BotMessageResponse> {
  const payload: StartConversationRequest = { user_id: userId, message };
  const raw = await request.post<unknown>(`${BOT}/messages`, payload);
  const data = unwrap<BotMessageResponse>(raw);
  return data;
}

/**
 * Continue an existing conversation with the support bot
 * @param userId - User identifier
 * @param conversationId - ID of the ongoing conversation
 * @param message - User's message
 * @returns Bot response with assessment and resources
 */
export async function continueConversation(
  userId: string,
  conversationId: string,
  message: string,
): Promise<BotMessageResponse> {
  const payload: ContinueConversationRequest = {
    user_id: userId,
    conversation_id: conversationId,
    message,
  };
  const raw = await request.post<unknown>(`${BOT}/messages`, payload);
  const data = unwrap<BotMessageResponse>(raw);
  return data;
}

/**
 * Legacy: Send a simple message (for backward compatibility)
 */
export async function sendMessage(content: string): Promise<BotMessage> {
  const raw = await request.post<unknown>(`${BOT}/messages`, { content });
  const data = unwrap<BotMessage>(raw);
  return {
    ...data,
    role: "assistant",
    content: data.content ?? "",
    created_at: data.created_at ?? new Date().toISOString(),
  };
}

/**
 * Get conversation history for a user
 * @param userId - User identifier
 * @returns Array of messages from the conversation
 */
export async function getConversationHistory(
  userId: string,
): Promise<ConversationHistory> {
  const raw = await request.get<unknown>(
    `${BOT}/conversations/${encodeURIComponent(userId)}`,
  );
  const data = unwrap<ConversationHistory | BotMessage[]>(raw);
  const messages: BotMessage[] = Array.isArray(data)
    ? data
    : ((data as ConversationHistory).messages ?? []);
  return {
    messages: messages.map((m) => ({ ...m, role: normaliseRole(m.role) })),
  };
}
