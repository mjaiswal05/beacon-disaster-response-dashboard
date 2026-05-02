import { useEffect, useMemo, useState } from "react";
import { SearchInput } from "../molecules/SearchInput";
import { IncidentCard } from "../molecules/IncidentCard";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { ErrorMessage } from "../atoms/ErrorMessage";
import { EmptyState } from "../atoms/EmptyState";
import { SeverityBadge } from "../atoms/SeverityBadge";
import { cn } from "../ui/utils";
import type { Incident } from "../../types/core.types";

const SEVERITY_FILTERS = ["all", "P0", "P1", "P2", "P3"] as const;

const STATUS_PRIORITY: Record<string, number> = {
  reported: 0,
  verified: 0,
  active: 1,
  contained: 1,
  resolved: 2,
  closed: 2,
};

const STATUS_GROUP_LABEL: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Resolved",
};

interface IncidentListPanelProps {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onSearchChange?: (search: string) => void;
}

export function IncidentListPanel({
  incidents = [],
  isLoading,
  error,
  selectedId,
  onSelect,
  onRetry,
  onSearchChange,
}: IncidentListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Debounce search and lift to parent if callback provided
  useEffect(() => {
    if (!onSearchChange) return;
    const timer = setTimeout(() => onSearchChange(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearchChange]);

  const filtered = useMemo(() => {
    let list = incidents.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      // If parent handles search via API, skip local text filter
      if (!onSearchChange && searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          i.title?.toLowerCase().includes(q) ||
          i.type?.toLowerCase().includes(q) ||
          i.location?.address?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Sort by status priority (pending first, active next, resolved last),
    // then newest first within each group
    list = [...list].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status ?? ""] ?? 3;
      const pb = STATUS_PRIORITY[b.status ?? ""] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });

    return list;
  }, [incidents, searchQuery, severityFilter, onSearchChange]);

  if (isLoading) return <LoadingSpinner label="Loading incidents…" />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  // Build grouped view with dividers
  const groups: Array<{ label: string; items: Incident[] }> = [];
  let currentGroup = -1;
  const groupedItems: Array<Incident | { __divider: string }> = [];
  for (const incident of filtered) {
    const priority = STATUS_PRIORITY[incident.status ?? ""] ?? 3;
    if (priority !== currentGroup) {
      currentGroup = priority;
      const label = STATUS_GROUP_LABEL[priority] ?? "Other";
      groupedItems.push({ __divider: label });
    }
    groupedItems.push(incident);
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search incidents…"
        aria-label="Search incidents"
      />

      <div className="flex gap-1 flex-wrap">
        {SEVERITY_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors",
              severityFilter === s
                ? "bg-blue-600 text-white"
                : "bg-secondary text-muted-foreground hover:bg-gray-700",
            )}
          >
            {s === "all" ? "All" : <SeverityBadge severity={s} />}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="Try adjusting your filters."
        />
      ) : (
        <div className="space-y-1">
          {groupedItems.map((item, idx) => {
            if ("__divider" in item) {
              return (
                <p
                  key={`divider-${item.__divider}-${idx}`}
                  className="text-xs text-gray-400 uppercase tracking-widest px-1 pt-2 pb-1"
                >
                  {item.__divider}
                </p>
              );
            }
            return (
              <IncidentCard
                key={item.id}
                id={item.id}
                title={item.title ?? ""}
                type={item.type}
                severity={item.severity}
                locationAddress={item.location?.address ?? "Unknown location"}
                createdAt={item.created_at}
                status={item.status}
                isSelected={selectedId === item.id}
                onClick={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
