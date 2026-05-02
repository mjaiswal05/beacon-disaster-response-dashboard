import { useState, useCallback, useEffect } from "react";
import { X, MessageSquare, Send, Pin, Lock, Trash2, ShieldAlert } from "lucide-react";
import { LinkPreview } from "../atoms/LinkPreview";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { VoteButtons } from "../atoms/VoteButtons";
import { PostTypeBadge } from "../atoms/PostTypeBadge";
import { CommentItem } from "../molecules/CommentItem";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { useComments } from "../../hooks/useSocials";
import { votePost, addComment, deleteComment, deletePost, pinPost, lockPost, removePost } from "../../services/socials.api";
import { formatTimeAgo } from "../../utils/date.utils";
import type { Post } from "../../types/socials.types";

interface PostDetailModalProps {
  post: Post | null;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onPostVote: (postId: string, value: 1 | -1) => void;
  onPostDeleted: (postId: string) => void;
  onAuthorClick: (authorId: string, authorName: string) => void;
}

export function PostDetailModal({
  post,
  currentUserId,
  currentUserName,
  onClose,
  onPostVote,
  onPostDeleted,
  onAuthorClick,
}: PostDetailModalProps) {
  const [commentBody, setCommentBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local copy of post so pin/lock/remove update the modal display immediately
  const [localPost, setLocalPost] = useState<Post | null>(post);
  useEffect(() => { setLocalPost(post); }, [post]);

  const { comments, isLoading, refetch, optimisticVoteComment, setComments } = useComments(
    post?.id ?? null,
  );

  const handleSubmitComment = useCallback(async () => {
    if (!post || !commentBody.trim()) return;
    setIsSubmitting(true);
    try {
      const newComment = await addComment(post.id, {
        author_id: currentUserId,
        author_name: currentUserName,
        body: commentBody.trim(),
        parent_comment_id: replyingTo?.id,
      });
      setCommentBody("");
      setReplyingTo(null);
      // Append top-level comment or refetch for nested
      if (!replyingTo) {
        setComments((prev) => [...prev, { ...newComment, children: [] }]);
      } else {
        refetch();
      }
      toast.success("Comment added");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [post, commentBody, currentUserId, currentUserName, replyingTo, setComments, refetch]);

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteComment(commentId, currentUserId);
        refetch();
        toast.success("Comment deleted");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to delete comment");
      }
    },
    [currentUserId, refetch],
  );

  const handleDeletePost = useCallback(async () => {
    if (!post) return;
    try {
      await deletePost(post.id, currentUserId);
      toast.success("Post deleted");
      onPostDeleted(post.id);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete post");
    }
  }, [post, currentUserId, onPostDeleted, onClose]);

  const handlePin = useCallback(async () => {
    if (!localPost) return;
    const next = !localPost.is_pinned;
    setLocalPost((p) => p ? { ...p, is_pinned: next } : p);
    try {
      await pinPost(localPost.id, currentUserId, next);
      toast.success(next ? "Post pinned" : "Post unpinned");
    } catch (e: unknown) {
      setLocalPost((p) => p ? { ...p, is_pinned: !next } : p);
      toast.error(e instanceof Error ? e.message : "Failed to pin post");
    }
  }, [localPost, currentUserId]);

  const handleLock = useCallback(async () => {
    if (!localPost) return;
    const next = !localPost.is_locked;
    setLocalPost((p) => p ? { ...p, is_locked: next } : p);
    try {
      await lockPost(localPost.id, currentUserId, next);
      toast.success(next ? "Post locked" : "Post unlocked");
    } catch (e: unknown) {
      setLocalPost((p) => p ? { ...p, is_locked: !next } : p);
      toast.error(e instanceof Error ? e.message : "Failed to lock post");
    }
  }, [localPost, currentUserId]);

  const handleRemovePost = useCallback(async () => {
    if (!post) return;
    try {
      await removePost(post.id, currentUserId);
      toast.success("Post removed");
      onPostDeleted(post.id);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove post");
    }
  }, [post, currentUserId, onPostDeleted, onClose]);

  const isOwner = post?.author_id === currentUserId;

  if (!localPost) return null;

  return (
    <AnimatePresence>
      {post && (
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
            className="w-full max-w-3xl rounded-[20px] overflow-hidden flex flex-col"
            style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="p-4 flex items-center justify-between shrink-0"
              style={{ borderBottom: "1px solid #1C1C1C" }}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                <span className="text-white text-base font-semibold">Post</span>
                <PostTypeBadge type={localPost.type} />
              </div>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    {/* Pin toggle */}
                    <button
                      onClick={handlePin}
                      className={cn(
                        "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                        localPost.is_pinned
                          ? "bg-blue-500/20 text-blue-400"
                          : "hover:bg-gray-900 text-gray-400",
                      )}
                      aria-label={localPost.is_pinned ? "Unpin post" : "Pin post"}
                      title={localPost.is_pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    {/* Lock toggle */}
                    <button
                      onClick={handleLock}
                      className={cn(
                        "w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors",
                        localPost.is_locked
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "hover:bg-gray-900 text-gray-400",
                      )}
                      aria-label={localPost.is_locked ? "Unlock post" : "Lock post"}
                      title={localPost.is_locked ? "Unlock" : "Lock"}
                    >
                      <Lock className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    {/* Remove (mod action) */}
                    <button
                      onClick={handleRemovePost}
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-orange-500/10 text-gray-400 hover:text-orange-400 transition-colors"
                      aria-label="Remove post"
                      title="Remove (mod)"
                    >
                      <ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    {/* Delete (author) */}
                    <button
                      onClick={handleDeletePost}
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-red-500/10 transition-colors"
                      aria-label="Delete post"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
                  aria-label="Close post"
                >
                  <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Post body */}
              <div className="p-6" style={{ borderBottom: "1px solid #1C1C1C" }}>
                <div className="flex gap-4">
                  <div onClick={(e) => e.stopPropagation()}>
                    <VoteButtons
                      score={localPost.score}
                      userVote={localPost.user_vote}
                      onVote={(v) => onPostVote(localPost.id, v)}
                      isLocked={localPost.is_locked}
                      orientation="vertical"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {localPost.is_pinned && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      {localPost.is_locked && (
                        <span className="flex items-center gap-1 text-[11px] text-yellow-400 font-medium">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {localPost.author_name} • {formatTimeAgo(localPost.created_at)}
                      </span>
                    </div>
                    <h2 className="text-white text-xl font-semibold leading-snug mb-3">
                      {localPost.title}
                    </h2>
                    {localPost.type === "text" && localPost.body && (
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {localPost.body}
                      </p>
                    )}
                    {localPost.type === "link" && localPost.link_url && (
                      <LinkPreview url={localPost.link_url} />
                    )}
                    {localPost.type === "image" && localPost.image_url && (
                      <img
                        src={localPost.image_url}
                        alt="Post image"
                        className="rounded-xl max-h-96 object-cover w-full mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="p-6">
                <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  {localPost.comment_count} Comments
                </h3>

                {/* Comment input */}
                {!localPost.is_locked && (
                  <div
                    className="rounded-xl p-3 mb-5"
                    style={{ background: "#141414", border: "1px solid #1C1C1C" }}
                  >
                    {replyingTo && (
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs text-blue-400">
                          Replying to @{replyingTo.name}
                        </span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write a comment…"
                      rows={2}
                      className="w-full bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none resize-none"
                      aria-label="Write a comment"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSubmitComment}
                        disabled={!commentBody.trim() || isSubmitting}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-3 h-3" strokeWidth={2} />
                        {isSubmitting ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        currentUserId={currentUserId}
                        onVote={(id, v) => optimisticVoteComment(id, currentUserId, v)}
                        onDelete={handleDeleteComment}
                        onReply={(id, name) => setReplyingTo({ id, name })}
                        onAuthorClick={onAuthorClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
