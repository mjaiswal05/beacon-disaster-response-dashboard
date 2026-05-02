import { useState, useCallback, useEffect } from "react";
import {
  getCommunities,
  getPosts,
  getComments,
  searchPosts,
  votePost,
  voteComment,
} from "../services/socials.api";
import type { Community, Post, Comment, SortOrder } from "../types/socials.types";

const PAGE_SIZE = 25;

export function useCommunities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      setCommunities(await getCommunities());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load communities");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { communities, isLoading, error, refetch: fetch };
}

export function usePosts(communityId: string | null, sort: SortOrder = "hot") {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(
    async (newOffset = 0) => {
      if (!communityId) return;
      setError(null);
      if (newOffset === 0) setIsLoading(true);
      try {
        const data = await getPosts(communityId, sort, PAGE_SIZE, newOffset);
        setPosts((prev) => (newOffset === 0 ? data : [...prev, ...data]));
        setOffset(newOffset);
        setHasMore(data.length === PAGE_SIZE);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load posts");
      } finally {
        setIsLoading(false);
      }
    },
    [communityId, sort],
  );

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  const loadMore = useCallback(() => fetchPosts(offset + PAGE_SIZE), [fetchPosts, offset]);

  const optimisticVote = useCallback(
    async (postId: string, userId: string, value: 1 | -1) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const toggled = p.user_vote === value;
          return {
            ...p,
            score: toggled ? p.score - value : p.score + value - p.user_vote,
            user_vote: toggled ? 0 : value,
          };
        }),
      );
      try {
        await votePost(postId, userId, value);
      } catch {
        // Revert on error
        fetchPosts(0);
      }
    },
    [fetchPosts],
  );

  return {
    posts,
    isLoading,
    error,
    hasMore,
    refetch: () => fetchPosts(0),
    loadMore,
    optimisticVote,
    setPosts,
  };
}

export function usePostSearch(query: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setPosts([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    searchPosts(query)
      .then(setPosts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Search failed"))
      .finally(() => setIsLoading(false));
  }, [query]);

  return { posts, isLoading, error };
}

export function useComments(postId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    try {
      setComments(await getComments(postId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const optimisticVoteComment = useCallback(
    async (commentId: string, userId: string, value: 1 | -1) => {
      const applyVote = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === commentId) {
            const toggled = c.user_vote === value;
            return {
              ...c,
              score: toggled ? c.score - value : c.score + value - c.user_vote,
              user_vote: toggled ? 0 : value,
              children: applyVote(c.children),
            };
          }
          return { ...c, children: applyVote(c.children) };
        });

      setComments((prev) => applyVote(prev));
      try {
        await voteComment(commentId, userId, value);
      } catch {
        fetch();
      }
    },
    [fetch],
  );

  return { comments, isLoading, error, refetch: fetch, optimisticVoteComment, setComments };
}
