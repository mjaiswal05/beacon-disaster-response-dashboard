import { useState, useCallback, useEffect } from "react";
import { Search, X, ChevronDown, CheckCircle2, Plus, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PostCard } from "../molecules/PostCard";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { EmptyState } from "../atoms/EmptyState";
import { usePosts, usePostSearch } from "../../hooks/useSocials";
import type { Post, SortOrder } from "../../types/socials.types";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

interface SocialsPostFeedProps {
  communityId: string | null;
  communityName: string;
  currentUserId: string;
  onSelectPost: (post: Post) => void;
  onCreatePost: () => void;
  onAuthorClick: (authorId: string, authorName: string) => void;
  /** Increment to trigger an immediate refetch (e.g. after post creation). */
  refreshTick?: number;
}

export function SocialsPostFeed({
  communityId,
  communityName,
  currentUserId,
  onSelectPost,
  onCreatePost,
  onAuthorClick,
  refreshTick = 0,
}: SocialsPostFeedProps) {
  const [sort, setSort] = useState<SortOrder>("hot");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const { posts, isLoading, error, hasMore, loadMore, optimisticVote, refetch } = usePosts(communityId, sort);

  // Refetch when a new post is created
  useEffect(() => {
    if (refreshTick > 0) refetch();
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const { posts: searchResults, isLoading: searchLoading } = usePostSearch(searchQuery);

  const isSearching = searchQuery.trim().length > 0;
  const displayPosts = isSearching ? searchResults : posts;
  const loading = isSearching ? searchLoading : isLoading;

  const handleVote = useCallback(
    (postId: string, value: 1 | -1) => {
      optimisticVote(postId, currentUserId, value);
    },
    [optimisticVote, currentUserId],
  );

  if (!communityId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <Users className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">Select a community</h3>
        <p className="text-sm text-gray-400">Choose a community from the sidebar to see posts</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold">{communityName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Community posts and discussions</p>
          </div>
          <button
            onClick={onCreatePost}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #2563EB, #9333EA)" }}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Post
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 h-10 px-4 rounded-xl flex-1"
            style={{ background: "#141414", border: "1px solid #1C1C1C" }}
          >
            <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.5} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts…"
              className="bg-transparent text-white placeholder-gray-600 focus:outline-none w-full text-sm"
              aria-label="Search posts"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {!isSearching && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSortDropdown((v) => !v); }}
                className="flex items-center gap-2 h-10 px-4 rounded-xl hover:bg-gray-800 transition-colors"
                style={{ background: "#141414", border: "1px solid #1C1C1C", minWidth: "110px" }}
                aria-expanded={showSortDropdown}
                aria-label="Sort posts"
              >
                <span className="text-white text-sm flex-1 text-left">
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full right-0 mt-2 p-1.5 rounded-xl z-50 min-w-[130px]"
                    style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => { setSort(o.value); setShowSortDropdown(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        <span className={`text-sm flex-1 text-left ${sort === o.value ? "text-white font-semibold" : "text-gray-300"}`}>
                          {o.label}
                        </span>
                        {sort === o.value && <CheckCircle2 className="w-4 h-4 text-blue-500" strokeWidth={2} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Posts */}
        {loading && displayPosts.length === 0 ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading posts…" />
          </div>
        ) : error ? (
          <EmptyState title="Failed to load posts" description={error} />
        ) : displayPosts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description={isSearching ? "No posts match your search" : "Be the first to post in this community"}
          />
        ) : (
          <div className="space-y-3">
            {displayPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.25) }}
              >
                <PostCard
                  id={post.id}
                  authorId={post.author_id}
                  authorName={post.author_name}
                  title={post.title}
                  body={post.body}
                  type={post.type}
                  imageUrl={post.image_url}
                  linkUrl={post.link_url}
                  score={post.score}
                  userVote={post.user_vote}
                  commentCount={post.comment_count}
                  isPinned={post.is_pinned}
                  isLocked={post.is_locked}
                  createdAt={post.created_at}
                  onVote={(v) => handleVote(post.id, v)}
                  onSelect={() => onSelectPost(post)}
                  onAuthorClick={onAuthorClick}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Load more */}
        {!isSearching && hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #2563EB, #9333EA)" }}
            >
              Load more
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
