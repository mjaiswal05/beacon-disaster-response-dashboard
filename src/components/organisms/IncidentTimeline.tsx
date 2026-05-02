import { Clock, RefreshCw } from 'lucide-react';
import { useIncidentEvents } from '../../hooks/useIncidentEvents';
import { EmptyState } from '../atoms/EmptyState';
import { EventTimelineItem } from '../molecules/EventTimelineItem';

interface IncidentTimelineProps {
  incidentId: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: '#32D74B',
  updated: '#2563EB',
  closed: '#8A8F98',
  escalated: '#FF453A',
  approved: '#32D74B',
  alerted: '#FF9F0A',
  resolved: '#32D74B',
  dispatch_created: '#FF9F0A',
  dispatch_accepted: '#32D74B',
  dispatch_rejected: '#FF453A',
  dispatch_completed: '#32D74B',
  evacuation_created: '#A855F7',
};

function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? ACTION_COLORS[action.toLowerCase().split('_')[0]] ?? '#60A5FA';
}

function TimelineSkeleton() {
  return (
    <div className="overflow-x-auto pb-2" aria-busy="true" aria-label="Loading timeline events">
      <div className="relative inline-flex min-w-max items-center gap-4 pr-1 pt-2">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-700/70" aria-hidden="true" />

        {[0, 1, 2].map((i) => {
          const isTop = i % 2 === 0;

          return (
            <div
              key={i}
              className="relative w-72 sm:w-80 h-[20rem] sm:h-[22rem] shrink-0 grid grid-rows-[1fr_auto_1fr] gap-3"
            >
              {isTop ? (
                <div className="row-start-1 relative">
                  <div
                    className="absolute left-1/2 -bottom-3 h-3 w-px -translate-x-1/2 bg-gray-700/70"
                    aria-hidden="true"
                  />
                  <div className="h-full space-y-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700 animate-pulse">
                    <div className="h-3 bg-gray-700 rounded w-1/3" />
                    <div className="h-3 bg-gray-700 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              ) : (
                <div className="row-start-1" />
              )}

              <div className="row-start-2 flex items-center justify-center" aria-hidden="true">
                <div className="w-3 h-3 rounded-full bg-gray-700 border border-gray-800" />
              </div>

              {!isTop ? (
                <div className="row-start-3 relative">
                  <div
                    className="absolute left-1/2 -top-3 h-3 w-px -translate-x-1/2 bg-gray-700/70"
                    aria-hidden="true"
                  />
                  <div className="h-full space-y-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700 animate-pulse">
                    <div className="h-3 bg-gray-700 rounded w-1/3" />
                    <div className="h-3 bg-gray-700 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              ) : (
                <div className="row-start-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IncidentTimeline({ incidentId }: IncidentTimelineProps) {
  const { events, actorNames, isLoading, error, refetch } = useIncidentEvents(incidentId);

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const eventCountLabel = `${events.length} event${events.length === 1 ? '' : 's'} · newest first`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-400">
          {!isLoading && events.length > 0 && eventCountLabel}
        </span>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Refresh timeline"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-3 rounded-xl border border-red-800/50 bg-red-900/20 text-red-400 text-xs"
          role="alert"
        >
          Failed to load events: {error}
        </div>
      )}

      {/* Content */}
      {isLoading && sorted.length === 0 ? (
        <TimelineSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No events recorded yet"
          description="Events will appear here as the incident progresses."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span>Newest</span>
            <span>Scroll horizontally for older events</span>
          </div>

          <div className="overflow-x-auto pb-2" role="list" aria-label="Incident events timeline">
            <div className="relative inline-flex min-w-max items-center gap-4 pr-1 pt-2">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-700/80" aria-hidden="true" />

              {sorted.map((event, index) => {
                const color = getActionColor(event.action);
                const isTop = index % 2 === 0;

                return (
                  <div
                    key={event.id}
                    className="relative w-72 sm:w-80 h-fit shrink-0 grid grid-rows-[1fr_auto_1fr] gap-3"
                    role="listitem"
                  >
                    {isTop ? (
                      <div className="row-start-1 relative">
                        <div
                          className="absolute left-1/2 -bottom-3 h-3 w-px -translate-x-1/2 bg-gray-700/80"
                          aria-hidden="true"
                        />
                        <EventTimelineItem
                          action={event.action}
                          message={event.message}
                          changedBy={event.changed_by}
                          createdAt={event.created_at}
                          metadata={event.metadata}
                          visible_to_citizens={event.visible_to_citizens}
                          actorNames={actorNames}
                          hideLeadingDot
                          className="h-fit bg-gray-900/60 border-gray-700/90 overflow-y-auto"
                        />
                      </div>
                    ) : (
                      <div className="row-start-1" />
                    )}

                    <div className="row-start-2 flex items-center justify-center" aria-hidden="true">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-900"
                        style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
                      />
                    </div>

                    {!isTop ? (
                      <div className="row-start-3 relative">
                        <div
                          className="absolute left-1/2 -top-3 h-3 w-px -translate-x-1/2 bg-gray-700/80"
                          aria-hidden="true"
                        />
                        <EventTimelineItem
                          action={event.action}
                          message={event.message}
                          changedBy={event.changed_by}
                          createdAt={event.created_at}
                          metadata={event.metadata}
                          visible_to_citizens={event.visible_to_citizens}
                          actorNames={actorNames}
                          hideLeadingDot
                          className="h-fit bg-gray-900/60 border-gray-700/90 overflow-y-auto"
                        />
                      </div>
                    ) : (
                      <div className="row-start-3" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
