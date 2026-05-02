import { useQuery } from "@tanstack/react-query";
import { listDispatches } from "../services/core.api";
import type { Dispatch } from "../types/core.types";

/**
 * Fetches all dispatches via a single list-all endpoint.
 * Returns a flat list sorted newest first.
 */
export function useDispatches(pollInterval = 30_000) {
  const {
    data: dispatches = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Dispatch[]>({
    queryKey: ["dispatches"],
    queryFn: () => listDispatches({ page_size: 200 }),
    refetchInterval: pollInterval,
  });

  return {
    dispatches,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
