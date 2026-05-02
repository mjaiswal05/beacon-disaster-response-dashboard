import { useQuery } from "@tanstack/react-query";
import { listServiceUnits } from "../services/observability.api";

export interface ServiceUnit {
  id: string;
  unit_type?: string;
  status?: string;
  location?: { latitude: number; longitude: number };
  name?: string;
  [key: string]: unknown;
}

export function useServiceUnits(countryId: number) {
  const { data, isLoading, error } = useQuery<ServiceUnit[]>({
    queryKey: ["service-units", countryId],
    queryFn: () => listServiceUnits(countryId) as Promise<ServiceUnit[]>,
    enabled: !!countryId,
    refetchInterval: 60_000,
  });

  return {
    units: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
