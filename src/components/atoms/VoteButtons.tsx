import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../ui/utils";

interface VoteButtonsProps {
  score: number;
  userVote: number;
  onVote: (value: 1 | -1) => void;
  isLocked?: boolean;
  orientation?: "vertical" | "horizontal";
}

export function VoteButtons({
  score,
  userVote,
  onVote,
  isLocked = false,
  orientation = "vertical",
}: VoteButtonsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      <button
        onClick={() => !isLocked && onVote(1)}
        disabled={isLocked}
        aria-label="Upvote"
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
          userVote === 1
            ? "bg-orange-500/20 text-orange-400"
            : "text-gray-400 hover:bg-gray-800 hover:text-orange-400",
          isLocked && "opacity-40 cursor-not-allowed",
        )}
      >
        <ArrowUp className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </button>

      <span
        className={cn(
          "text-xs font-semibold tabular-nums min-w-[20px] text-center",
          userVote === 1 && "text-orange-400",
          userVote === -1 && "text-blue-400",
          userVote === 0 && "text-gray-400",
        )}
      >
        {score}
      </span>

      <button
        onClick={() => !isLocked && onVote(-1)}
        disabled={isLocked}
        aria-label="Downvote"
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
          userVote === -1
            ? "bg-blue-500/20 text-blue-400"
            : "text-gray-400 hover:bg-gray-800 hover:text-blue-400",
          isLocked && "opacity-40 cursor-not-allowed",
        )}
      >
        <ArrowDown className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
