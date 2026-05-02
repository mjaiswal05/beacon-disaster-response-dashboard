import { useQuery } from '@tanstack/react-query';
import { listIncidentEvents } from '../services/core.api';
import { getUserById } from '../services/iam.api';
import type { IncidentEvent } from '../services/core.api';

function hasNameInMeta(events: IncidentEvent[], id: string): boolean {
  return events.some((ev) => ev.changed_by === id && (ev.metadata as any)?.actor?.name);
}

async function resolveActorNames(events: IncidentEvent[]): Promise<Record<string, string>> {
  const SYSTEM_IDS = new Set(['system', 'internal-service', '']);
  const ids = [...new Set(
    events
      .map((e) => e.changed_by)
      .filter((id) => !!id && !SYSTEM_IDS.has(id) && !hasNameInMeta(events, id)),
  )];
  if (ids.length === 0) return {};
  const results = await Promise.allSettled(ids.map((id) => getUserById(id)));
  const names: Record<string, string> = {};
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      const user = result.value;
      const name = (user as any).name ?? (user as any).display_name ?? null;
      if (name) names[ids[i]] = name;
    }
  });
  return names;
}

export function useIncidentEvents(incidentId: string) {
  const eventsQuery = useQuery({
    queryKey: ['incident-events', incidentId],
    queryFn: () => listIncidentEvents(incidentId, 50),
    enabled: !!incidentId,
    refetchInterval: 30_000,
  });

  const events = (eventsQuery.data?.events ?? []) as IncidentEvent[];

  const namesQuery = useQuery({
    queryKey: ['incident-actor-names', incidentId, events.map((e) => e.changed_by).join(',')],
    queryFn: () => resolveActorNames(events),
    enabled: events.length > 0,
    staleTime: 5 * 60_000,
  });

  return {
    events,
    actorNames: namesQuery.data ?? {},
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error ? (eventsQuery.error as Error).message : null,
    refetch: eventsQuery.refetch,
  };
}
