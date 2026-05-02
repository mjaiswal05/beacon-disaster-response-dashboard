import { MessageSquare, Pin, Lock, User } from "lucide-react";
import { cn } from "../ui/utils";
import { formatTimeAgo } from "../../utils/date.utils";
import { VoteButtons } from "../atoms/VoteButtons";
import { PostTypeBadge } from "../atoms/PostTypeBadge";
import { LinkPreview } from "../atoms/LinkPreview";
import type { PostType } from "../../types/socials.types";

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  type: PostType;
  imageUrl: string;
  linkUrl: string;
  score: number;
  userVote: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  onVote: (value: 1 | -1) => void;
  onSelect: () => void;
  onAuthorClick: (authorId: string, authorName: string) => void;
}

export function PostCard({
  authorId,
  authorName,
  title,
  body,
  type,
  imageUrl,
  linkUrl,
  score,
  userVote,
  commentCount,
  isPinned,
  isLocked,
  createdAt,
  onVote,
  onSelect,
  onAuthorClick,
}: PostCardProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl cursor-pointer group",
        "bg-gray-900 border border-gray-800",
        "hover:border-gray-700 transition-colors",
        isPinned && "border-l-2 border-l-blue-600",
      )}
      onClick={onSelect}
      role="article"
    >
      {/* Vote column */}
      <div onClick={(e) => e.stopPropagation()}>
        <VoteButtons
          score={score}
          userVote={userVote}
          onVote={onVote}
          isLocked={isLocked}
          orientation="vertical"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {isPinned && (
            <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
              <Pin className="w-3 h-3" aria-hidden="true" />
              Pinned
            </span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 text-[11px] text-yellow-400 font-medium">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Locked
            </span>
          )}
          <PostTypeBadge type={type} />
          <button
            onClick={(e) => { e.stopPropagation(); onAuthorClick(authorId, authorName); }}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-400 transition-colors"
            aria-label={`View ${authorName}'s profile`}
          >
            <User className="w-3 h-3" aria-hidden="true" />
            {authorName}
          </button>
          <span className="text-[11px] text-gray-400">{formatTimeAgo(createdAt)}</span>
        </div>

        <h3 className="text-white text-sm font-semibold leading-snug mb-1.5 group-hover:text-blue-400 transition-colors line-clamp-2">
          {title}
        </h3>

        {type === "text" && body && (
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-2">{body}</p>
        )}

        {type === "link" && linkUrl && (
          <div onClick={(e) => e.stopPropagation()}>
            <LinkPreview url={linkUrl} compact />
          </div>
        )}

        {type === "image" && imageUrl && (
          <img
            src={imageUrl}
            alt="Post image"
            className="mt-2 mb-2 rounded-lg max-h-48 object-cover w-full"
          />
        )}

        <div className="flex items-center gap-1 mt-1">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs text-gray-400">{commentCount} comments</span>
        </div>
      </div>
    </div>
  );
}
