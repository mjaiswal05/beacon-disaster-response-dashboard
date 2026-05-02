import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listVehicles,
  listTrains,
  listLuasForecasts,
  listTrafficFlows,
} from "../services/observability.api";
import { useGeoDefaults } from "./useGeoDefaults";

export type TransportTimeRange = "5m" | "10m" | "1h" | "6h" | "12h";

export const TIME_RANGE_OPTIONS: { value: TransportTimeRange; label: string }[] = [
  { value: "5m", label: "Live (5 min)" },
  { value: "10m", label: "10 min" },
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "12h", label: "12 hours" },
];

function toMinutes(range: TransportTimeRange): number {
  switch (range) {
    case "5m":  return 5;
    case "10m": return 10;
    case "1h":  return 60;
    case "6h":  return 360;
    case "12h": return 720;
  }
}

function rangeToParams(range: TransportTimeRange): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - toMinutes(range) * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useTransport() {
  const { countryId, cityIdStr, cityName } = useGeoDefaults();
  const [timeRange, setTimeRange] = useState<TransportTimeRange>("5m");

  const getTimeParams = useCallback(
    () => rangeToParams(timeRange),
    [timeRange],
  );

  const vehicles = useQuery({
    queryKey: ["transport", "vehicles", cityIdStr, timeRange],
    queryFn: () => listVehicles(cityIdStr, getTimeParams()),
    refetchInterval: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const trains = useQuery({
    queryKey: ["transport", "trains", countryId, timeRange],
    queryFn: () => listTrains(countryId, getTimeParams()),
    refetchInterval: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const luas = useQuery({
    queryKey: ["transport", "luas", countryId, timeRange],
    queryFn: () => listLuasForecasts(countryId, getTimeParams()),
    refetchInterval: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const traffic = useQuery({
    queryKey: ["transport", "traffic", cityIdStr, timeRange],
    queryFn: () => listTrafficFlows(cityIdStr, getTimeParams()),
    refetchInterval: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    vehicles: vehicles.data ?? [],
    vehiclesLoading: vehicles.isLoading,
    trains: trains.data ?? [],
    trainsLoading: trains.isLoading,
    luas: luas.data ?? [],
    luasLoading: luas.isLoading,
    traffic: traffic.data ?? [],
    trafficLoading: traffic.isLoading,
    anyError:
      vehicles.error ?? trains.error ?? luas.error ?? traffic.error ?? null,
    cityName,
    timeRange,
    setTimeRange,
  };
}
