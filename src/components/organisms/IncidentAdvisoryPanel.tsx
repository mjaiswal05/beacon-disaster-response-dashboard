import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listEvacuationsByIncident } from "../../services/core.api";
import type { Evacuation } from "../../types/core.types";
import { AdvisoryHistoryCard } from "../molecules/AdvisoryHistoryCard";
import { EmptyState } from "../atoms/EmptyState";

interface IncidentAdvisoryPanelProps {
  incidentId: string;
}

function AdvisorySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading advisories">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse space-y-2"
        >
          <div className="h-4 bg-gray-800 rounded w-24" />
          <div className="h-3 bg-gray-800 rounded w-3/4" />
          <div className="h-3 bg-gray-800 rounded w-full" />
          <div className="h-3 bg-gray-800 rounded w-2/3" />
          <div className="flex justify-between mt-1">
            <div className="h-3 bg-gray-800 rounded w-1/3" />
            <div className="h-3 bg-gray-800 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IncidentAdvisoryPanel({
  incidentId,
}: IncidentAdvisoryPanelProps) {
  const { data, isLoading, error } = useQuery<Evacuation[]>({
    queryKey: ["evacuations", incidentId],
    queryFn: () => listEvacuationsByIncident(incidentId),
    enabled: Boolean(incidentId),
  });

  // Filter to evacuations where notification_sent === true
  const sent = (data ?? []).filter(
    (e) => e.notification_sent === true,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-white font-semibold">Sent Advisories</h2>
        {!isLoading && sent.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
            {sent.length}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-3 rounded-xl border border-red-800/50 bg-red-900/20 text-red-400 text-xs"
          role="alert"
        >
          Failed to load advisories. Please try again later.
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <AdvisorySkeleton />
      ) : sent.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No advisories sent"
          description="No advisories have been sent for this incident yet."
          className="py-8"
        />
      ) : (
        <div className="space-y-3" role="list" aria-label="Sent advisories">
          {sent.map((evacuation) => (
            <div key={evacuation.id} role="listitem">
              <AdvisoryHistoryCard
                advisoryType={evacuation.advisory_type}
                advisoryTitle={evacuation.advisory_title}
                advisoryBody={evacuation.advisory_body}
                zoneName={evacuation.zone_name}
                sentAt={evacuation.updated_at}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
