import { useState, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  Clock,
  TrendingUp,
  Flame,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArticleCard } from "../molecules/ArticleCard";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { EmptyState } from "../atoms/EmptyState";
import { useNews, useNewsSearch } from "../../hooks/useNews";
import type { Article, NewsCategory } from "../../types/news.types";

const NEWS_CATEGORY_META: Record<
  string,
  { name: string; color: string }
> = {
  "": { name: "All News", color: "#2563EB" },
  general: { name: "General", color: "#6B7280" },
  technology: { name: "Technology", color: "#00C7BE" },
  health: { name: "Health & Safety", color: "#FF9F0A" },
  business: { name: "Business", color: "#9333EA" },
  science: { name: "Science", color: "#10B981" },
  sports: { name: "Sports", color: "#EF4444" },
};

type SortBy = "latest" | "trending" | "popular";
const SORT_ICONS: Record<SortBy, typeof Clock> = {
  latest: Clock,
  trending: TrendingUp,
  popular: Flame,
};

interface SocialsNewsFeedProps {
  category: NewsCategory | "";
  savedArticleUrls: Set<string>;
  onToggleSave: (url: string) => void;
  onSelectArticle: (article: Article) => void;
}

export function SocialsNewsFeed({
  category,
  savedArticleUrls,
  onToggleSave,
  onSelectArticle,
}: SocialsNewsFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const { articles: headlineArticles, isLoading: headlinesLoading, error, refetch, loadMore, hasMore } = useNews(category);
  const { articles: searchResults, isLoading: searchLoading } = useNewsSearch(searchQuery);

  const isSearching = searchQuery.trim().length > 0;
  const rawArticles = isSearching ? searchResults : headlineArticles;
  const isLoading = isSearching ? searchLoading : headlinesLoading;

  const sortedArticles = [...rawArticles].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    }
    return 0;
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success("News refreshed");
  }, [refetch]);

  const handleShare = useCallback((url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copied to clipboard");
  }, []);

  const catMeta = NEWS_CATEGORY_META[category] ?? NEWS_CATEGORY_META[""];
  const SortIcon = SORT_ICONS[sortBy];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold leading-tight">{catMeta.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Latest news and updates from around the world
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-900 transition-colors disabled:opacity-50"
            aria-label="Refresh news"
          >
            <RefreshCw className={`w-4 h-4 text-blue-500 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
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
              placeholder="Search news articles..."
              className="bg-transparent text-white placeholder-gray-600 focus:outline-none w-full text-sm"
              aria-label="Search news articles"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSortDropdown((v) => !v); }}
              className="flex items-center gap-2 h-10 px-4 rounded-xl hover:bg-gray-800 transition-colors"
              style={{ background: "#141414", border: "1px solid #1C1C1C", minWidth: "130px" }}
              aria-label="Sort articles"
              aria-expanded={showSortDropdown}
            >
              <SortIcon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
              <span className="text-white text-sm capitalize flex-1 text-left">{sortBy}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            </button>

            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full right-0 mt-2 p-1.5 rounded-xl z-50 min-w-[160px]"
                  style={{ background: "#0A0A0A", border: "1px solid #1C1C1C", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["latest", "trending", "popular"] as const).map((s) => {
                    const Icon = SORT_ICONS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { setSortBy(s); setShowSortDropdown(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        <span className={`text-sm capitalize flex-1 text-left ${sortBy === s ? "text-white font-semibold" : "text-gray-300"}`}>
                          {s}
                        </span>
                        {sortBy === s && <CheckCircle2 className="w-4 h-4 text-blue-500" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Count */}
        <p className="text-[13px] text-gray-400">
          {sortedArticles.length} {sortedArticles.length === 1 ? "article" : "articles"} found
        </p>

        {/* Grid */}
        {isLoading && sortedArticles.length === 0 ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading articles…" />
          </div>
        ) : error ? (
          <EmptyState title="Failed to load news" description={error} />
        ) : sortedArticles.length === 0 ? (
          <EmptyState title="No articles found" description="Try adjusting your search or category" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedArticles.map((article, idx) => {
              const cat = NEWS_CATEGORY_META[category] ?? NEWS_CATEGORY_META[""];
              return (
                <motion.div
                  key={article.url + idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <ArticleCard
                    title={article.title}
                    description={article.description}
                    sourceName={article.source.name}
                    author={article.author}
                    url={article.url}
                    imageUrl={article.image_url}
                    publishedAt={article.published_at}
                    categoryLabel={cat.name}
                    categoryColor={cat.color}
                    isSaved={savedArticleUrls.has(article.url)}
                    onToggleSave={() => onToggleSave(article.url)}
                    onShare={() => handleShare(article.url)}
                    onSelect={() => onSelectArticle(article)}
                  />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!isSearching && hasMore && !isLoading && (
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
