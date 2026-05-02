import { motion } from "framer-motion";
import { AlertTriangle, Clock, Globe, Rss, ShieldAlert } from "lucide-react";
import type { FeedItem } from "../../hooks/useObservability";
import { fadeUp, staggerContainer } from "../../utils/animations";

interface LiveFeedPanelProps {
  items: FeedItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function getSourceIcon(source: FeedItem["source"]) {
  return source === "keyword" ? Globe : ShieldAlert;
}

function getSourceColor(source: FeedItem["source"]) {
  return source === "keyword" ? "#2563EB" : "#FF9F0A";
}

function formatFeedTime(timestamp: string): string {
  try {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "Unknown";
  }
}

export function LiveFeedPanel({
  items,
  isLoading,
  error,
  onRefresh,
}: LiveFeedPanelProps) {
  return (
    <motion.div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--secondary)",
        height: "100%",
      }}
      variants={fadeUp}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--secondary)" }}
      >
        <div className="flex items-center gap-2">
          <Rss
            className="w-4 h-4"
            style={{ color: "#2563EB" }}
            aria-hidden="true"
          />
          <h3 className="text-foreground text-sm font-semibold">Live Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "#32D74B",
              boxShadow: "0 0 6px rgba(50,215,75,0.5)",
            }}
            aria-hidden="true"
          />
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2 py-0.5 rounded-lg transition-colors text-xs disabled:opacity-50"
            style={{
              background: "var(--secondary)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            }}
            aria-label="Refresh feed"
          >
            {isLoading ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" aria-busy={isLoading}>
        {error && (
          <div
            className="m-3 p-3 rounded-xl"
            style={{
              background: "rgba(255,159,10,0.1)",
              border: "1px solid rgba(255,159,10,0.2)",
            }}
          >
            <div
              className="flex items-center gap-2"
              style={{ color: "#FF9F0A", fontSize: "12px" }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
              />
              <span role="alert">{error}</span>
            </div>
          </div>
        )}

        {isLoading && items.length === 0 ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{ background: "var(--secondary)" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg animate-pulse"
                    style={{ background: "var(--border)" }}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-3 rounded animate-pulse w-3/4"
                      style={{ background: "var(--border)" }}
                    />
                    <div
                      className="h-2 rounded animate-pulse w-full"
                      style={{ background: "var(--border)" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Rss
              className="w-8 h-8 mb-3"
              style={{ color: "var(--border)" }}
              aria-hidden="true"
            />
            <p className="text-foreground text-sm font-medium">No feed items</p>
            <p
              style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
              className="mt-1"
            >
              Social alerts will appear here
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {items.map((item) => {
              const SourceIcon = getSourceIcon(item.source);
              const color = getSourceColor(item.source);
              return (
                <motion.div
                  key={item.id}
                  className="px-4 py-3 transition-colors"
                  style={{ borderBottom: "1px solid rgba(28,28,28,0.8)" }}
                  variants={fadeUp}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--secondary)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${color}20` }}
                    >
                      <SourceIcon
                        className="w-3.5 h-3.5"
                        style={{ color }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-xs font-semibold capitalize truncate">
                          {item.title}
                        </span>
                        {item.platform && (
                          <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: "var(--secondary)",
                              color: "var(--muted-foreground)",
                              fontSize: "10px",
                            }}
                          >
                            {item.platform}
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-0.5 line-clamp-2"
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "11px",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span
                          className="flex items-center gap-1"
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: "10px",
                          }}
                        >
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatFeedTime(item.timestamp)}
                        </span>
                        {typeof item.credibility === "number" && (
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{
                              background:
                                item.credibility > 0.7
                                  ? "rgba(50,215,75,0.15)"
                                  : "rgba(255,159,10,0.15)",
                              color:
                                item.credibility > 0.7 ? "#32D74B" : "#FF9F0A",
                              fontSize: "10px",
                            }}
                          >
                            {Math.round(item.credibility * 100)}% credible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div
          className="px-5 py-2 flex-shrink-0"
          style={{ borderTop: "1px solid var(--secondary)" }}
        >
          <p
            style={{
              color: "var(--muted-foreground)",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {items.length} feed items
          </p>
        </div>
      )}
    </motion.div>
  );
}
