import { useState } from "react";
import { Trash2, Reply, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../ui/utils";
import { formatTimeAgo } from "../../utils/date.utils";
import { VoteButtons } from "../atoms/VoteButtons";
import type { Comment } from "../../types/socials.types";

const DEPTH_COLORS = [
  "#374151", // gray-700
  "#1e3a5f", // blue-800
  "#3b1f5e", // purple-800
  "#4a1942", // pink-800
  "#431407", // orange-800
  "#422006", // yellow-800
];

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onVote: (commentId: string, value: 1 | -1) => void;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, authorName: string) => void;
  onAuthorClick: (authorId: string, authorName: string) => void;
}

function countDescendants(comment: Comment): number {
  return comment.children.reduce(
    (sum, c) => sum + 1 + countDescendants(c),
    0,
  );
}

export function CommentItem({
  comment,
  currentUserId,
  onVote,
  onDelete,
  onReply,
  onAuthorClick,
}: CommentItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const depthIdx = Math.min(comment.depth, DEPTH_COLORS.length - 1);
  const threadColor = DEPTH_COLORS[depthIdx];
  const isOwner = comment.author_id === currentUserId;
  const hasChildren = comment.children.length > 0;
  const descendantCount = hasChildren ? countDescendants(comment) : 0;

  return (
    <div className={cn("flex gap-2", comment.depth > 0 && "ml-6")}>
      {/* Clickable thread line */}
      <button
        onClick={() => hasChildren && setIsCollapsed((v) => !v)}
        className={cn(
          "w-0.5 shrink-0 rounded-full mt-1 self-stretch transition-opacity",
          hasChildren ? "cursor-pointer hover:opacity-50" : "cursor-default",
        )}
        style={{ background: threadColor }}
        aria-label={isCollapsed ? "Expand thread" : "Collapse thread"}
        disabled={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      />

      <div className="flex-1 min-w-0 pb-3">
        {/* Header row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {hasChildren && (
            <button
              onClick={() => setIsCollapsed((v) => !v)}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors shrink-0"
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed
                ? <ChevronRight className="w-3 h-3" strokeWidth={2} />
                : <ChevronDown className="w-3 h-3" strokeWidth={2} />
              }
            </button>
          )}
          <button
            onClick={() => onAuthorClick(comment.author_id, comment.author_name)}
            className="text-xs font-semibold text-gray-300 hover:text-blue-400 transition-colors"
            aria-label={`View ${comment.author_name}'s profile`}
          >
            {comment.author_name}
          </button>
          <span className="text-[11px] text-gray-500">{formatTimeAgo(comment.created_at)}</span>
          {isCollapsed && descendantCount > 0 && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors ml-1"
            >
              {descendantCount} {descendantCount === 1 ? "reply" : "replies"} hidden
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              {comment.is_deleted ? (
                <p className="text-xs text-gray-600 italic">[deleted]</p>
              ) : (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {comment.body}
                </p>
              )}

              {!comment.is_deleted && (
                <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                  <VoteButtons
                    score={comment.score}
                    userVote={comment.user_vote}
                    onVote={(v) => onVote(comment.id, v)}
                    orientation="horizontal"
                  />
                  <button
                    onClick={() => onReply(comment.id, comment.author_name)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:bg-gray-800 transition-colors"
                    aria-label={`Reply to ${comment.author_name}`}
                  >
                    <Reply className="w-3 h-3" strokeWidth={2} />
                    Reply
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2} />
                      Delete
                    </button>
                  )}
                </div>
              )}

              {hasChildren && (
                <div className="mt-3 space-y-3">
                  {comment.children.map((child) => (
                    <CommentItem
                      key={child.id}
                      comment={child}
                      currentUserId={currentUserId}
                      onVote={onVote}
                      onDelete={onDelete}
                      onReply={onReply}
                      onAuthorClick={onAuthorClick}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
