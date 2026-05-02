import { useState, useCallback, useEffect } from "react";
import { getHeadlines, searchArticles } from "../services/news.api";
import type { Article, NewsCategory } from "../types/news.types";

const PAGE_SIZE = 20;

export function useNews(category: NewsCategory | "") {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);

  const fetchArticles = useCallback(
    async (pageNum = 1) => {
      setError(null);
      if (pageNum === 1) setIsLoading(true);
      try {
        const res = await getHeadlines({
          category: category || undefined,
          page: pageNum,
          page_size: PAGE_SIZE,
        });
        setTotalResults(res.total_results);
        setArticles((prev) => (pageNum === 1 ? res.articles : [...prev, ...res.articles]));
        setPage(pageNum);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load news");
      } finally {
        setIsLoading(false);
      }
    },
    [category],
  );

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  const loadMore = useCallback(() => fetchArticles(page + 1), [fetchArticles, page]);
  const hasMore = articles.length < totalResults;

  return { articles, isLoading, error, refetch: () => fetchArticles(1), loadMore, hasMore };
}

export function useNewsSearch(query: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);

  const search = useCallback(
    async (pageNum = 1) => {
      if (!query.trim()) return;
      setError(null);
      setIsLoading(true);
      try {
        const res = await searchArticles({ q: query, page: pageNum, page_size: PAGE_SIZE });
        setTotalResults(res.total_results);
        setArticles((prev) => (pageNum === 1 ? res.articles : [...prev, ...res.articles]));
        setPage(pageNum);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    if (query.trim()) search(1);
    else setArticles([]);
  }, [query, search]);

  const loadMore = useCallback(() => search(page + 1), [search, page]);
  const hasMore = articles.length < totalResults;

  return { articles, isLoading, error, loadMore, hasMore };
}
