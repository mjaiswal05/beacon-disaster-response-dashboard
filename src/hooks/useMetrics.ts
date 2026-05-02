import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "../services/core.api";
import type { IncidentMetrics } from "../services/core.api";

export function useMetrics() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["metrics"],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  });

  return {
    metrics: data ?? {
      total_incidents: 0,
      active_incidents: 0,
      by_type: {},
      by_severity: {},
      by_status: {},
      average_response_minutes: 0,
    } satisfies IncidentMetrics,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
