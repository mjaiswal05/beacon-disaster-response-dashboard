import { useQuery } from "@tanstack/react-query";
import {
  listNearHospitals,
  listFireStationLocations,
  listPoliceStationLocations,
} from "../services/observability.api";
import type {
  HospitalLocation,
  FireStationLocation,
  PoliceStationLocation,
} from "../types/observability.types";

export interface NearbyResourcesResult {
  hospitals: HospitalLocation[];
  fireStations: FireStationLocation[];
  policeStations: PoliceStationLocation[];
  isLoading: boolean;
  error: Error | null;
}

export function useNearbyResources(
  countryId: number,
  lat?: number,
  lng?: number,
): NearbyResourcesResult {
  const locationParams =
    lat !== undefined && lng !== undefined
      ? { latitude: lat, longitude: lng }
      : undefined;

  const hospitals = useQuery<HospitalLocation[]>({
    queryKey: ["nearby-resources", "hospitals", countryId, lat, lng],
    queryFn: () => listNearHospitals(countryId, locationParams),
    enabled: !!countryId,
    staleTime: 5 * 60_000,
  });

  const fireStations = useQuery<FireStationLocation[]>({
    queryKey: ["nearby-resources", "fire-stations", countryId],
    queryFn: () => listFireStationLocations(countryId),
    enabled: !!countryId,
    staleTime: 5 * 60_000,
  });

  const policeStations = useQuery<PoliceStationLocation[]>({
    queryKey: ["nearby-resources", "police-stations", countryId],
    queryFn: () => listPoliceStationLocations(countryId),
    enabled: !!countryId,
    staleTime: 5 * 60_000,
  });

  return {
    hospitals: (hospitals.data ?? []) as HospitalLocation[],
    fireStations: (fireStations.data ?? []) as FireStationLocation[],
    policeStations: (policeStations.data ?? []) as PoliceStationLocation[],
    isLoading:
      hospitals.isLoading ||
      fireStations.isLoading ||
      policeStations.isLoading,
    error:
      (hospitals.error as Error | null) ??
      (fireStations.error as Error | null) ??
      (policeStations.error as Error | null),
  };
}
