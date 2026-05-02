import {
  Globe,
  Shield,
  Activity,
  MapPin,
  Briefcase,
  BookmarkCheck,
  Users,
  RefreshCw,
  Plus,
  Newspaper,
  UserPlus,
  UserMinus,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../ui/utils";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import type { Community } from "../../types/socials.types";
import type { NewsCategory } from "../../types/news.types";

export type SocialsMode = "news" | "communities";

interface NewsTab {
  id: NewsCategory | "";
  name: string;
  icon: typeof Globe;
  color: string;
}

const NEWS_TABS: NewsTab[] = [
  { id: "", name: "All News", icon: Globe, color: "#2563EB" },
  { id: "general", name: "General", icon: Newspaper, color: "#6B7280" },
  { id: "technology", name: "Technology", icon: Activity, color: "#00C7BE" },
  { id: "health", name: "Health & Safety", icon: Shield, color: "#FF9F0A" },
  { id: "business", name: "Business", icon: Briefcase, color: "#9333EA" },
  { id: "science", name: "Science", icon: Activity, color: "#10B981" },
  { id: "sports", name: "Sports", icon: MapPin, color: "#EF4444" },
];

interface SocialsSidebarProps {
  mode: SocialsMode;
  onModeChange: (mode: SocialsMode) => void;
  communities: Community[];
  communitiesLoading: boolean;
  selectedCommunityId: string | null;
  onSelectCommunity: (id: string) => void;
  newsCategory: NewsCategory | "";
  onSelectNewsCategory: (cat: NewsCategory | "") => void;
  joinedCommunityIds: Set<string>;
  savedCount: number;
  onRefresh: () => void;
  onCreateCommunity: () => void;
  onJoinCommunity: (communityId: string) => void;
  onLeaveCommunity: (communityId: string) => void;
}

export function SocialsSidebar({
  mode,
  onModeChange,
  communities,
  communitiesLoading,
  selectedCommunityId,
  onSelectCommunity,
  newsCategory,
  onSelectNewsCategory,
  joinedCommunityIds,
  savedCount,
  onRefresh,
  onCreateCommunity,
  onJoinCommunity,
  onLeaveCommunity,
}: SocialsSidebarProps) {
  const [communitySearch, setCommunitySearch] = useState("");

  const filteredCommunities = communitySearch.trim()
    ? communities.filter(
        (c) =>
          c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
          c.slug.toLowerCase().includes(communitySearch.toLowerCase()),
      )
    : communities;

  return (
    <aside
      className="w-72 shrink-0 flex flex-col overflow-y-auto bg-gray-950"
      style={{ borderRight: "1px solid #1C1C1C" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid #1C1C1C" }}>
        <h2 className="text-white text-sm font-semibold px-1">Beacon Socials</h2>
        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-gray-900 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="p-3" style={{ borderBottom: "1px solid #1C1C1C" }}>
        <div className="flex gap-1 p-1 rounded-xl bg-gray-900">
          {(["news", "communities"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                mode === m ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white",
              )}
            >
              {m === "news" ? "News" : "Communities"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mode === "news" ? (
          <>
            <p className="text-[11px] font-semibold text-gray-500 px-3 py-1 uppercase tracking-wide">
              Categories
            </p>
            {NEWS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = newsCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectNewsCategory(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors",
                    isActive ? "bg-gray-900" : "hover:bg-gray-900/60",
                  )}
                  style={{ color: isActive ? "#FFFFFF" : "#8A8F98" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${tab.color}15`,
                      border: `1px solid ${tab.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: tab.color }} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium">{tab.name}</span>
                  {isActive && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: tab.color }}
                    />
                  )}
                </button>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Communities
              </p>
              <button
                onClick={onCreateCommunity}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="Create community"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
              </button>
            </div>

            {/* Community search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "#141414", border: "1px solid #1C1C1C" }}
            >
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" strokeWidth={1.5} />
              <input
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                placeholder="Search communities…"
                className="bg-transparent text-white placeholder-gray-600 focus:outline-none flex-1 text-xs"
                aria-label="Search communities"
              />
              {communitySearch && (
                <button onClick={() => setCommunitySearch("")} aria-label="Clear search">
                  <X className="w-3 h-3 text-gray-500" strokeWidth={2} />
                </button>
              )}
            </div>

            {communitiesLoading ? (
              <div className="py-6 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredCommunities.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No communities found</p>
            ) : (
              filteredCommunities.map((c) => {
                const isJoined = joinedCommunityIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors group",
                      selectedCommunityId === c.id ? "bg-gray-900" : "hover:bg-gray-900/60",
                    )}
                  >
                    <button
                      onClick={() => onSelectCommunity(c.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      aria-label={`Select ${c.name}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", selectedCommunityId === c.id ? "text-white" : "text-gray-300")}>
                          {c.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{c.member_count} members</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        isJoined ? onLeaveCommunity(c.id) : onJoinCommunity(c.id);
                      }}
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 shrink-0",
                        isJoined
                          ? "hover:bg-red-500/10 text-red-400"
                          : "hover:bg-blue-500/10 text-blue-400",
                      )}
                      aria-label={isJoined ? `Leave ${c.name}` : `Join ${c.name}`}
                      title={isJoined ? "Leave community" : "Join community"}
                    >
                      {isJoined
                        ? <UserMinus className="w-3.5 h-3.5" strokeWidth={2} />
                        : <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
                      }
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 space-y-2" style={{ borderTop: "1px solid #1C1C1C" }}>
        {mode === "news" && (
          <div
            className="p-3 rounded-xl flex items-center gap-3"
            style={{ background: "#141414", border: "1px solid #1C1C1C" }}
          >
            <BookmarkCheck className="w-4 h-4 text-yellow-400 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-white text-lg font-semibold leading-none">{savedCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Articles saved</p>
            </div>
          </div>
        )}
        {mode === "communities" && (
          <div
            className="p-3 rounded-xl flex items-center gap-3"
            style={{ background: "#141414", border: "1px solid #1C1C1C" }}
          >
            <Users className="w-4 h-4 text-blue-400 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-white text-lg font-semibold leading-none">{communities.length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Communities</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
