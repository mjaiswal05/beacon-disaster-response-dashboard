import { useState, useEffect, useCallback } from "react";
import { X, User, FileText, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserPosts, getUserComments } from "../../services/socials.api";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { PostTypeBadge } from "../atoms/PostTypeBadge";
import { formatTimeAgo } from "../../utils/date.utils";
import { cn } from "../ui/utils";
import type { Post, Comment } from "../../types/socials.types";

interface UserProfileModalProps {
  userId: string | null;
  userName: string;
  onClose: () => void;
  onSelectPost: (post: Post) => void;
}

type ProfileTab = "posts" | "comments";

export function UserProfileModal({
  userId,
  userName,
  onClose,
  onSelectPost,
}: UserProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        getUserPosts(userId),
        getUserComments(userId),
      ]);
      setPosts(p);
      setComments(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [fetchData, userId]);

  return (
    <AnimatePresence>
      {userId && (
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
            className="w-full max-w-2xl rounded-[20px] overflow-hidden flex flex-col"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between shrink-0"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{userName}</p>
                  <p className="text-[11px] text-gray-500">
                    {posts.length} posts · {comments.length} comments
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
                aria-label="Close profile"
              >
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-3 shrink-0" style={{ borderBottom: "1px solid #1C1C1C" }}>
              <div className="flex gap-1">
                {(["posts", "comments"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                      tab === t
                        ? "text-white border-blue-500"
                        : "text-gray-400 border-transparent hover:text-gray-300",
                    )}
                  >
                    {t === "posts" ? (
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    {t === "posts" ? "Posts" : "Comments"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <p className="text-sm text-red-400 text-center py-8">{error}</p>
              ) : tab === "posts" ? (
                posts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No posts yet</p>
                ) : (
                  <div className="space-y-2">
                    {posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => { onSelectPost(post); onClose(); }}
                        className="w-full text-left p-3 rounded-xl hover:bg-gray-900 transition-colors group"
                        style={{ border: "1px solid #1C1C1C" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <PostTypeBadge type={post.type} />
                          <span className="text-[11px] text-gray-500">{formatTimeAgo(post.created_at)}</span>
                          <span className="text-[11px] text-gray-500 ml-auto">
                            ↑ {post.score} · {post.comment_count} comments
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors line-clamp-2">
                          {post.title}
                        </p>
                        {post.type === "text" && post.body && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.body}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded-xl"
                        style={{ background: "#141414", border: "1px solid #1C1C1C" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                          <span className="text-[11px] text-gray-500 ml-auto">↑ {comment.score}</span>
                        </div>
                        {comment.is_deleted ? (
                          <p className="text-xs text-gray-600 italic">[deleted]</p>
                        ) : (
                          <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                            {comment.body}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
