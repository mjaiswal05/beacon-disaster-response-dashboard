import { useQuery } from "@tanstack/react-query";
import { listEvacuations } from "../services/core.api";
import type { Evacuation } from "../types/core.types";

/**
 * Fetches all evacuations via a single list-all endpoint.
 * Returns a flat list sorted newest first.
 */
export function useEvacuations(pollInterval = 30_000) {
  const {
    data: evacuations = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Evacuation[]>({
    queryKey: ["evacuations"],
    queryFn: () => listEvacuations({ page_size: 200 }),
    refetchInterval: pollInterval,
  });

  return {
    evacuations,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
