import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAirQualityIndex,
  getCurrentWeather,
  listActiveWeatherWarnings,
  listAmbulanceLocations,
  listFireStationLocations,
  listHospitalLocations,
  listKeywordHits,
  listPoliceStationLocations,
  listPowerOutages,
  listSensorReadings,
  listTrafficIncidents,
  listUnconfirmedWarnings,
} from "../services/observability.api";
import type {
  FireStationLocation,
  HospitalLocation,
  KeywordHit,
  PoliceStationLocation,
  UnconfirmedWarning,
  WeatherWarning,
} from "../types/observability.types";

// Weather hook

interface ObsWeatherData {
  current: any | null;
  warnings: WeatherWarning[];
  airQuality: any | null;
}

export function useObservabilityWeather(pollInterval = 600_000) {
  const [data, setData] = useState<ObsWeatherData>({
    current: null,
    warnings: [],
    airQuality: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setError(null);
    try {
      const [current, warnings, airQuality] = await Promise.allSettled([
        getCurrentWeather(),
        listActiveWeatherWarnings(),
        getAirQualityIndex(),
      ]);
      setData({
        current: current.status === "fulfilled" ? current.value : null,
        warnings: warnings.status === "fulfilled" ? warnings.value : [],
        airQuality: airQuality.status === "fulfilled" ? airQuality.value : null,
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to load weather");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, pollInterval);
    return () => clearInterval(id);
  }, [fetchWeather, pollInterval]);

  return { data, isLoading, error, refetch: fetchWeather };
}

// Social / News feed hook

export interface FeedItem {
  id: string;
  source: "keyword" | "warning";
  title: string;
  content: string;
  platform?: string;
  category?: string;
  credibility?: number;
  timestamp: string;
  location?: { latitude: number; longitude: number };
}

export function useSocialFeed(pollInterval = 30_000) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setError(null);
    try {
      const [keywordHits, warnings] = await Promise.allSettled([
        listKeywordHits({ page_size: 15 }),
        listUnconfirmedWarnings({ page_size: 10 }),
      ]);

      const mapped: FeedItem[] = [];

      if (keywordHits.status === "fulfilled") {
        keywordHits.value.forEach((hit: KeywordHit) => {
          mapped.push({
            id: hit.id,
            source: "keyword",
            title: hit.keyword,
            content: hit.content,
            platform: hit.platform,
            category: hit.category,
            timestamp: hit.detected_at,
            location: hit.location ?? undefined,
          });
        });
      }

      if (warnings.status === "fulfilled") {
        warnings.value.forEach((w: UnconfirmedWarning) => {
          mapped.push({
            id: w.id,
            source: "warning",
            title: w.warning_type,
            content: w.description,
            credibility: w.credibility,
            timestamp: w.last_reported,
            location: w.location ?? undefined,
          });
        });
      }

      mapped.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      setItems(mapped);
    } catch (e: any) {
      setError(e.message ?? "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const id = setInterval(fetchFeed, pollInterval);
    return () => clearInterval(id);
  }, [fetchFeed, pollInterval]);

  return { items, isLoading, error, refetch: fetchFeed };
}

// Map data layers hook

export type LayerName =
  | "hospitals"
  | "fireStations"
  | "policeStations"
  | "ambulances"
  | "trafficIncidents"
  | "powerOutages"
  | "waterSensors";

export interface MapLayerData {
  hospitals: HospitalLocation[];
  fireStations: FireStationLocation[];
  policeStations: PoliceStationLocation[];
  ambulances: any[];
  trafficIncidents: any[];
  powerOutages: any[];
  waterSensors: any[];
}

const EMPTY_LAYERS: MapLayerData = {
  hospitals: [],
  fireStations: [],
  policeStations: [],
  ambulances: [],
  trafficIncidents: [],
  powerOutages: [],
  waterSensors: [],
};

const COUNTRY_ID = 105; // Ireland

// Items where lat === 0 && lng === 0 have no real location - exclude them.
function hasTopLevelCoords(item: {
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  const lat = item.latitude;
  const lng = item.longitude;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    (lat !== 0 || lng !== 0)
  );
}

function hasNestedCoords(item: {
  location?: { latitude?: number | null; longitude?: number | null } | null;
}): boolean {
  const lat = item.location?.latitude;
  const lng = item.location?.longitude;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    (lat !== 0 || lng !== 0)
  );
}

export interface MapBoundsParam {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function useMapLayers(enabledLayers: Set<LayerName>, bounds?: MapBoundsParam) {
  const [layerData, setLayerData] = useState<MapLayerData>(EMPTY_LAYERS);
  const [isLoading, setIsLoading] = useState(false);
  // Track which layers have already been fetched so we only call the API for
  // newly-toggled-on layers instead of re-fetching everything on each toggle.
  const prevEnabledRef = useRef<Set<LayerName>>(new Set());
  const prevBoundsRef = useRef<MapBoundsParam | undefined>();

  // Stable fetch function - accepts an explicit list of layers to (re-)fetch.
  const fetchSpecificLayers = useCallback(async (layers: LayerName[], bbox?: MapBoundsParam) => {
    if (layers.length === 0) return;
    setIsLoading(true);
    const updates: Partial<MapLayerData> = {};
    const jobs: Promise<void>[] = [];
    const layerSet = new Set(layers);
    const bboxParams = bbox
      ? { bbox: `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}` }
      : undefined;

    if (layerSet.has("hospitals")) {
      jobs.push(
        listHospitalLocations(COUNTRY_ID, bboxParams).then((d) => {
          updates.hospitals = d.filter(hasTopLevelCoords);
        }),
      );
    }
    if (layerSet.has("fireStations")) {
      jobs.push(
        listFireStationLocations(COUNTRY_ID, bboxParams).then((d) => {
          updates.fireStations = d.filter(hasTopLevelCoords);
        }),
      );
    }
    if (layerSet.has("policeStations")) {
      jobs.push(
        listPoliceStationLocations(COUNTRY_ID, bboxParams).then((d) => {
          updates.policeStations = d.filter(hasTopLevelCoords);
        }),
      );
    }
    if (layerSet.has("ambulances")) {
      jobs.push(
        listAmbulanceLocations(COUNTRY_ID).then((d) => {
          updates.ambulances = d.filter(hasNestedCoords);
        }),
      );
    }
    if (layerSet.has("trafficIncidents")) {
      jobs.push(
        listTrafficIncidents("dublin").then((d) => {
          updates.trafficIncidents = d.filter(hasNestedCoords);
        }),
      );
    }
    if (layerSet.has("powerOutages")) {
      // PowerOutage uses a BoundingBox area, not a point coordinate -
      // no coordinate filter applies here.
      jobs.push(
        listPowerOutages("dublin").then((d) => {
          updates.powerOutages = d;
        }),
      );
    }
    if (layerSet.has("waterSensors")) {
      jobs.push(
        listSensorReadings(COUNTRY_ID).then((d) => {
          updates.waterSensors = d.filter(hasTopLevelCoords);
        }),
      );
    }

    await Promise.allSettled(jobs);
    setLayerData((prev) => ({ ...prev, ...updates }));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const prev = prevEnabledRef.current;
    const prevBounds = prevBoundsRef.current;
    const added: LayerName[] = [];
    const removed: LayerName[] = [];

    for (const layer of enabledLayers) {
      if (!prev.has(layer)) added.push(layer);
    }
    for (const layer of prev) {
      if (!enabledLayers.has(layer)) removed.push(layer);
    }

    // Detect bounds change
    const boundsChanged =
      bounds !== prevBounds &&
      (bounds?.minLat !== prevBounds?.minLat ||
        bounds?.maxLat !== prevBounds?.maxLat ||
        bounds?.minLon !== prevBounds?.minLon ||
        bounds?.maxLon !== prevBounds?.maxLon);

    prevEnabledRef.current = new Set(enabledLayers);
    prevBoundsRef.current = bounds;

    // Clear data for layers that were just toggled off.
    if (removed.length > 0) {
      setLayerData((current) => {
        const next = { ...current };
        for (const layer of removed) {
          (next as any)[layer] = [];
        }
        return next;
      });
    }

    if (boundsChanged && added.length === 0) {
      // Bounds changed - re-fetch all currently enabled geographic layers
      const geoLayers: LayerName[] = ["hospitals", "fireStations", "policeStations"];
      const toRefresh = geoLayers.filter((l) => enabledLayers.has(l));
      fetchSpecificLayers(toRefresh, bounds);
    } else {
      // Only fetch layers that were just toggled on.
      fetchSpecificLayers(added, bounds);
    }
  }, [enabledLayers, bounds, fetchSpecificLayers]);

  // Manual full-refresh of all currently-enabled layers.
  const refetch = useCallback(() => {
    fetchSpecificLayers([...enabledLayers] as LayerName[], bounds);
  }, [enabledLayers, bounds, fetchSpecificLayers]);

  return { layerData, isLoading, refetch };
}
