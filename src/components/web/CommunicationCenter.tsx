import emojiData from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Copy,
  Hash,
  Loader2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Reply,
  Send,
  Smile,
  SmilePlus,
  Upload,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { BotActionButton } from "../atoms/BotActionButton";
import { getChatHistory } from "../../services/api";
import { authService } from "../../services/auth";
import {
  continueConversation,
  startConversation,
} from "../../services/supportBot";
import type {
  BotAction,
  Message,
  Reaction,
  ReactionUpdateEvent,
  WSMessagePayload,
} from "../../types/chat.types";
import { useMyChannels, usePublicChannels, useJoinChannel } from "../../hooks/useChannels";
import { getRoleColor } from "../../utils/roleColors";
import { useAuth } from "../../contexts/AuthContext";
import { ChannelList } from "./ChannelList";
import {
  VaultAttachmentCard,
  encodeVaultAttachment,
  decodeVaultAttachment,
} from "../atoms/VaultAttachmentCard";
import type { AttachedVaultFile } from "../atoms/VaultAttachmentCard";
import { ChatVaultPicker } from "../organisms/ChatVaultPicker";
import { ChatUploadModal } from "../organisms/ChatUploadModal";
import { CreateChannelModal } from "../organisms/CreateChannelModal";

interface CommunicationCenterProps {
  onBack: () => void;
}

import { QUICK_EMOJIS } from "../../constants/constants";

const WS_URL = "wss://beacon-tcd.tech/api/communication/ws";
const spring = { type: "spring", stiffness: 400, damping: 36 } as const;
const springFast = { type: "spring", stiffness: 520, damping: 40 } as const;

// Generate a stable avatar gradient from a user ID string
function avatarGradient(id: string): string {
  const gradients = [
    "linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)",
    "linear-gradient(135deg, #9333EA 0%, #7c3aed 100%)",
    "linear-gradient(135deg, #FF9F0A 0%, #d97706 100%)",
    "linear-gradient(135deg, #30D158 0%, #16a34a 100%)",
    "linear-gradient(135deg, #FF453A 0%, #dc2626 100%)",
    "linear-gradient(135deg, #64D2FF 0%, #0ea5e9 100%)",
    "linear-gradient(135deg, #FF6B9D 0%, #ec4899 100%)",
    "linear-gradient(135deg, #A78BFA 0%, #8b5cf6 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function avatarInitials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}

export function CommunicationCenter({
  onBack: _onBack,
}: CommunicationCenterProps) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<
    string | null
  >(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [actionMenuMessageId, setActionMenuMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracks the active bot conversation ID so @beaconai messages continue the same session
  const botConversationIdRef = useRef<string | null>(null);
  // Tracks bot response message IDs we've already applied locally - prevents WS echo from duplicating them
  const botSentIdsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const historicMessageIdsRef = useRef<Set<string>>(new Set());

  const { user: authUser } = useAuth();
  const currentUser = authService.getCurrentUser();
  const myId = currentUser?.id || "unknown-user";
  const myName = [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ") || authUser?.username || "";
  const myRole = authUser?.role || "";

  // Sender name map for @mention suggestions and typing indicator display
  const senderNameMapRef = useRef<Map<string, string>>(new Map());

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);

  // URL param: auto-select channel from ?channel=<id>
  const [searchParams] = useSearchParams();
  const channelFromUrl = searchParams.get("channel");

  // Channels from API
  const { data: myChannels, isLoading: isMyChannelsLoading } = useMyChannels();
  const { data: publicChannels } = usePublicChannels();
  const joinChannelMutation = useJoinChannel();

  // Active channel metadata
  const activeChannel = (myChannels ?? []).find((c) => c.id === activeChannelId);

  // Auto-select channel from URL param on mount / when channels load
  useEffect(() => {
    if (channelFromUrl && !activeChannelId) {
      setActiveChannelId(channelFromUrl);
    }
  }, [channelFromUrl, activeChannelId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- Fetch chat history when channel changes ---
  const fetchHistory = useCallback(
    async (roomId: string) => {
      setIsLoadingHistory(true);
      try {
        const history = await getChatHistory(roomId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const withIsMe = history.map((msg: any) => {
          // Populate sender name map from history
          if (msg.sender_id && msg.sender_name) {
            senderNameMapRef.current.set(msg.sender_id, msg.sender_name);
          }
          return {
            ...msg,
            sender_name: msg.sender_name || "",
            sender_role: msg.sender_role || "",
            room_id: msg.room_id || msg.conversation_id || roomId,
            isMe: msg.sender_id === myId,
          };
        });
        historicMessageIdsRef.current = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          withIsMe.map((m: any) => m.id as string),
        );
        setMessages((prev) => {
          const updated = new Map(prev);
          updated.set(roomId, withIsMe);
          return updated;
        });
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error("[CHAT_HISTORY_FAILED]", { roomId, error: err });
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [myId, scrollToBottom],
  );

  // --- Helper: send raw WS payload ---
  const wsSend = useCallback((payload: WSMessagePayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // --- Typing indicator ---
  const sendTypingStart = useCallback(() => {
    if (!activeChannelId || isTypingRef.current) return;
    isTypingRef.current = true;
    wsSend({
      room_id: activeChannelId,
      content: "",
      message_type: "typing_start",
    });
  }, [activeChannelId, wsSend]);

  const sendTypingStop = useCallback(() => {
    if (!activeChannelId || !isTypingRef.current) return;
    isTypingRef.current = false;
    wsSend({
      room_id: activeChannelId,
      content: "",
      message_type: "typing_stop",
    });
  }, [activeChannelId, wsSend]);

  // --- Handle incoming WS events ---
  const handleWSMessage = useCallback(
    (roomId: string, event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const msgType = data.message_type || data.type;

        if (
          msgType === "typing_start" &&
          data.sender_id &&
          data.sender_id !== myId
        ) {
          setTypingUsers((prev) => new Set(prev).add(data.sender_id));
          return;
        }
        if (msgType === "typing_stop" && data.sender_id) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.sender_id);
            return next;
          });
          return;
        }

        if (data.type === "reaction_update") {
          const evt = data as ReactionUpdateEvent;
          setMessages((prev) => {
            const updated = new Map(prev);
            const roomMsgs = [...(updated.get(roomId) || [])];
            const idx = roomMsgs.findIndex((m) => m.id === evt.message_id);
            if (idx === -1) return prev;

            const msg = { ...roomMsgs[idx] };
            const reactions = [...(msg.reactions || [])];
            const existingIdx = reactions.findIndex(
              (r) => r.emoji === evt.emoji,
            );

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
                if (r.count <= 0) reactions.splice(existingIdx, 1);
                else reactions[existingIdx] = r;
              }
            }

            msg.reactions = reactions;
            roomMsgs[idx] = msg;
            updated.set(roomId, roomMsgs);
            return updated;
          });
          return;
        }

        if (data.sender_id && data.content) {
          // Populate sender name map for @mentions and typing display
          if (data.sender_id && data.sender_name) {
            senderNameMapRef.current.set(data.sender_id, data.sender_name);
          }

          if (data.sender_id === myId) {
            if (data.id) {
              setMessages((prev) => {
                const updated = new Map(prev);
                const roomMsgs = updated.get(roomId) || [];
                const idx = [...roomMsgs]
                  .reverse()
                  .findIndex(
                    (m) =>
                      m.isMe &&
                      m.content === data.content &&
                      m.id.startsWith("msg-"),
                  );
                if (idx === -1) return prev;
                const realIdx = roomMsgs.length - 1 - idx;
                const updatedMsgs = [...roomMsgs];
                updatedMsgs[realIdx] = { ...updatedMsgs[realIdx], id: data.id };
                updated.set(roomId, updatedMsgs);
                return updated;
              });
            }
          } else if (data.sender_id === "beacon-ai" && botSentIdsRef.current.has(data.id)) {
            // This is the WS echo of a bot response we already applied locally - skip to avoid duplication
            botSentIdsRef.current.delete(data.id);
          } else {
            const newMessage: Message = {
              id:
                data.id ||
                `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              sender_id: data.sender_id,
              sender_name: data.sender_name || "",
              sender_role: data.sender_role || "",
              content: data.content,
              room_id: roomId,
              message_type: data.message_type || "text",
              created_at: data.created_at || new Date().toISOString(),
              reply_to_id: data.reply_to_id,
              reactions: data.reactions || [],
              isMe: false,
            };
            setMessages((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(roomId) || [];
              updated.set(roomId, [...existing, newMessage]);
              return updated;
            });
            scrollToBottom();
          }
        }
      } catch {
        // Ignore unparseable
      }
    },
    [myId, scrollToBottom],
  );

  // --- WebSocket lifecycle: connect on channel change ---
  useEffect(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
    setIsConnecting(false);
    setReplyingTo(null);
    setEmojiPickerMessageId(null);
    setTypingUsers(new Set());
    isTypingRef.current = false;

    if (!activeChannelId) return;

    const roomId = activeChannelId;
    fetchHistory(roomId);

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      setIsConnecting(true);
      intentionalCloseRef.current = false;
      try {
        const wsUrl = `${WS_URL}?user_id=${encodeURIComponent(myId)}&room_id=${encodeURIComponent(roomId)}&sender_name=${encodeURIComponent(myName)}&sender_role=${encodeURIComponent(myRole)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setIsConnecting(false);
          reconnectAttemptsRef.current = 0;
        };
        ws.onmessage = (event) => handleWSMessage(roomId, event);
        ws.onclose = (_ev) => {
          setIsConnected(false);
          setIsConnecting(false);
          wsRef.current = null;
          if (
            !intentionalCloseRef.current &&
            reconnectAttemptsRef.current < 5
          ) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000,
            );
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };
        ws.onerror = () => setIsConnecting(false);
      } catch {
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeChannelId, myId, fetchHistory, handleWSMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannelId, scrollToBottom]);

  // --- Send a chat message (or route @beaconai queries to AI) ---
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !activeChannelId) return;

    const trimmed = inputMessage.trim();
    sendTypingStop();

    // @beaconai intercept: messages starting with "@beaconai " go to the AI, not the room
    if (trimmed.startsWith("@beaconai ")) {
      const botPrompt = trimmed.slice(10);
      if (!botPrompt) return;

      // Use msg- prefix so the WS echo deduplication finds and upgrades the temp ID
      const userMsgTempId = `msg-beaconai-${Date.now()}`;

      // Inject the user's @beaconai query as a local message
      const userMsg: Message = {
        id: userMsgTempId,
        sender_id: myId,
        sender_name: myName,
        sender_role: myRole,
        content: trimmed,
        room_id: activeChannelId,
        message_type: "text",
        created_at: new Date().toISOString(),
        reactions: [],
        isMe: true,
      };

      // Placeholder loading message from the bot
      const loadingId = `bot-loading-${Date.now()}`;
      const loadingMsg: Message = {
        id: loadingId,
        sender_id: "beacon-ai",
        sender_name: "Beacon AI",
        sender_role: "",
        content: "⏳ Beacon AI is thinking…",
        room_id: activeChannelId,
        message_type: "text",
        created_at: new Date().toISOString(),
        reactions: [],
        isMe: false,
      };

      setMessages((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(activeChannelId) || [];
        updated.set(activeChannelId, [...existing, userMsg, loadingMsg]);
        return updated;
      });

      setInputMessage("");
      setReplyingTo(null);
      scrollToBottom();

      // Broadcast the user's @beaconai message to the room via WebSocket
      wsSend({ room_id: activeChannelId, content: trimmed, message_type: "text" });

      // Fetch bot response and replace the loading placeholder
      try {
        const botResponse = botConversationIdRef.current
          ? await continueConversation(myId, botConversationIdRef.current, botPrompt)
          : await startConversation(myId, botPrompt);

        // Persist conversation ID for follow-up @beaconai messages
        botConversationIdRef.current = botResponse.conversation_id;

        const responseContent = botResponse.response;
        const botActions: BotAction[] = botResponse.actions ?? [];

        const botMsgId = botResponse.message_id || `bot-resp-${Date.now()}`;

        // Mark this ID as locally-applied so the WS echo won't duplicate it
        botSentIdsRef.current.add(botMsgId);

        setMessages((prev) => {
          const updated = new Map(prev);
          const room = (updated.get(activeChannelId) || []).map((m) =>
            m.id === loadingId
              ? { ...m, id: botMsgId, sender_id: "beacon-ai", content: responseContent, bot_actions: botActions }
              : m,
          );
          updated.set(activeChannelId, room);
          return updated;
        });

        // Broadcast the bot response to the room so other members see it
        wsSend({
          room_id: activeChannelId,
          content: responseContent,
          message_type: "text",
          sender_id: "beacon-ai",
        });
      } catch {
        setMessages((prev) => {
          const updated = new Map(prev);
          const room = (updated.get(activeChannelId) || []).map((m) =>
            m.id === loadingId
              ? { ...m, sender_id: "beacon-ai", content: "Beacon AI: Failed to get a response. Please try again." }
              : m,
          );
          updated.set(activeChannelId, room);
          return updated;
        });
      }
      scrollToBottom();
      return;
    }

    // Normal chat message via WebSocket
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload: WSMessagePayload = {
      room_id: activeChannelId,
      content: trimmed,
      message_type: "text",
      ...(replyingTo ? { reply_to_id: replyingTo.id } : {}),
    };

    try {
      wsRef.current.send(JSON.stringify(payload));

      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        sender_id: myId,
        sender_name: myName,
        sender_role: myRole,
        content: trimmed,
        room_id: activeChannelId,
        message_type: "text",
        created_at: new Date().toISOString(),
        reply_to_id: replyingTo?.id,
        reactions: [],
        isMe: true,
      };

      setMessages((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(activeChannelId) || [];
        updated.set(activeChannelId, [...existing, newMessage]);
        return updated;
      });

      setInputMessage("");
      setReplyingTo(null);
      scrollToBottom();
    } catch {
      // Failed to send
    }
  }, [
    inputMessage,
    activeChannelId,
    myId,
    myName,
    myRole,
    replyingTo,
    scrollToBottom,
    sendTypingStop,
    wsSend,
  ]);

  // --- Attach a vault file as a chat message ---
  const handleAttachVaultFile = useCallback(
    (file: AttachedVaultFile) => {
      if (!activeChannelId) return;
      setShowVaultPicker(false);

      const content = encodeVaultAttachment(file);
      const tempId  = `msg-vault-${Date.now()}`;
      const newMsg: Message = {
        id: tempId,
        sender_id: myId,
        sender_name: myName,
        sender_role: myRole,
        content,
        room_id: activeChannelId,
        message_type: "text",
        created_at: new Date().toISOString(),
        reactions: [],
        isMe: true,
      };

      setMessages((prev) => {
        const updated = new Map(prev);
        updated.set(activeChannelId, [...(updated.get(activeChannelId) || []), newMsg]);
        return updated;
      });
      scrollToBottom();

      wsSend({ room_id: activeChannelId, content, message_type: "text" });
    },
    [activeChannelId, myId, myName, myRole, scrollToBottom, wsSend],
  );

  // --- Share location ---
  const shareLocation = useCallback(() => {
    if (!activeChannelId || !isConnected) return;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const content = `[LOCATION]${JSON.stringify({ lat, lng })}`;

        wsSend({ room_id: activeChannelId, content, message_type: "text" });

        const newMsg: Message = {
          id: `msg-loc-${Date.now()}`,
          sender_id: myId,
          sender_name: myName,
          sender_role: myRole,
          content,
          room_id: activeChannelId,
          message_type: "text",
          created_at: new Date().toISOString(),
          reactions: [],
          isMe: true,
        };
        setMessages((prev) => {
          const updated = new Map(prev);
          updated.set(activeChannelId, [...(updated.get(activeChannelId) || []), newMsg]);
          return updated;
        });
        scrollToBottom();
      },
      () => alert("Could not get your location. Please allow location access."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [activeChannelId, isConnected, myId, myName, myRole, wsSend, scrollToBottom]);

  // --- Toggle a reaction ---
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeChannelId) return;

      wsSend({
        room_id: activeChannelId,
        content: emoji,
        message_type: "reaction_toggle",
        reply_to_id: messageId,
      });

      setMessages((prev) => {
        const updated = new Map(prev);
        const roomMsgs = [...(updated.get(activeChannelId) || [])];
        const idx = roomMsgs.findIndex((m) => m.id === messageId);
        if (idx === -1) return prev;

        const msg = { ...roomMsgs[idx] };
        const reactions = [...(msg.reactions || [])];
        const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIdx >= 0) {
          const r = { ...reactions[existingIdx] };
          if (r.user_ids.includes(myId)) {
            r.user_ids = r.user_ids.filter((id) => id !== myId);
            r.count = r.user_ids.length;
            if (r.count <= 0) reactions.splice(existingIdx, 1);
            else reactions[existingIdx] = r;
          } else {
            r.user_ids = [...r.user_ids, myId];
            r.count = r.user_ids.length;
            reactions[existingIdx] = r;
          }
        } else {
          reactions.push({ emoji, count: 1, user_ids: [myId] });
        }

        msg.reactions = reactions;
        roomMsgs[idx] = msg;
        updated.set(activeChannelId, roomMsgs);
        return updated;
      });

      setEmojiPickerMessageId(null);
      setShowFullEmojiPicker(false);
    },
    [activeChannelId, myId, wsSend],
  );

  // --- Input handlers ---
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);
    sendTypingStart();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStop(), 3000);

    // @mention detection
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursorPos);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      const names = Array.from(senderNameMapRef.current.values());
      setMentionSuggestions(
        names.filter((n) => n.toLowerCase().includes(query)).slice(0, 5),
      );
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const insertMention = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? inputMessage.length;
    const textBefore = inputMessage.slice(0, cursorPos);
    const textAfter = inputMessage.slice(cursorPos);
    const replaced = textBefore.replace(/@(\w*)$/, `@${name} `);
    setInputMessage(replaced + textAfter);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  function renderMentions(text: string): React.ReactNode {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      /^@\S+$/.test(part) ? (
        <span key={i} className="text-blue-400 font-medium">
          {part}
        </span>
      ) : (
        part
      ),
    );
  }

  const findMessageById = (id: string): Message | undefined => {
    if (!activeChannelId) return undefined;
    return (messages.get(activeChannelId) || []).find((m) => m.id === id);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const currentMessages = activeChannelId
    ? messages.get(activeChannelId) || []
    : [];

  // --- Render a single message bubble ---
  const renderMessage = (
    message: Message,
    index: number,
    prevMessage?: Message,
  ) => {
    const repliedMsg = message.reply_to_id
      ? findMessageById(message.reply_to_id)
      : null;
    const isPickerOpen = emojiPickerMessageId === message.id;
    const isActionMenuOpen = actionMenuMessageId === message.id;
    const isHistoric = historicMessageIdsRef.current.has(message.id);
    // Group consecutive messages from the same sender (hide avatar/name for follow-ups)
    const isGrouped =
      !!prevMessage && prevMessage.sender_id === message.sender_id;

    return (
      <motion.div
        key={message.id}
        layout="position"
        initial={
          isHistoric
            ? { opacity: 0, y: 10 }
            : { opacity: 0, x: message.isMe ? 24 : -24, y: 4, scale: 0.97 }
        }
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={
          isHistoric
            ? { ...spring, delay: Math.min(index * 0.025, 0.4) }
            : springFast
        }
        className={`flex gap-2 ${message.isMe ? "flex-row-reverse" : ""} group ${isGrouped ? "mt-0.5" : "mt-3"}`}
      >
        {/* Avatar - only for others; spacer when grouped */}
        {!message.isMe &&
          (isGrouped ? (
            <div className="w-8 h-8 shrink-0" aria-hidden="true" />
          ) : message.sender_id === "beacon-ai" ? (
            <motion.div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springFast}
              aria-hidden="true"
            >
              <Bot className="w-4 h-4 text-white" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end"
              style={{ background: avatarGradient(message.sender_id) }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springFast}
              aria-hidden="true"
            >
              <span
                className="text-white"
                style={{ fontSize: "10px", fontWeight: 700 }}
              >
                {avatarInitials(message.sender_id)}
              </span>
            </motion.div>
          ))}

        {/* Content column */}
        <div
          className={`max-w-[65%] flex flex-col ${message.isMe ? "items-end" : "items-start"}`}
        >
          {/* Sender name + time - only on first message in a group */}
          {!message.isMe && !isGrouped && (
            <div className="flex items-center gap-2 mb-1">
              {message.sender_id === "beacon-ai" ? (
                <span
                  style={{
                    color: "#a78bfa",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Beacon AI
                </span>
              ) : (
                <span
                  className={getRoleColor(message.sender_role)}
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  {message.sender_name || `${message.sender_id.slice(0, 8)}…`}
                </span>
              )}
              <span
                style={{ color: "var(--muted-foreground)", fontSize: "10px" }}
              >
                {formatTime(message.created_at)}
              </span>
            </div>
          )}

          {/* Reply preview */}
          {repliedMsg && (
            <div
              className={`text-xs px-3 py-1.5 mb-1 rounded-t-lg border-l-2 ${message.isMe
                ? "border-blue-400 text-blue-200"
                : "border-gray-500 text-muted-foreground"
                }`}
              style={{
                background: message.isMe
                  ? "rgba(37,99,235,0.15)"
                  : "rgba(255,255,255,0.05)",
              }}
            >
              <span className="font-medium">
                {repliedMsg.sender_id === myId
                  ? "You"
                  : repliedMsg.sender_name || `${repliedMsg.sender_id.slice(0, 8)}…`}
              </span>
              <p className="truncate">
                {repliedMsg.content.startsWith("[VAULT_FILE]") ? "📎 File attachment"
                  : repliedMsg.content.startsWith("[LOCATION]") ? "📍 Location"
                    : repliedMsg.content.slice(0, 80)}
              </p>
            </div>
          )}

          {/* Bubble */}
          {(() => {
            // Location message
            if (message.content.startsWith("[LOCATION]")) {
              const locData = (() => {
                try { return JSON.parse(message.content.slice("[LOCATION]".length)); } catch { return null; }
              })();
              if (locData) {
                const mapsUrl = `https://www.google.com/maps?q=${locData.lat},${locData.lng}`;
                return (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-[14px] overflow-hidden"
                    style={{
                      background: message.isMe ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)",
                      border: message.isMe ? "1px solid rgba(37,99,235,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      minWidth: 200,
                      maxWidth: 240,
                    }}
                    aria-label="Open location in Google Maps"
                  >
                    <div
                      className="w-full flex items-center justify-center"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        height: 80,
                        backgroundImage: `url("https://static-maps.yandex.ru/1.x/?ll=${locData.lng},${locData.lat}&size=240,80&z=14&l=map&pt=${locData.lng},${locData.lat},pm2rdm")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <MapPin className="w-6 h-6" style={{ color: "#FF453A" }} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#2563EB" }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "12px", fontWeight: 500, color: message.isMe ? "#fff" : "#e4e4e7" }}>
                          📍 Location shared
                        </p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>
                          {locData.lat.toFixed(4)}, {locData.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              }
            }

            const vaultFile = decodeVaultAttachment(message.content);
            if (vaultFile) {
              return (
                <VaultAttachmentCard
                  file={vaultFile}
                  isMine={message.isMe}
                />
              );
            }

            return (
              <div
                className={`px-4 py-2.5 ${message.isMe
                  ? "rounded-[14px_14px_4px_14px]"
                  : "rounded-[14px_14px_14px_4px]"
                  }`}
                style={{
                  background: message.isMe
                    ? "#2563EB"
                    : message.sender_id === "beacon-ai"
                      ? "rgba(79,70,229,0.12)"
                      : (message.message_type as string) === "alert"
                        ? "rgba(147,51,234,0.12)"
                        : "var(--card)",
                  border: message.sender_id === "beacon-ai"
                    ? "1px solid rgba(124,58,237,0.25)"
                    : (message.message_type as string) === "alert"
                      ? "1px solid rgba(147,51,234,0.2)"
                      : "none",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: message.isMe ? "#fff" : "#e4e4e7",
                }}
              >
                {(message.message_type as string) === "alert" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      style={{
                        color: "#9333EA",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    >
                      AI ANALYSIS
                    </span>
                  </div>
                )}
                {message.sender_id === "beacon-ai" ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3" style={{ color: "#a78bfa" }} aria-hidden="true" />
                      <span style={{ color: "#a78bfa", fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>
                        BEACON AI
                      </span>
                    </div>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        p: ({ children }) => (
                          <p className="break-words" style={{ fontSize: "13px", lineHeight: 1.5, margin: "0 0 4px 0" }}>
                            {children}
                          </p>
                        ),
                        strong: ({ children }) => (
                          <strong style={{ fontWeight: 600, color: "inherit" }}>{children}</strong>
                        ),
                        h2: ({ children }) => (
                          <h2 style={{ color: "#a78bfa", fontSize: "12px", fontWeight: 700, margin: "6px 0 2px 0" }}>
                            {children}
                          </h2>
                        ),
                        ul: ({ children }) => (
                          <ul style={{ paddingLeft: "16px", margin: "2px 0", fontSize: "13px" }}>{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li style={{ lineHeight: 1.5, fontSize: "13px" }}>{children}</li>
                        ),
                      }}
                    >
                      {message.content.replace(/^\u{1F916}\s*/u, "")}
                    </ReactMarkdown>
                    {message.bot_actions && message.bot_actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.bot_actions.map((action, i) => (
                          <BotActionButton key={i} action={action} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="break-words">
                    {message.content.startsWith("@beaconai ") ? (
                      <>
                        <span
                          className="font-semibold mr-1"
                          style={{ color: "#c4b5fd" }}
                        >
                          @beaconai
                        </span>
                        {renderMentions(message.content.slice(10))}
                      </>
                    ) : (
                      renderMentions(message.content)
                    )}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Own message timestamp */}
          {message.isMe && (
            <span
              style={{ color: "var(--muted-foreground)", fontSize: "10px" }}
              className="mt-1 mr-1"
            >
              {formatTime(message.created_at)}
            </span>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              <AnimatePresence>
                {message.reactions.map((r: Reaction) => (
                  <motion.button
                    key={r.emoji}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.82 }}
                    transition={springFast}
                    onClick={() => toggleReaction(message.id, r.emoji)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                    style={
                      r.user_ids.includes(myId)
                        ? {
                          background: "rgba(37,99,235,0.2)",
                          borderColor: "rgba(37,99,235,0.4)",
                          color: "#93bbfc",
                        }
                        : {
                          background: "var(--card)",
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                        }
                    }
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Side action bar - appears on hover, sits beside the bubble */}
        <div
          className={`flex items-center self-center gap-0.5 shrink-0 transition-opacity ${isPickerOpen || isActionMenuOpen
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
            }`}
        >
          {/* Reply */}
          <button
            onClick={() => {
              setReplyingTo(message);
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--muted-foreground)")
            }
            title="Reply"
            aria-label="Reply to message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* React - quick emoji picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullEmojiPicker(false);
                setActionMenuMessageId(null);
                setEmojiPickerMessageId(isPickerOpen ? null : message.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{
                color: isPickerOpen ? "#2563EB" : "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                if (!isPickerOpen) e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                if (!isPickerOpen)
                  e.currentTarget.style.color = "var(--muted-foreground)";
              }}
              title="React"
              aria-label="Add reaction"
            >
              <SmilePlus className="w-3.5 h-3.5" />
            </button>

            {isPickerOpen && (
              <div
                className={`absolute z-50 bottom-full mb-2 ${message.isMe ? "left-0" : "right-0"
                  } rounded-xl shadow-xl`}
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex gap-1 p-1.5"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <motion.button
                      key={emoji}
                      onClick={() => toggleReaction(message.id, emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded text-base"
                      style={{ color: "#fff" }}
                      whileHover={{
                        scale: 1.3,
                        backgroundColor: "var(--border)",
                      }}
                      whileTap={{ scale: 0.8 }}
                      transition={springFast}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                  <button
                    onClick={() => setShowFullEmojiPicker((prev) => !prev)}
                    className="w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#fff")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--muted-foreground)")
                    }
                    title="More emojis"
                  >
                    +
                  </button>
                </div>
                {showFullEmojiPicker && (
                  <div className="p-1">
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji: { native: string }) => {
                        toggleReaction(message.id, emoji.native);
                        setShowFullEmojiPicker(false);
                      }}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                      perLine={8}
                      maxFrequentRows={1}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* More options (…) - copy / react / reply panel */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEmojiPickerMessageId(null);
                setShowFullEmojiPicker(false);
                setActionMenuMessageId(isActionMenuOpen ? null : message.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{
                color: isActionMenuOpen
                  ? "#2563EB"
                  : "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                if (!isActionMenuOpen) e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                if (!isActionMenuOpen)
                  e.currentTarget.style.color = "var(--muted-foreground)";
              }}
              title="More options"
              aria-label="More message options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isActionMenuOpen && (
              <div
                className={`absolute z-50 bottom-full mb-2 ${message.isMe ? "left-0" : "right-0"
                  } min-w-36 rounded-xl shadow-xl overflow-hidden`}
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                  style={{ color: "var(--foreground)", fontSize: "13px" }}
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    setActionMenuMessageId(null);
                  }}
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Copy message
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                  style={{ color: "var(--foreground)", fontSize: "13px" }}
                  onClick={() => {
                    setActionMenuMessageId(null);
                    setEmojiPickerMessageId(message.id);
                  }}
                >
                  <SmilePlus
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  React
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                  style={{ color: "var(--foreground)", fontSize: "13px" }}
                  onClick={() => {
                    setReplyingTo(message);
                    setActionMenuMessageId(null);
                    inputRef.current?.focus();
                  }}
                >
                  <Reply
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 flex">
      {/* ── Channel List (left pane) ─────────────────────────────── */}
      <ChannelList
        channels={myChannels ?? []}
        publicChannels={publicChannels ?? []}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        isLoading={isMyChannelsLoading}
        error={null}
        onRetry={() => {}}
        onJoin={(channelId) => joinChannelMutation.mutate(channelId)}
        onCreateChannel={() => setShowCreateChannelModal(true)}
      />

      {/* ── Chat Area (right pane) ──────────────────────────────── */}
      <div className="flex-1 min-w-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChannelId ?? "empty"}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            {activeChannelId ? (
              <>
                {/* Chat header */}
                <div
                  className="h-14 px-5 flex items-center justify-between shrink-0"
                  style={{ borderBottom: "1px solid var(--secondary)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
                      style={{ background: "rgba(37,99,235,0.15)" }}
                    >
                      {activeChannel?.type === "INCIDENT" ? (
                        <AlertTriangle
                          className="w-3.5 h-3.5"
                          style={{ color: "#FF9F0A" }}
                          aria-hidden="true"
                        />
                      ) : (
                        <Hash
                          className="w-3.5 h-3.5"
                          style={{ color: "#2563EB" }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-white truncate block"
                        style={{ fontSize: "14px", fontWeight: 600 }}
                      >
                        #{activeChannel?.name ?? activeChannelId}
                      </span>
                      {activeChannel?.type && (
                        <span
                          style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
                        >
                          {activeChannel.type === "INCIDENT" ? "Incident channel" : "Public channel"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {/* Connection status dot */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <AnimatePresence mode="wait">
                        {isConnecting ? (
                          <motion.div
                            key="connecting"
                            className="flex items-center gap-1.5"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                          >
                            <motion.div
                              className="w-2 h-2 rounded-full"
                              style={{ background: "#FFD60A" }}
                              animate={{ scale: [1, 1.4, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            <span
                              style={{ color: "#FFD60A", fontSize: "11px" }}
                            >
                              Connecting…
                            </span>
                          </motion.div>
                        ) : isConnected ? (
                          <motion.div
                            key="connected"
                            className="flex items-center gap-1.5"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                          >
                            <Wifi
                              className="w-3.5 h-3.5"
                              style={{ color: "#30D158" }}
                              aria-hidden="true"
                            />
                            <span
                              style={{ color: "#30D158", fontSize: "11px" }}
                            >
                              Live
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="offline"
                            className="flex items-center gap-1.5"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                          >
                            <WifiOff
                              className="w-3.5 h-3.5"
                              style={{ color: "#FF453A" }}
                              aria-hidden="true"
                            />
                            <span
                              style={{ color: "#FF453A", fontSize: "11px" }}
                            >
                              Offline
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--card)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      aria-label="Voice call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--card)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      aria-label="Video call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--card)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages area */}
                <div
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
                  onClick={() => { setEmojiPickerMessageId(null); setActionMenuMessageId(null); }}
                  aria-label="Messages"
                  aria-live="polite"
                >
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Loader2
                        className="w-8 h-8 animate-spin mb-3"
                        style={{ color: "#2563EB" }}
                      />
                      <p
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "13px",
                        }}
                      >
                        Loading message history…
                      </p>
                    </div>
                  ) : currentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                        style={{ background: "var(--card)" }}
                      >
                        <MessageSquare
                          className="w-7 h-7"
                          style={{ color: "var(--border)" }}
                          aria-hidden="true"
                        />
                      </div>
                      <h4 className="text-white font-medium mb-1">
                        No messages yet
                      </h4>
                      <p
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "13px",
                        }}
                      >
                        Start coordinating on this channel
                      </p>
                    </div>
                  ) : (
                    currentMessages.map((msg, idx) =>
                      renderMessage(msg, idx, currentMessages[idx - 1]),
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="px-5 py-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                        style={{ background: "var(--card)" }}
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--muted-foreground)" }}
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.7,
                              repeat: Infinity,
                              delay: i * 0.16,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                      <span
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "11px",
                        }}
                      >
                        {Array.from(typingUsers)
                          .map((id) => senderNameMapRef.current.get(id) || id.slice(0, 8))
                          .join(", ")}{" "}
                        is typing…
                      </span>
                    </div>
                  </div>
                )}

                {/* Reply banner */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring}
                      className="px-4 py-2 flex items-center gap-3 shrink-0 overflow-hidden"
                      style={{ borderTop: "1px solid var(--secondary)" }}
                    >
                      <Reply
                        className="w-4 h-4 shrink-0"
                        style={{ color: "#2563EB" }}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium"
                          style={{ color: "#2563EB" }}
                        >
                          Replying to{" "}
                          {replyingTo.sender_id === myId
                            ? "yourself"
                            : (replyingTo.sender_name || `${replyingTo.sender_id.slice(0, 8)}…`)}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {replyingTo.content}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded shrink-0 transition-colors"
                        style={{ color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#fff")
                        }
                        onMouseLeave={(e) =>
                        (e.currentTarget.style.color =
                          "var(--muted-foreground)")
                        }
                        aria-label="Cancel reply"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* @mention suggestion dropdown */}
                <AnimatePresence>
                  {mentionQuery !== null && mentionSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="mx-5 mb-1 rounded-xl overflow-hidden shadow-xl shrink-0"
                      style={{
                        background: "var(--secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {mentionSuggestions.map((name) => (
                        <button
                          key={name}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                          style={{ color: "var(--foreground)" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertMention(name);
                          }}
                        >
                          <span className="text-blue-400 font-medium">@{name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input area */}
                <div
                  className="px-5 py-3 shrink-0"
                  style={{ borderTop: "1px solid var(--secondary)" }}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-2 rounded-[16px]"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--secondary)",
                    }}
                  >
                    {/* Attachment buttons */}
                    <button
                      onClick={() => setShowVaultPicker(true)}
                      disabled={!isConnected}
                      className="cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-30"
                      aria-label="Attach file from vault"
                      title="Attach vault file"
                    >
                      <Paperclip
                        className="w-4 h-4"
                        style={{ color: showVaultPicker ? "#2563EB" : "var(--muted-foreground)" }}
                      />
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      disabled={!isConnected}
                      className="cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-30"
                      aria-label="Upload file to vault and share"
                      title="Upload file"
                    >
                      <Upload
                        className="w-4 h-4"
                        style={{ color: showUploadModal ? "#2563EB" : "var(--muted-foreground)" }}
                      />
                    </button>
                    <button
                      onClick={shareLocation}
                      disabled={!isConnected}
                      className="cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-30"
                      aria-label="Share location"
                      title="Share location"
                    >
                      <MapPin
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    </button>

                    {/* Divider */}
                    <div
                      className="w-px h-5"
                      style={{ background: "var(--border)" }}
                    />

                    {/* Text input */}
                    <input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      disabled={!isConnected}
                      placeholder={
                        isConnected ? "Type a message… or @beaconai <question>" : "Connecting…"
                      }
                      aria-label="Message input"
                      className="flex-1 bg-transparent text-white placeholder-[#4a4a52] focus:outline-none disabled:opacity-50"
                      style={{ fontSize: "13px" }}
                    />

                    {/* Emoji */}
                    <button
                      className="cursor-pointer transition-opacity hover:opacity-70"
                      aria-label="Insert emoji"
                    >
                      <Smile
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    </button>

                    {/* Send button */}
                    <motion.button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || !isConnected}
                      whileTap={
                        inputMessage.trim() && isConnected
                          ? { scale: 0.82 }
                          : {}
                      }
                      whileHover={
                        inputMessage.trim() && isConnected ? { scale: 1.1 } : {}
                      }
                      transition={springFast}
                      className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                      style={{
                        background:
                          inputMessage.trim() && isConnected
                            ? "#2563EB"
                            : "var(--secondary)",
                      }}
                      aria-label="Send message"
                    >
                      <Send
                        className="w-3.5 h-3.5"
                        style={{
                          color:
                            inputMessage.trim() && isConnected
                              ? "#fff"
                              : "var(--muted-foreground)",
                        }}
                      />
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {!isConnected && activeChannelId && !isConnecting && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={spring}
                        className="text-xs mt-2 flex items-center gap-1"
                        style={{ color: "#FF453A" }}
                        role="alert"
                      >
                        <WifiOff className="w-3 h-3" aria-hidden="true" />
                        Connection lost. Attempting to reconnect…
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Empty state - no channel selected */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: "var(--card)" }}
                >
                  <MessageSquare
                    className="w-8 h-8"
                    style={{ color: "var(--border)" }}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Select a Channel
                </h3>
                <p
                  style={{
                    color: "var(--muted-foreground)",
                    fontSize: "13px",
                    maxWidth: "320px",
                  }}
                >
                  Select a channel to start coordinating.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Vault file picker modal ── */}
      <AnimatePresence>
        {showVaultPicker && (
          <ChatVaultPicker
            onAttach={handleAttachVaultFile}
            onClose={() => setShowVaultPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Direct file upload modal ── */}
      <AnimatePresence>
        {showUploadModal && (
          <ChatUploadModal
            onAttach={(file) => {
              handleAttachVaultFile(file);
              setShowUploadModal(false);
            }}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Create Channel Modal ── */}
      {showCreateChannelModal && (
        <CreateChannelModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
        />
      )}
    </div>
  );
}
