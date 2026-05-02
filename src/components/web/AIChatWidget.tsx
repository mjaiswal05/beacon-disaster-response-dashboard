import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Send,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { BotActionButton } from "../atoms/BotActionButton";
import { authService } from "../../services/auth";
import {
  continueConversation,
  getConversationHistory,
  startConversation,
} from "../../services/supportBot";
import type { BotAction } from "../../types/supportBot.types";
import { springGentle } from "../../utils/animations";

// Types

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  actions?: BotAction[];
}

// Constants

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Beacon AI Terminal ready. Ask me about emergency procedures, disaster response protocols, or safety guidelines.",
  timestamp: new Date(),
};

const suggestedPrompts = [
  "Flood response protocol",
  "Earthquake preparedness",
  "Evacuation procedures",
  "First aid basics",
];

const MIN_HEIGHT = 180;
const MAX_HEIGHT = 700;
const DEFAULT_HEIGHT = 360;

export function AIChatWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const botConversationIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isExpanded]);

  // Load conversation history
  const loadHistory = useCallback(async (userId: string) => {
    setIsHistoryLoading(true);
    try {
      const history = await getConversationHistory(userId);
      if (history.messages.length > 0) {
        const historyMessages: Message[] = history.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(historyMessages);
      }
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user?.id) {
      loadHistory(user.id);
    }
  }, [loadHistory]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userId = authService.getCurrentUser()?.id ?? "anonymous";
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const botReply = botConversationIdRef.current
        ? await continueConversation(
          userId,
          botConversationIdRef.current,
          userMessage.content,
        )
        : await startConversation(userId, userMessage.content);

      // Persist conversation ID for subsequent messages
      botConversationIdRef.current = botReply.conversation_id;

      const assistantMessage: Message = {
        id: botReply.message_id || `assistant-${Date.now()}`,
        role: "assistant",
        content: botReply.response,
        timestamp: new Date(),
        actions: botReply.actions ?? [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsConnected(true);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "error",
        content: msg.includes("Session expired")
          ? "Session expired. Please log in again."
          : `Error: ${msg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    botConversationIdRef.current = null;
    setMessages([
      {
        ...WELCOME_MESSAGE,
        id: "welcome",
        content: "Terminal cleared. How can I help?",
        timestamp: new Date(),
      },
    ]);
  };

  // Drag-to-resize: drag up to grow, drag down to shrink
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY;
    const startHeight = terminalHeight;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    const handleMouseMove = (evt: MouseEvent) => {
      const delta = startY - evt.clientY;
      setTerminalHeight(
        Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta)),
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const showSuggestions =
    messages.length <= 1 && !isLoading && !isHistoryLoading;

  return (
    <div className="flex-shrink-0 z-50">
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="terminal-expanded"
            className="flex flex-col overflow-hidden font-mono-terminal"
            style={{
              background: "#0A0A0A",
              borderTop: "1px solid rgba(37,99,235,0.3)",
              boxShadow: "0 -4px 24px rgba(37,99,235,0.08)",
            }}
            initial={{ height: 0 }}
            animate={{ height: terminalHeight }}
            exit={{ height: 0 }}
            transition={isDragging ? { duration: 0 } : springGentle}
          >
            {/* Drag handle - drag up/down to resize */}
            <div
              className="h-3.5 flex items-center justify-center flex-shrink-0 cursor-ns-resize group"
              style={{ borderBottom: "1px solid #1C1C1C" }}
              onMouseDown={handleResizeStart}
              role="separator"
              aria-label="Drag to resize terminal"
              aria-orientation="horizontal"
            >
              <div
                className="w-10 rounded-full transition-colors group-hover:bg-blue-600/50"
                style={{ height: "3px", background: "#27272A" }}
              />
            </div>

            {/* Terminal header */}
            <div
              className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-2">
                {/* macOS traffic light dots - red=close, yellow=minimize, green=maximize */}
                <div className="flex items-center gap-1.5">
                  <button
                    className="w-3 h-3 rounded-full transition-opacity hover:opacity-75 focus:outline-none"
                    style={{ background: "#FF453A" }}
                    onClick={() => setIsExpanded(false)}
                    aria-label="Close terminal"
                  />
                  <button
                    className="w-3 h-3 rounded-full transition-opacity hover:opacity-75 focus:outline-none"
                    style={{ background: "#FFD60A" }}
                    onClick={() => setIsExpanded(false)}
                    aria-label="Minimize terminal"
                  />
                  <button
                    className="w-3 h-3 rounded-full transition-opacity hover:opacity-75 focus:outline-none"
                    style={{ background: "#32D74B" }}
                    onClick={() => setTerminalHeight(MAX_HEIGHT)}
                    aria-label="Maximize terminal"
                  />
                </div>
                <span style={{ color: "#8A8F98", fontSize: "12px" }}>
                  beacon-ai-terminal
                </span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    background: isConnected
                      ? "rgba(50,215,75,0.15)"
                      : "rgba(255,69,58,0.15)",
                    color: isConnected ? "#32D74B" : "#FF453A",
                    fontSize: "10px",
                  }}
                >
                  {isHistoryLoading
                    ? "loading"
                    : isConnected === null
                      ? "init"
                      : isConnected
                        ? "connected"
                        : "offline"}
                </span>
              </div>
              <button
                onClick={clearChat}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                aria-label="Clear terminal"
              >
                <Trash2
                  className="w-3.5 h-3.5"
                  style={{ color: "#8A8F98" }}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Messages - flex-1 + min-h-0 makes this fill remaining space correctly */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {isHistoryLoading ? (
                <div
                  className="flex items-center gap-2"
                  style={{ color: "#8A8F98" }}
                >
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "#2563EB" }}
                  />
                  <span style={{ fontSize: "13px" }}>Loading history...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.role === "user" ? (
                        <div className="flex items-start gap-2">
                          <ChevronRight
                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                            style={{ color: "#2563EB" }}
                            aria-hidden="true"
                          />
                          <p
                            style={{
                              color: "#FFFFFF",
                              fontSize: "13px",
                              lineHeight: 1.5,
                            }}
                          >
                            {message.content}
                          </p>
                        </div>
                      ) : message.role === "error" ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle
                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                            style={{ color: "#FF453A" }}
                            aria-hidden="true"
                          />
                          <p
                            style={{
                              color: "#FF453A",
                              fontSize: "13px",
                              lineHeight: 1.5,
                            }}
                          >
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <Sparkles
                            className="w-3.5 h-3.5 mt-0.5 shrink-0"
                            style={{ color: "#32D74B" }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeSanitize]}
                              components={{
                                p: ({ children }) => (
                                  <p style={{ color: "#A3E635", fontSize: "13px", lineHeight: 1.5, margin: "0 0 4px 0" }}>
                                    {children}
                                  </p>
                                ),
                                strong: ({ children }) => (
                                  <strong style={{ color: "#FFFFFF", fontWeight: 600 }}>{children}</strong>
                                ),
                                h2: ({ children }) => (
                                  <h2 style={{ color: "#2563EB", fontSize: "13px", fontWeight: 700, margin: "6px 0 2px 0" }}>
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 style={{ color: "#2563EB", fontSize: "12px", fontWeight: 600, margin: "4px 0 2px 0" }}>
                                    {children}
                                  </h3>
                                ),
                                ul: ({ children }) => (
                                  <ul style={{ color: "#A3E635", fontSize: "13px", paddingLeft: "16px", margin: "2px 0" }}>
                                    {children}
                                  </ul>
                                ),
                                li: ({ children }) => (
                                  <li style={{ color: "#A3E635", fontSize: "13px", lineHeight: 1.5 }}>{children}</li>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                            {message.actions && message.actions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {message.actions.map((action, i) => (
                                  <BotActionButton key={i} action={action} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-2">
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        style={{ color: "#32D74B" }}
                      />
                      <span style={{ color: "#8A8F98", fontSize: "13px" }}>
                        Processing...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Suggestions */}
            {showSuggestions && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(prompt);
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 rounded-md transition-colors text-xs hover:bg-white/5"
                    style={{
                      background: "#1C1C1C",
                      color: "#8A8F98",
                      border: "1px solid #27272A",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
              style={{ borderTop: "1px solid #1C1C1C" }}
            >
              <ChevronRight
                className="w-4 h-4 shrink-0"
                style={{ color: "#2563EB" }}
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a command..."
                disabled={isLoading || isHistoryLoading}
                className="flex-1 bg-transparent focus:outline-none font-mono-terminal disabled:opacity-50"
                style={{ color: "#FFFFFF", fontSize: "13px" }}
                aria-label="Terminal input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isHistoryLoading}
                className="p-1.5 rounded-md transition-colors hover:bg-white/10 disabled:opacity-30"
                aria-label="Send message"
              >
                <Send
                  className="w-4 h-4"
                  style={{ color: "#2563EB" }}
                  aria-hidden="true"
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed bar - always visible, click to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-10 w-full flex items-center justify-between px-4 transition-colors hover:bg-white/5"
        style={{
          background: "#0A0A0A",
          borderTop: "1px solid rgba(37,99,235,0.2)",
        }}
        aria-label={isExpanded ? "Collapse AI terminal" : "Expand AI terminal"}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <Terminal
            className="w-4 h-4"
            style={{ color: "#2563EB" }}
            aria-hidden="true"
          />
          <span
            className="font-mono-terminal"
            style={{ color: "#8A8F98", fontSize: "12px" }}
          >
            Beacon AI Terminal
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isConnected
                ? "#32D74B"
                : isConnected === null
                  ? "#8A8F98"
                  : "#FF453A",
              boxShadow: isConnected ? "0 0 6px rgba(50,215,75,0.5)" : "none",
            }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono-terminal"
            style={{ color: "#27272A", fontSize: "11px" }}
          >
            {messages.length - 1} msg{messages.length - 1 !== 1 ? "s" : ""}
          </span>
          {isExpanded ? (
            <ChevronDown
              className="w-4 h-4"
              style={{ color: "#8A8F98" }}
              aria-hidden="true"
            />
          ) : (
            <ChevronUp
              className="w-4 h-4"
              style={{ color: "#8A8F98" }}
              aria-hidden="true"
            />
          )}
        </div>
      </button>
    </div>
  );
}
