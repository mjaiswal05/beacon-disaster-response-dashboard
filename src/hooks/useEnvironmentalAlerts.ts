import { useCallback, useEffect, useState } from "react";
import {
  listActiveWeatherWarnings,
  listFloodRiskAreas,
  listPowerOutages,
  listSensorReadings,
} from "../services/observability.api";
import type { PowerOutage, SensorReading, WeatherWarning } from "../types/observability.types";

interface EnvironmentalAlerts {
  weatherWarnings: WeatherWarning[];
  powerOutages: PowerOutage[];
  floodZones: any[];
  sensorReadings: SensorReading[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const COUNTRY_ID = 105; // Ireland

export function useEnvironmentalAlerts(pollInterval = 300_000): EnvironmentalAlerts {
  const [weatherWarnings, setWeatherWarnings] = useState<WeatherWarning[]>([]);
  const [powerOutages, setPowerOutages] = useState<PowerOutage[]>([]);
  const [floodZones, setFloodZones] = useState<any[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [warnings, outages, flood, sensors] = await Promise.allSettled([
        listActiveWeatherWarnings(),
        listPowerOutages("dublin"),
        listFloodRiskAreas(COUNTRY_ID),
        listSensorReadings(COUNTRY_ID),
      ]);

      if (warnings.status === "fulfilled") setWeatherWarnings(warnings.value);
      if (outages.status === "fulfilled") setPowerOutages(outages.value);
      if (flood.status === "fulfilled") setFloodZones(flood.value);
      if (sensors.status === "fulfilled") setSensorReadings(sensors.value);

      // Surface a partial-failure message if everything failed
      const allFailed = [warnings, outages, flood, sensors].every(
        (r) => r.status === "rejected",
      );
      if (allFailed) {
        setError("Failed to load environmental data");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load environmental data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, pollInterval);
    return () => clearInterval(id);
  }, [fetchAll, pollInterval]);

  return {
    weatherWarnings,
    powerOutages,
    floodZones,
    sensorReadings,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
