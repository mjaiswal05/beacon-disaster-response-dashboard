import { motion } from "framer-motion";
import { AlertTriangle, Hash, Plus, Search } from "lucide-react";
import { memo, useState } from "react";
import type { ChannelResponse } from "../../types/chat.types";

interface ChannelListProps {
  channels: ChannelResponse[];
  publicChannels: ChannelResponse[];
  activeChannelId: string | null;
  /* eslint-disable no-unused-vars */
  onSelectChannel: (channelId: string) => void;
  onJoin: (channelId: string) => void;
  /* eslint-enable no-unused-vars */
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreateChannel: () => void;
}

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const ChannelList = memo(function ChannelList({
  channels,
  publicChannels,
  activeChannelId,
  onSelectChannel,
  isLoading,
  error,
  onRetry,
  onJoin,
  onCreateChannel,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "discover">("mine");

  const filteredMine = channels.filter(
    (ch) =>
      !searchQuery ||
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const discoverChannels = publicChannels.filter(
    (ch) =>
      !ch.is_member &&
      (!searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div
      className="w-[300px] shrink-0 flex flex-col"
      style={{ borderRight: "1px solid var(--secondary)" }}
      aria-label="Channel list"
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid var(--secondary)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            style={{
              color: "var(--foreground)",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            Channels
          </h2>
          <button
            onClick={onCreateChannel}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Create new channel"
            title="New channel"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div
          className="flex items-center gap-2 h-8 px-3 rounded-[8px]"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
          }}
        >
          <Search
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: "var(--muted-foreground)" }}
            aria-hidden="true"
          />
          <input
            placeholder="Search channels..."
            aria-label="Search channels"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-foreground placeholder-[#4a4a52] focus:outline-none w-full"
            style={{ fontSize: "12px" }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["mine", "discover"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-1 rounded-[6px] text-center transition-colors"
              style={{
                fontSize: "11px",
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? "var(--card)" : "transparent",
                color: activeTab === tab ? "var(--foreground)" : "var(--muted-foreground)",
                border: activeTab === tab ? "1px solid var(--secondary)" : "1px solid transparent",
              }}
            >
              {tab === "mine" ? "My Channels" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      {/* Channel items */}
      <div className="flex-1 overflow-y-auto py-2" role="list">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3"
              style={{ borderColor: "#2563EB", borderTopColor: "transparent" }}
            />
            <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
              Loading channels…
            </p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p style={{ color: "#FF453A", fontSize: "13px" }} className="mb-2">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{ color: "#2563EB", fontSize: "12px" }}
                className="hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : activeTab === "mine" ? (
          filteredMine.length === 0 ? (
            <div
              className="p-4 text-center"
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
            >
              {searchQuery ? "No channels match your search" : "No channels joined yet"}
            </div>
          ) : (
            filteredMine.map((channel, idx) => {
              const isActive = activeChannelId === channel.id;
              const isIncident = channel.type === "INCIDENT";

              return (
                <motion.button
                  key={channel.id}
                  role="listitem"
                  onClick={() => onSelectChannel(channel.id)}
                  aria-current={isActive ? "true" : undefined}
                  className="relative w-full flex items-center gap-3 px-4 py-3 text-left overflow-hidden"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: Math.min(idx * 0.05, 0.3) }}
                  whileHover={{ x: isActive ? 0 : 4 }}
                >
                  {/* Animated active background */}
                  {isActive && (
                    <motion.span
                      layoutId="channel-active-pill"
                      className="absolute inset-0"
                      style={{ background: "var(--card)" }}
                      transition={spring}
                    />
                  )}

                  {/* Active left border strip */}
                  <motion.span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                    style={{ background: "#2563EB" }}
                    animate={{
                      height: isActive ? "55%" : "0%",
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={spring}
                  />

                  {/* Channel icon */}
                  <div
                    className="relative z-10 w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ background: isActive ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.06)" }}
                  >
                    {isIncident ? (
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: "#FF9F0A" }}
                        aria-hidden="true"
                      />
                    ) : (
                      <Hash
                        className="w-4 h-4"
                        style={{ color: isActive ? "#2563EB" : "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Text content */}
                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate"
                        style={{
                          color: isActive ? "var(--foreground)" : "var(--text-secondary)",
                          fontSize: "13px",
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        #{channel.name}
                      </span>
                      {channel.last_message_at && (
                        <span
                          className="shrink-0"
                          style={{ color: "var(--muted-foreground)", fontSize: "10px" }}
                        >
                          {relativeTime(channel.last_message_at)}
                        </span>
                      )}
                    </div>
                    {channel.type && (
                      <p
                        className="truncate mt-0.5"
                        style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
                      >
                        {channel.type === "INCIDENT" ? "Incident channel" : "Public channel"}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })
          )
        ) : (
          /* Discover tab */
          discoverChannels.length === 0 ? (
            <div
              className="p-4 text-center"
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
            >
              {searchQuery ? "No channels match your search" : "No public channels to discover"}
            </div>
          ) : (
            discoverChannels.map((channel, idx) => {
              const isIncident = channel.type === "INCIDENT";

              return (
                <motion.div
                  key={channel.id}
                  role="listitem"
                  className="flex items-center gap-3 px-4 py-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: Math.min(idx * 0.05, 0.3) }}
                >
                  {/* Channel icon */}
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    {isIncident ? (
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: "#FF9F0A" }}
                        aria-hidden="true"
                      />
                    ) : (
                      <Hash
                        className="w-4 h-4"
                        style={{ color: "var(--muted-foreground)" }}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="truncate block"
                      style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
                    >
                      #{channel.name}
                    </span>
                    {channel.last_message_at && (
                      <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                        {relativeTime(channel.last_message_at)}
                      </span>
                    )}
                  </div>

                  {/* Join button */}
                  <button
                    onClick={() => onJoin(channel.id)}
                    className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border"
                    style={{
                      color: "#2563EB",
                      borderColor: "rgba(37,99,235,0.4)",
                      background: "rgba(37,99,235,0.08)",
                      fontSize: "11px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(37,99,235,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(37,99,235,0.08)";
                    }}
                  >
                    Join
                  </button>
                </motion.div>
              );
            })
          )
        )}
      </div>
    </div>
  );
});
