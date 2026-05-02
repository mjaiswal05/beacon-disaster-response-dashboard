import { X, Newspaper, User, Calendar, Bookmark, BookmarkCheck, Share2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import type { Article } from "../../types/news.types";

const NEWS_CATEGORY_META: Record<string, { name: string; color: string }> = {
  "": { name: "News", color: "#2563EB" },
  general: { name: "General", color: "#6B7280" },
  technology: { name: "Technology", color: "#00C7BE" },
  health: { name: "Health & Safety", color: "#FF9F0A" },
  business: { name: "Business", color: "#9333EA" },
  science: { name: "Science", color: "#10B981" },
  sports: { name: "Sports", color: "#EF4444" },
};

interface NewsArticleModalProps {
  article: Article | null;
  categoryKey: string;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}

export function NewsArticleModal({
  article,
  categoryKey,
  isSaved,
  onToggleSave,
  onClose,
}: NewsArticleModalProps) {
  const catMeta = NEWS_CATEGORY_META[categoryKey] ?? NEWS_CATEGORY_META[""];

  const handleShare = () => {
    if (article) {
      navigator.clipboard.writeText(article.url).catch(() => {});
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl rounded-[20px] overflow-hidden flex flex-col"
            style={{
              background: "#0A0A0A",
              border: "1px solid #1C1C1C",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="p-4 flex items-center justify-between shrink-0"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-3">
                <Newspaper className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                <span className="text-white text-base font-semibold">Article Details</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
                aria-label="Close article"
              >
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">
              {article.image_url && (
                <div
                  className="rounded-2xl overflow-hidden mb-6"
                  style={{ border: "1px solid #1C1C1C" }}
                >
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-80 object-cover"
                  />
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center flex-wrap gap-3 mb-4">
                <span
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                  style={{ background: catMeta.color }}
                >
                  {catMeta.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <Newspaper className="w-4 h-4 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-[13px] text-gray-400">{article.source.name}</span>
                </div>
                {article.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-[13px] text-gray-400">{article.author}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-[13px] text-gray-400">
                    {new Date(article.published_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <h1
                className="text-white mb-4 font-semibold leading-tight"
                style={{ fontSize: "28px", lineHeight: 1.3 }}
              >
                {article.title}
              </h1>

              <p className="text-gray-300 text-lg font-medium leading-relaxed mb-6">
                {article.description}
              </p>

              {article.content && (
                <p className="text-gray-400 text-base" style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {article.content}
                </p>
              )}

              {/* Actions */}
              <div
                className="flex items-center gap-3 mt-8 pt-6"
                style={{ borderTop: "1px solid #1C1C1C" }}
              >
                <button
                  onClick={onToggleSave}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] hover:bg-gray-900 transition-colors"
                  style={{ border: "1px solid #1C1C1C" }}
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />
                  ) : (
                    <Bookmark className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  )}
                  <span
                    className={cn("text-sm font-medium", isSaved ? "text-yellow-400" : "text-white")}
                  >
                    {isSaved ? "Saved" : "Save Article"}
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] hover:bg-gray-900 transition-colors"
                  style={{ border: "1px solid #1C1C1C" }}
                >
                  <Share2 className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  <span className="text-sm text-white font-medium">Share</span>
                </button>

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-white font-semibold hover:opacity-90 transition-opacity ml-auto text-sm"
                  style={{ background: "linear-gradient(135deg, #2563EB, #9333EA)" }}
                >
                  <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                  Read Full Article
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
