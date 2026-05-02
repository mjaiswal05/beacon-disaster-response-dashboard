import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useCommunities } from "../../hooks/useSocials";
import { joinCommunity, leaveCommunity, getPost } from "../../services/socials.api";
import { SocialsSidebar, type SocialsMode } from "../organisms/SocialsSidebar";
import { SocialsNewsFeed } from "../organisms/SocialsNewsFeed";
import { SocialsPostFeed } from "../organisms/SocialsPostFeed";
import { NewsArticleModal } from "../organisms/NewsArticleModal";
import { PostDetailModal } from "../organisms/PostDetailModal";
import { CreatePostModal } from "../organisms/CreatePostModal";
import { CreateCommunityModal } from "../organisms/CreateCommunityModal";
import { UserProfileModal } from "../organisms/UserProfileModal";
import type { NewsCategory } from "../../types/news.types";
import type { Article } from "../../types/news.types";
import type { Post } from "../../types/socials.types";

export function SocialsPage() {
  usePageTitle("Socials & News");

  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const currentUserName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username
      : "";

  // ── URL-synced state ────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = (searchParams.get("mode") as SocialsMode) ?? "news";
  const newsCategory = (searchParams.get("cat") ?? "") as NewsCategory | "";
  const selectedCommunityId = searchParams.get("cid");
  const postId = searchParams.get("pid");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value); else next.delete(key);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const setMode = useCallback((m: SocialsMode) => setParam("mode", m), [setParam]);
  const setNewsCategory = useCallback((cat: NewsCategory | "") => setParam("cat", cat || null), [setParam]);

  const handleSelectCommunity = useCallback((id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("cid", id);
      next.set("mode", "communities");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ── Communities data ───────────────────────────────────────────────────────
  const { communities, isLoading: communitiesLoading, refetch: refetchCommunities } = useCommunities();
  const selectedCommunity = communities.find((c) => c.id === selectedCommunityId) ?? null;

  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const seeded = communities.filter((c) => c.is_member).map((c) => c.id);
    if (seeded.length > 0) setJoinedCommunityIds(new Set(seeded));
  }, [communities]);

  const handleJoin = useCallback(async (communityId: string) => {
    setJoinedCommunityIds((prev) => new Set([...prev, communityId]));
    try {
      await joinCommunity(communityId, currentUserId);
      toast.success("Joined community");
    } catch (e: unknown) {
      setJoinedCommunityIds((prev) => { const n = new Set(prev); n.delete(communityId); return n; });
      toast.error(e instanceof Error ? e.message : "Failed to join");
    }
  }, [currentUserId]);

  const handleLeave = useCallback(async (communityId: string) => {
    setJoinedCommunityIds((prev) => { const n = new Set(prev); n.delete(communityId); return n; });
    try {
      await leaveCommunity(communityId, currentUserId);
      toast.success("Left community");
    } catch (e: unknown) {
      setJoinedCommunityIds((prev) => new Set([...prev, communityId]));
      toast.error(e instanceof Error ? e.message : "Failed to leave");
    }
  }, [currentUserId]);

  // ── News saved articles ────────────────────────────────────────────────────
  const [savedArticleUrls, setSavedArticleUrls] = useState<Set<string>>(new Set());
  const handleToggleSave = useCallback((url: string) => {
    setSavedArticleUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) { next.delete(url); toast.success("Removed from saved"); }
      else { next.add(url); toast.success("Article saved"); }
      return next;
    });
  }, []);

  // ── Article detail modal ───────────────────────────────────────────────────
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // ── Post detail modal (URL-synced) ─────────────────────────────────────────
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Restore post from URL on mount / URL change
  useEffect(() => {
    if (!postId) { setSelectedPost(null); return; }
    if (selectedPost?.id === postId) return;
    getPost(postId)
      .then(setSelectedPost)
      .catch(() => setParam("pid", null));
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectPost = useCallback((post: Post) => {
    setSelectedPost(post);
    setParam("pid", post.id);
  }, [setParam]);

  const handleClosePost = useCallback(() => {
    setSelectedPost(null);
    setParam("pid", null);
  }, [setParam]);

  const handlePostVote = useCallback((postId: string, value: 1 | -1) => {
    setSelectedPost((prev) => {
      if (!prev || prev.id !== postId) return prev;
      const toggled = prev.user_vote === value;
      return { ...prev, score: toggled ? prev.score - value : prev.score + value - prev.user_vote, user_vote: toggled ? 0 : value };
    });
  }, []);

  // ── User profile modal ─────────────────────────────────────────────────────
  const [profileUser, setProfileUser] = useState<{ id: string; name: string } | null>(null);
  const handleAuthorClick = useCallback((authorId: string, authorName: string) => {
    setProfileUser({ id: authorId, name: authorName });
  }, []);

  // ── Create post modal ──────────────────────────────────────────────────────
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postFeedRefreshTick, setPostFeedRefreshTick] = useState(0);

  const handlePostCreated = useCallback(() => {
    setIsCreatePostOpen(false);
    setPostFeedRefreshTick((t) => t + 1);
  }, []);

  // ── Create community modal ─────────────────────────────────────────────────
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (mode === "communities") refetchCommunities();
  }, [mode, refetchCommunities]);

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-gray-950">
      <SocialsSidebar
        mode={mode}
        onModeChange={setMode}
        communities={communities}
        communitiesLoading={communitiesLoading}
        selectedCommunityId={selectedCommunityId}
        onSelectCommunity={handleSelectCommunity}
        newsCategory={newsCategory}
        onSelectNewsCategory={setNewsCategory}
        joinedCommunityIds={joinedCommunityIds}
        savedCount={savedArticleUrls.size}
        onRefresh={handleRefresh}
        onCreateCommunity={() => setIsCreateCommunityOpen(true)}
        onJoinCommunity={handleJoin}
        onLeaveCommunity={handleLeave}
      />

      <main className="flex-1 min-w-0 overflow-hidden">
        {mode === "news" ? (
          <SocialsNewsFeed
            category={newsCategory}
            savedArticleUrls={savedArticleUrls}
            onToggleSave={handleToggleSave}
            onSelectArticle={setSelectedArticle}
          />
        ) : (
          <SocialsPostFeed
            communityId={selectedCommunityId}
            communityName={selectedCommunity?.name ?? ""}
            currentUserId={currentUserId}
            onSelectPost={handleSelectPost}
            onCreatePost={() => setIsCreatePostOpen(true)}
            onAuthorClick={handleAuthorClick}
            refreshTick={postFeedRefreshTick}
          />
        )}
      </main>

      {/* Article detail modal */}
      <NewsArticleModal
        article={selectedArticle}
        categoryKey={newsCategory}
        isSaved={selectedArticle ? savedArticleUrls.has(selectedArticle.url) : false}
        onToggleSave={() => selectedArticle && handleToggleSave(selectedArticle.url)}
        onClose={() => setSelectedArticle(null)}
      />

      {/* Post detail modal */}
      <PostDetailModal
        post={selectedPost}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onClose={handleClosePost}
        onPostVote={handlePostVote}
        onPostDeleted={handleClosePost}
        onAuthorClick={handleAuthorClick}
      />

      {/* Create post modal */}
      {selectedCommunityId && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          communityId={selectedCommunityId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setIsCreatePostOpen(false)}
          onCreated={handlePostCreated}
        />
      )}

      {/* Create community modal */}
      <CreateCommunityModal
        isOpen={isCreateCommunityOpen}
        currentUserId={currentUserId}
        onClose={() => setIsCreateCommunityOpen(false)}
        onCreated={refetchCommunities}
      />

      {/* User profile modal */}
      <UserProfileModal
        userId={profileUser?.id ?? null}
        userName={profileUser?.name ?? ""}
        onClose={() => setProfileUser(null)}
        onSelectPost={(post) => { setProfileUser(null); handleSelectPost(post); setMode("communities"); }}
      />
    </div>
  );
}
