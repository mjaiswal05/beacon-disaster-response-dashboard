import { useCallback, useState } from "react";
import {
    continueConversation,
    startConversation,
    type BotMessageResponse,
    type RiskLevel,
} from "../services/supportBot";

interface ConversationState {
  conversationId: string | null;
  messages: BotMessageResponse[];
  isLoading: boolean;
  error: string | null;
  currentRiskLevel: RiskLevel | null;
  requiresEscalation: boolean;
}

interface UseSupportBotConversationReturn extends ConversationState {
  send: (message: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing support bot conversations
 * Handles starting new conversations and continuing existing ones
 * Tracks risk levels and escalation requirements
 */
export function useSupportBotConversation(
  userId: string,
): UseSupportBotConversationReturn {
  const [state, setState] = useState<ConversationState>({
    conversationId: null,
    messages: [],
    isLoading: false,
    error: null,
    currentRiskLevel: null,
    requiresEscalation: false,
  });

  const send = useCallback(
    async (message: string) => {
      // Block empty messages
      if (!message.trim()) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        let response: BotMessageResponse;

        if (state.conversationId) {
          // Continue existing conversation
          response = await continueConversation(
            userId,
            state.conversationId,
            message,
          );
        } else {
          // Start new conversation
          response = await startConversation(userId, message);
        }

        setState((prev) => ({
          ...prev,
          conversationId: response.conversation_id,
          messages: [
            ...prev.messages,
            {
              message_id: response.message_id,
              conversation_id: response.conversation_id,
              response: response.response,
              risk_level: response.risk_level,
              requires_escalation: response.requires_escalation,
              suggested_resources: response.suggested_resources,
              actions: response.actions ?? [],
            },
          ],
          currentRiskLevel: response.risk_level,
          requiresEscalation: response.requires_escalation,
          isLoading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [userId, state.conversationId],
  );

  const reset = useCallback(() => {
    setState({
      conversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      currentRiskLevel: null,
      requiresEscalation: false,
    });
  }, []);

  return {
    ...state,
    send,
    reset,
  };
}
