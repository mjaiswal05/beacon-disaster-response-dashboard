import { Bookmark, BookmarkCheck, Clock, ExternalLink, Newspaper, Share2 } from "lucide-react";
import { formatTimeAgo } from "../../utils/date.utils";
import { cn } from "../ui/utils";

interface ArticleCardProps {
  title: string;
  description: string;
  sourceName: string;
  author: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  categoryLabel: string;
  categoryColor: string;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onSelect: () => void;
}

export function ArticleCard({
  title,
  description,
  sourceName,
  author,
  url,
  imageUrl,
  publishedAt,
  categoryLabel,
  categoryColor,
  isSaved,
  onToggleSave,
  onShare,
  onSelect,
}: ArticleCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-2xl overflow-hidden cursor-pointer group",
        "bg-gray-900 border border-gray-800",
        "hover:border-blue-600 transition-colors",
      )}
      role="article"
    >
      {imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }}
          />
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-white text-xs font-semibold"
            style={{ background: categoryColor }}
          >
            {categoryLabel}
          </span>
          <div
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            <Clock className="w-3 h-3 text-white" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-white text-[11px] font-medium">{formatTimeAgo(publishedAt)}</span>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs text-gray-400 font-medium truncate">{sourceName}</span>
          {author && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400 truncate">{author}</span>
            </>
          )}
        </div>

        <h3
          className="text-white text-base font-semibold mb-2 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2"
        >
          {title}
        </h3>

        <p className="text-sm text-gray-400 leading-normal mb-3 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label={isSaved ? "Remove from saved" : "Save article"}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-yellow-400" strokeWidth={1.5} />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            )}
            <span className={cn("text-xs font-medium", isSaved ? "text-yellow-400" : "text-gray-400")}>
              {isSaved ? "Saved" : "Save"}
            </span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Share article"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <span className="text-xs text-gray-400 font-medium">Share</span>
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors ml-auto"
            aria-label="Read full article (opens in new tab)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
            <span className="text-xs text-blue-500 font-medium">Read More</span>
          </a>
        </div>
      </div>
    </div>
  );
}
