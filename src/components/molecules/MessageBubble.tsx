import { cn } from "../ui/utils";
import { formatTimeAgo } from "../../utils/date.utils";

interface MessageBubbleProps {
  content: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
  reactions?: { emoji: string; count: number; hasReacted: boolean }[];
  onReact?: (emoji: string) => void;
}

export function MessageBubble({
  content,
  senderName,
  timestamp,
  isOwn,
  reactions,
  onReact,
}: MessageBubbleProps) {
  return (
    <div
      className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}
    >
      {!isOwn && (
        <span className="text-xs text-muted-foreground px-1">{senderName}</span>
      )}
      <div
        className={cn(
          "max-w-xs rounded-lg px-4 py-2 text-sm",
          isOwn ? "bg-blue-600 text-white" : "bg-secondary text-foreground",
        )}
      >
        {content}
      </div>
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(timestamp)}
        </span>
        {reactions && reactions.length > 0 && (
          <div className="flex gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact?.(r.emoji)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                  r.hasReacted
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                    : "bg-secondary border-border text-muted-foreground hover:bg-gray-700",
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
