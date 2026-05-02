import { useState, useMemo } from "react";
import { SearchInput } from "../molecules/SearchInput";
import { SeverityBadge } from "../atoms/SeverityBadge";
import { TimeAgo } from "../atoms/TimeAgo";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { ErrorMessage } from "../atoms/ErrorMessage";
import { EmptyState } from "../atoms/EmptyState";
import { cn } from "../ui/utils";
import { MapPin, ChevronRight } from "lucide-react";
import type { Incident } from "../../types/core.types";

const SEVERITY_FILTERS = ["all", "P0", "P1", "P2", "P3"] as const;

interface IncidentTableProps {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  onSelectIncident: (id: string) => void;
  onRetry: () => void;
}

export function IncidentTable({
  incidents,
  isLoading,
  error,
  onSelectIncident,
  onRetry,
}: IncidentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      incidents.filter((i) => {
        if (severityFilter !== "all" && i.severity !== severityFilter)
          return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            i.title?.toLowerCase().includes(q) ||
            i.type?.toLowerCase().includes(q) ||
            i.location?.address?.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [incidents, searchQuery, severityFilter],
  );

  if (isLoading) return <LoadingSpinner label="Loading incidents…" />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search incidents…"
            aria-label="Search incidents"
          />
        </div>
        <div className="flex gap-1">
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg transition-colors",
                severityFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-secondary text-muted-foreground hover:bg-gray-700",
              )}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3">Incident</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr
                  key={incident.id}
                  className="border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => onSelectIncident(incident.id)}
                >
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {incident.title || incident.type}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      <span className="truncate max-w-48">
                        {incident.location?.address ?? "Unknown"}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                    {incident.status}
                  </td>
                  <td className="px-4 py-3">
                    <TimeAgo timestamp={incident.created_at} />
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight
                      className="w-4 h-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
