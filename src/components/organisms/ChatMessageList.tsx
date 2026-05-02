import { useRef, useEffect } from "react";
import { MessageBubble } from "../molecules/MessageBubble";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { EmptyState } from "../atoms/EmptyState";

interface ChatMessage {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  reactions?: { emoji: string; count: number; hasReacted: boolean }[];
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onReact?: (messageId: string, emoji: string) => void;
}

export function ChatMessageList({
  messages,
  isLoading,
  onReact,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) return <LoadingSpinner label="Loading messages…" />;

  if (messages.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Send a message to start the conversation."
      />
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
      role="log"
      aria-label="Chat messages"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          content={msg.content}
          senderName={msg.senderName}
          timestamp={msg.timestamp}
          isOwn={msg.isOwn}
          reactions={msg.reactions}
          onReact={onReact ? (emoji) => onReact(msg.id, emoji) : undefined}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
