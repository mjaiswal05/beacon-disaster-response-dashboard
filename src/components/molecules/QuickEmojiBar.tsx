import { cn } from "../ui/utils";
import { QUICK_EMOJIS } from "../../constants/constants";

interface QuickEmojiBarProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function QuickEmojiBar({ onSelect, className }: QuickEmojiBarProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-1 rounded hover:bg-gray-700 transition-colors text-base"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
