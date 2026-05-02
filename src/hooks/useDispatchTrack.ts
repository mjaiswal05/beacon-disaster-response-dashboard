import { useQuery } from "@tanstack/react-query";
import { getDispatchLocationTrack } from "../services/core.api";
import type { MemberTrack } from "../types/core.types";

export function useDispatchTrack(dispatchId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dispatch-track", dispatchId],
    queryFn: () => getDispatchLocationTrack(dispatchId),
    refetchInterval: 15_000,
    enabled: Boolean(dispatchId),
  });

  return {
    tracks: data?.tracks ?? ([] as MemberTrack[]),
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
