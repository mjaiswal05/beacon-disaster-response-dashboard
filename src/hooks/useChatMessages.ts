import { useCallback, useState } from "react";
import { getChatHistory } from "../services/api";
import type { Message, ReactionUpdateEvent } from "../types/chat.types";

interface UseChatMessagesReturn {
  messages: Message[];
  isLoadingHistory: boolean;
  loadHistory: (roomId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageId: (oldContent: string, newId: string) => void;
  handleReactionUpdate: (evt: ReactionUpdateEvent) => void;
  toggleReactionOptimistic: (
    messageId: string,
    emoji: string,
    userId: string,
  ) => void;
}

export function useChatMessages(
  activeRoomId: string | null,
  myId: string,
): UseChatMessagesReturn {
  const [messageMap, setMessageMap] = useState<Map<string, Message[]>>(
    new Map(),
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messages = activeRoomId ? messageMap.get(activeRoomId) || [] : [];

  const loadHistory = useCallback(
    async (roomId: string) => {
      setIsLoadingHistory(true);
      try {
        const history = await getChatHistory(roomId);
        const withIsMe = history.map((msg: any) => ({
          ...msg,
          room_id: msg.room_id || msg.conversation_id || roomId,
          isMe: msg.sender_id === myId,
        }));
        setMessageMap((prev) => {
          const updated = new Map(prev);
          updated.set(roomId, withIsMe);
          return updated;
        });
      } catch {
        // History load failed - messages will come via WS
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [myId],
  );

  const addMessage = useCallback((message: Message) => {
    const roomId = message.room_id;
    setMessageMap((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(roomId) || [];
      updated.set(roomId, [...existing, message]);
      return updated;
    });
  }, []);

  const updateMessageId = useCallback(
    (oldContent: string, newId: string) => {
      if (!activeRoomId) return;
      setMessageMap((prev) => {
        const updated = new Map(prev);
        const roomMsgs = updated.get(activeRoomId) || [];
        const idx = [...roomMsgs]
          .reverse()
          .findIndex(
            (m) =>
              m.isMe && m.content === oldContent && m.id.startsWith("msg-"),
          );
        if (idx === -1) return prev;
        const realIdx = roomMsgs.length - 1 - idx;
        const updatedMsgs = [...roomMsgs];
        updatedMsgs[realIdx] = { ...updatedMsgs[realIdx], id: newId };
        updated.set(activeRoomId, updatedMsgs);
        return updated;
      });
    },
    [activeRoomId],
  );

  const handleReactionUpdate = useCallback(
    (evt: ReactionUpdateEvent) => {
      if (!activeRoomId) return;
      setMessageMap((prev) => {
        const updated = new Map(prev);
        const roomMsgs = [...(updated.get(activeRoomId) || [])];
        const idx = roomMsgs.findIndex((m) => m.id === evt.message_id);
        if (idx === -1) return prev;

        const msg = { ...roomMsgs[idx] };
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex((r) => r.emoji === evt.emoji);

        if (evt.action === "added") {
          if (existingIdx >= 0) {
            const r = { ...reactions[existingIdx] };
            if (!r.user_ids.includes(evt.user_id)) {
              r.count += 1;
              r.user_ids = [...r.user_ids, evt.user_id];
            }
            reactions[existingIdx] = r;
          } else {
            reactions.push({
              emoji: evt.emoji,
              count: 1,
              user_ids: [evt.user_id],
            });
          }
        } else {
          if (existingIdx >= 0) {
            const r = { ...reactions[existingIdx] };
            r.user_ids = r.user_ids.filter((id) => id !== evt.user_id);
            r.count = r.user_ids.length;
            if (r.count <= 0) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = r;
            }
          }
        }

        msg.reactions = reactions;
        roomMsgs[idx] = msg;
        updated.set(activeRoomId, roomMsgs);
        return updated;
      });
    },
    [activeRoomId],
  );

  const toggleReactionOptimistic = useCallback(
    (messageId: string, emoji: string, userId: string) => {
      if (!activeRoomId) return;
      setMessageMap((prev) => {
        const updated = new Map(prev);
        const roomMsgs = [...(updated.get(activeRoomId) || [])];
        const idx = roomMsgs.findIndex((m) => m.id === messageId);
        if (idx === -1) return prev;

        const msg = { ...roomMsgs[idx] };
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
          const r = { ...reactions[existingIdx] };
          if (r.user_ids.includes(userId)) {
            r.user_ids = r.user_ids.filter((id) => id !== userId);
            r.count = r.user_ids.length;
            if (r.count <= 0) {
              reactions.splice(existingIdx, 1);
            } else {
              reactions[existingIdx] = r;
            }
          } else {
            r.user_ids = [...r.user_ids, userId];
            r.count = r.user_ids.length;
            reactions[existingIdx] = r;
          }
        } else {
          reactions.push({ emoji, count: 1, user_ids: [userId] });
        }

        msg.reactions = reactions;
        roomMsgs[idx] = msg;
        updated.set(activeRoomId, roomMsgs);
        return updated;
      });
    },
    [activeRoomId],
  );

  return {
    messages,
    isLoadingHistory,
    loadHistory,
    addMessage,
    updateMessageId,
    handleReactionUpdate,
    toggleReactionOptimistic,
  };
}
