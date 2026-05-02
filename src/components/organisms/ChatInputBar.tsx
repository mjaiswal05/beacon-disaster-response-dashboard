import { useState, useRef } from "react";
import { Send, Smile } from "lucide-react";
import { cn } from "../ui/utils";

interface ChatInputBarProps {
  onSend: (message: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onTyping,
  disabled,
  placeholder = "Type a message…",
}: ChatInputBarProps) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card p-4 flex items-end gap-3"
    >
      <textarea
        ref={inputRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none",
          "px-4 py-2.5 rounded-lg",
          "bg-secondary border border-border text-foreground text-sm",
          "placeholder-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          "disabled:opacity-50",
        )}
        aria-label="Message input"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className={cn(
          "p-2.5 rounded-lg transition-colors",
          message.trim()
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-secondary text-muted-foreground",
        )}
        aria-label="Send message"
      >
        <Send className="w-5 h-5" aria-hidden="true" />
      </button>
    </form>
  );
}
