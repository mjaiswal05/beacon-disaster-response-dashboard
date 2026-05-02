import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Expand,
  Filter,
  Flame,
  FlaskConical,
  HeartPulse,
  HelpCircle,
  Mountain,
  PowerOff,
  Radiation,
  Shield,
  ShieldCheck,
  Sun,
  Truck,
  Waves,
  Wind,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  createIncident as coreCreateIncident,
  searchLocations,
} from "../../services/core.api";
import {
  fadeUp,
  springGentle,
  staggerContainer
} from "../../utils/animations";
import { MapWrapper } from "../organisms/MapWrapper";
import type { MapBounds } from "../organisms/TomTomMap";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

// Command Center panels
import {
  SEV_LABEL as PCODE_TO_LABEL,
  SEVERITY_HEX,
  SEVERITY_PCODE,
} from "../../constants/constants";
import { useCounties } from "../../hooks/useCounties";
import { useDispatches } from "../../hooks/useDispatches";
import { useEnvironmentalAlerts } from "../../hooks/useEnvironmentalAlerts";
import { useEvacuations } from "../../hooks/useEvacuations";
import { useIncidents } from "../../hooks/useIncidents";
import { useMetrics } from "../../hooks/useMetrics";
import {
  useMapLayers,
  useSocialFeed,
  type LayerName,
} from "../../hooks/useObservability";
import { MapLayerPanel } from "../molecules/MapLayerPanel";
import { DispatchOverview } from "../organisms/DispatchOverview";
import { EnvironmentalPanel } from "../organisms/EnvironmentalPanel";
import { EvacuationOverview } from "../organisms/EvacuationOverview";

interface ERTDashboardProps {
  onNavigate: (screen: string, incidentId?: string) => void;
}

type IncidentPanelTab = "citizensPending" | "automatedPending" | "active";

// ── Component ───────────────────────────────────────────────────

export function ERTDashboard({ onNavigate }: ERTDashboardProps) {
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapSeverityFilter, setMapSeverityFilter] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState<string>("all");
  const [isLogIncidentModalOpen, setIsLogIncidentModalOpen] = useState(false);
  const [isLoggingIncident, setIsLoggingIncident] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // ── Incident panel pagination ─────────────────────────────
  const INCIDENTS_PER_PAGE = 5;
  const [incidentPanelTab, setIncidentPanelTab] = useState<IncidentPanelTab>("citizensPending");
  const [citizensPendingPage, setCitizensPendingPage] = useState(0);
  const [automatedPendingPage, setAutomatedPendingPage] = useState(0);
  const [activePage, setActivePage] = useState(0);

  // ── Incident data ─────────────────────────────────────────
  // Separate streams keep panel tabs consistent with server-side filtering.
  const {
    incidents: rawMapIncidents,
    isLoading: isLoadingMapIncidents,
    refetch: refetchMapIncidents,
  } = useIncidents(1000, 30_000);

  const {
    incidents: rawCitizensPendingIncidents,
    isLoading: isLoadingCitizensPendingIncidents,
    error: citizensPendingIncidentsError,
    refetch: refetchCitizensPendingIncidents,
  } = useIncidents(1000, 30_000, {
    status: "reported",
    isInternal: false,
  });

  const {
    incidents: rawAutomatedPendingIncidents,
    isLoading: isLoadingAutomatedPendingIncidents,
    error: automatedPendingIncidentsError,
    refetch: refetchAutomatedPendingIncidents,
  } = useIncidents(1000, 30_000, {
    status: "reported",
    isInternal: true,
  });

  const {
    incidents: rawActiveIncidents,
    isLoading: isLoadingActiveIncidents,
    error: activeIncidentsError,
    refetch: refetchActiveIncidents,
  } = useIncidents(1000, 30_000, {
    status: "reported",
  });

  // ── Command Center hooks ──────────────────────────────────
  const { counties } = useCounties();
  const { metrics } = useMetrics();
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerName>>(new Set());
  const [mapBounds, setMapBounds] = useState<MapBounds | undefined>();
  const { layerData, isLoading: isLoadingLayers } = useMapLayers(enabledLayers, mapBounds);
  const {
    items: feedItems,
    isLoading: isFeedLoading,
    error: feedError,
    refetch: refetchFeed,
  } = useSocialFeed();

  const {
    dispatches,
    isLoading: isDispatchLoading,
    error: dispatchError,
    refetch: refetchDispatches,
  } = useDispatches();
  const {
    evacuations,
    isLoading: isEvacLoading,
    error: evacError,
  } = useEvacuations();
  const {
    weatherWarnings,
    powerOutages,
    floodZones,
    isLoading: isEnvLoading,
    error: envError,
    refetch: refetchEnv,
  } = useEnvironmentalAlerts();

  const handleToggleLayer = useCallback((layer: LayerName) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  // Transform layerData into MapStation[] for TomTomMap station markers
  const mergedStations = useMemo(() => {
    const stations: Array<{
      source_id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      distance_km: number;
      role: "medics" | "firefighters" | "police";
    }> = [];
    for (const h of layerData.hospitals) {
      stations.push({
        source_id: h.source_id,
        name: h.name,
        address: h.address,
        latitude: h.latitude,
        longitude: h.longitude,
        distance_km: 0,
        role: "medics",
      });
    }
    for (const f of layerData.fireStations) {
      stations.push({
        source_id: f.source_id,
        name: f.name,
        address: f.address,
        latitude: f.latitude,
        longitude: f.longitude,
        distance_km: 0,
        role: "firefighters",
      });
    }
    for (const p of layerData.policeStations) {
      stations.push({
        source_id: p.source_id,
        name: p.name,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        distance_km: 0,
        role: "police",
      });
    }
    return stations;
  }, [layerData.hospitals, layerData.fireStations, layerData.policeStations]);

  const layerCounts = useMemo(
    () => ({
      hospitals: layerData.hospitals.length,
      fireStations: layerData.fireStations.length,
      policeStations: layerData.policeStations.length,
      ambulances: layerData.ambulances.length,
      trafficIncidents: layerData.trafficIncidents.length,
      powerOutages: layerData.powerOutages.length,
      waterSensors: layerData.waterSensors.length,
    }),
    [layerData],
  );

  const [weather, setWeather] = useState<{
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
    precipitation: number;
    cloudCover: number;
  } | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const [incidentForm, setIncidentForm] = useState({
    title: "",
    description: "",
    type: "",
    severity: "P0",
    address: "",
    latitude: 53.341584351173665,
    longitude: -6.253216313519239,
    affected_radius: 50,
  });


  /** Header date/time - computed once on mount */
  const liveDateTime = useMemo(() => {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} · ${time}`;
  }, []);

  // ── Helpers ─────────────────────────────────────────────────

  const INCIDENT_TYPE_MAP: Record<string, { icon: ComponentType<any>; color: string; label: string }> = {
    fire: { icon: Flame, color: "#FF453A", label: "Fire" },
    flood: { icon: Droplets, color: "#64D2FF", label: "Flood" },
    earthquake: { icon: Mountain, color: "#FF9F0A", label: "Earthquake" },
    accident: { icon: Car, color: "#2563EB", label: "Accident" },
    tsunami: { icon: Waves, color: "#64D2FF", label: "Tsunami" },
    landslide: { icon: AlertTriangle, color: "#FF9F0A", label: "Landslide" },
    explosion: { icon: Zap, color: "#FF453A", label: "Explosion" },
    gas_leak: { icon: FlaskConical, color: "#9333EA", label: "Gas Leak" },
    power_outage: { icon: PowerOff, color: "#FF9F0A", label: "Power Outage" },
    structural_failure: { icon: Building2, color: "#FF9F0A", label: "Structural" },
    terror_attack: { icon: Shield, color: "#FF453A", label: "Terror Attack" },
    chemical_spill: { icon: Radiation, color: "#9333EA", label: "Chemical Spill" },
    wildfire: { icon: Flame, color: "#FF6B00", label: "Wildfire" },
    cyclone: { icon: Wind, color: "#64D2FF", label: "Cyclone" },
    medical_emergency: { icon: HeartPulse, color: "#32D74B", label: "Medical" },
    other: { icon: HelpCircle, color: "#8A8F98", label: "Other" },
  };

  const getIncidentIcon = (type: string) =>
    (INCIDENT_TYPE_MAP[type.toLowerCase()] ?? INCIDENT_TYPE_MAP.other).icon;

  const getIncidentTypeColor = (type: string) =>
    (INCIDENT_TYPE_MAP[type.toLowerCase()] ?? INCIDENT_TYPE_MAP.other).color;

  const getIncidentTypeLabel = (type: string) =>
    (INCIDENT_TYPE_MAP[type.toLowerCase()] ?? INCIDENT_TYPE_MAP.other).label;

  const getSeverityLabel = (severity: string) => {
    const severityMap: { [key: string]: string } = {
      P0: "Catastrophic",
      P1: "Critical",
      P2: "Serious",
      P3: "High",
      P4: "Medium",
      P5: "Low",
      P6: "Advisory",
    };
    return severityMap[severity] || "Medium";
  };

  const getWeatherInfo = (code: number, _isDay: boolean) => {
    const weatherMap: {
      [key: number]: { description: string; icon: any; color: string };
    } = {
      0: { description: "Clear sky", icon: Sun, color: "text-yellow-400" },
      1: { description: "Mainly clear", icon: Sun, color: "text-yellow-400" },
      2: {
        description: "Partly cloudy",
        icon: Cloud,
        color: "text-muted-foreground",
      },
      3: { description: "Overcast", icon: Cloud, color: "text-gray-500" },
      45: {
        description: "Foggy",
        icon: CloudFog,
        color: "text-muted-foreground",
      },
      48: {
        description: "Rime fog",
        icon: CloudFog,
        color: "text-muted-foreground",
      },
      51: {
        description: "Light drizzle",
        icon: CloudRain,
        color: "text-blue-400",
      },
      53: {
        description: "Moderate drizzle",
        icon: CloudRain,
        color: "text-blue-400",
      },
      55: {
        description: "Dense drizzle",
        icon: CloudRain,
        color: "text-blue-500",
      },
      61: {
        description: "Slight rain",
        icon: CloudRain,
        color: "text-blue-400",
      },
      63: {
        description: "Moderate rain",
        icon: CloudRain,
        color: "text-blue-500",
      },
      65: {
        description: "Heavy rain",
        icon: CloudRain,
        color: "text-blue-600",
      },
      71: { description: "Slight snow", icon: CloudSnow, color: "text-white" },
      73: {
        description: "Moderate snow",
        icon: CloudSnow,
        color: "text-white",
      },
      75: { description: "Heavy snow", icon: CloudSnow, color: "text-white" },
      80: {
        description: "Rain showers",
        icon: CloudRain,
        color: "text-blue-400",
      },
      95: {
        description: "Thunderstorm",
        icon: CloudLightning,
        color: "text-yellow-500",
      },
      96: {
        description: "Thunderstorm + hail",
        icon: CloudLightning,
        color: "text-yellow-500",
      },
    };
    return (
      weatherMap[code] || {
        description: "Unknown",
        icon: Cloud,
        color: "text-muted-foreground",
      }
    );
  };

  const getWindDirection = (degrees: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(degrees / 45) % 8];
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "Unknown time";
    try {
      const now = new Date();
      const incidentTime = new Date(timestamp);
      const diffInMinutes = Math.floor(
        (now.getTime() - incidentTime.getTime()) / (1000 * 60),
      );
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } catch {
      return "Unknown time";
    }
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const normalizeIncidentType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      snow: "Snow Storm",
      string: "Emergency Alert",
      "Gas Leak": "Gas Leak",
      Fire: "Fire",
      Flood: "Flood",
    };
    return typeMap[type] || capitalizeFirst(type);
  };

  // ── Derived incident data ────────────────────────────────────
  // Placed here so all helper functions above are already initialised.

  const toIncidentViewModel = (apiIncident: any, index: number) => ({
    id: apiIncident.id || String(index + 1),
    type: normalizeIncidentType(apiIncident.type || "Other"),
    severity: getSeverityLabel(apiIncident.severity) || "Medium",
    location: apiIncident.location?.address || "Unknown Location",
    time: formatTimeAgo(apiIncident.created_at) || "Unknown",
    units:
      ({ P0: 3, P1: 2, P2: 1, P3: 1 } as Record<string, number>)[
      apiIncident.severity
      ] ?? 1,
    status: capitalizeFirst(apiIncident.status) || "Reported",
    approved: apiIncident.approved ?? false,
    lat: apiIncident.location?.latitude || 53.3498,
    lng: apiIncident.location?.longitude || -6.2603,
    icon: getIncidentIcon(apiIncident.type || "other"),
    color: getIncidentTypeColor(apiIncident.type || "other"),
    title: apiIncident.title,
    description: apiIncident.description,
    is_internal: apiIncident.is_internal,
    affected_radius: undefined as number | undefined,
    reportedBy: undefined as string | undefined,
    verifiedBy: undefined as string | undefined,
    updatedAt: apiIncident.updated_at,
  });

  /** View-model shape used by map and panel incident lists */
  const transformedMapIncidents = useMemo(
    () => rawMapIncidents.map(toIncidentViewModel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawMapIncidents],
  );

  // ── Derived / memoised ──────────────────────────────────────

  const citizensPendingList = useMemo(
    () => rawCitizensPendingIncidents.map(toIncidentViewModel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawCitizensPendingIncidents],
  );

  const automatedPendingList = useMemo(
    () => rawAutomatedPendingIncidents.map(toIncidentViewModel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawAutomatedPendingIncidents],
  );

  const activeList = useMemo(
    () => rawActiveIncidents.map(toIncidentViewModel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawActiveIncidents],
  );

  const citizensPendingTotalPages = Math.max(
    1,
    Math.ceil(citizensPendingList.length / INCIDENTS_PER_PAGE),
  );
  const automatedPendingTotalPages = Math.max(
    1,
    Math.ceil(automatedPendingList.length / INCIDENTS_PER_PAGE),
  );
  const activeTotalPages = Math.max(
    1,
    Math.ceil(activeList.length / INCIDENTS_PER_PAGE),
  );
  const citizensPendingPageItems = citizensPendingList.slice(
    citizensPendingPage * INCIDENTS_PER_PAGE,
    (citizensPendingPage + 1) * INCIDENTS_PER_PAGE,
  );
  const automatedPendingPageItems = automatedPendingList.slice(
    automatedPendingPage * INCIDENTS_PER_PAGE,
    (automatedPendingPage + 1) * INCIDENTS_PER_PAGE,
  );
  const activePageItems = activeList.slice(
    activePage * INCIDENTS_PER_PAGE,
    (activePage + 1) * INCIDENTS_PER_PAGE,
  );

  const isCitizensPendingTabActive = incidentPanelTab === "citizensPending";
  const isAutomatedPendingTabActive = incidentPanelTab === "automatedPending";

  const selectedIncidentItems = isCitizensPendingTabActive
    ? citizensPendingPageItems
    : isAutomatedPendingTabActive
      ? automatedPendingPageItems
      : activePageItems;
  const selectedIncidentPage = isCitizensPendingTabActive
    ? citizensPendingPage
    : isAutomatedPendingTabActive
      ? automatedPendingPage
      : activePage;
  const selectedIncidentTotalPages = isCitizensPendingTabActive
    ? citizensPendingTotalPages
    : isAutomatedPendingTabActive
      ? automatedPendingTotalPages
      : activeTotalPages;

  const selectedIncidentSectionLabel = isCitizensPendingTabActive
    ? "Citizens Pending"
    : isAutomatedPendingTabActive
      ? "Automated Pending"
      : "Active Incidents";

  const selectedIncidentEmptyTitle = isCitizensPendingTabActive
    ? "No citizen pending incidents"
    : isAutomatedPendingTabActive
      ? "No automated pending incidents"
      : "No active incidents";

  const selectedIncidentEmptyHint = isCitizensPendingTabActive
    ? "Awaiting new citizen reports"
    : isAutomatedPendingTabActive
      ? "Awaiting new automated alerts"
      : "All clear for now";

  const isIncidentPanelLoading = isCitizensPendingTabActive
    ? isLoadingCitizensPendingIncidents
    : isAutomatedPendingTabActive
      ? isLoadingAutomatedPendingIncidents
      : isLoadingActiveIncidents;

  const incidentPanelError = isCitizensPendingTabActive
    ? citizensPendingIncidentsError
    : isAutomatedPendingTabActive
      ? automatedPendingIncidentsError
      : activeIncidentsError;

  const isRefreshingIncidents =
    isLoadingCitizensPendingIncidents ||
    isLoadingAutomatedPendingIncidents ||
    isLoadingActiveIncidents ||
    isLoadingMapIncidents;

  const handleRefreshIncidentStreams = () => {
    void refetchMapIncidents();
    void refetchCitizensPendingIncidents();
    void refetchAutomatedPendingIncidents();
    void refetchActiveIncidents();
  };

  const goToPreviousIncidentPage = () => {
    if (isCitizensPendingTabActive) {
      setCitizensPendingPage((page) => Math.max(0, page - 1));
    } else if (isAutomatedPendingTabActive) {
      setAutomatedPendingPage((page) => Math.max(0, page - 1));
    } else {
      setActivePage((page) => Math.max(0, page - 1));
    }
  };

  const goToNextIncidentPage = () => {
    if (isCitizensPendingTabActive) {
      setCitizensPendingPage((page) =>
        Math.min(citizensPendingTotalPages - 1, page + 1),
      );
    } else if (isAutomatedPendingTabActive) {
      setAutomatedPendingPage((page) =>
        Math.min(automatedPendingTotalPages - 1, page + 1),
      );
    } else {
      setActivePage((page) => Math.min(activeTotalPages - 1, page + 1));
    }
  };

  /**
   * Incidents shown on the map.
   * Server already delivers them sorted newest-first; here we:
   *   1. Exclude resolved / closed (keep operational picture clean)
   *   2. Optionally restrict to a single county via address substring
   *   3. Optionally filter by the severity pill the operator selected
   */
  const displayedMapIncidents = useMemo(() => {
    const CLOSED_STATUSES = ["resolved", "closed"];
    let list = transformedMapIncidents.filter(
      (i) => !CLOSED_STATUSES.includes((i.status ?? "").toLowerCase()),
    );
    if (selectedCounty !== "all") {
      list = list.filter((i) =>
        (i.location?.toLowerCase() || "").includes(selectedCounty.toLowerCase()),
      );
    }
    if (mapSeverityFilter !== "all") {
      const targetLabel = PCODE_TO_LABEL[mapSeverityFilter];
      list = list.filter((i) => i.severity === targetLabel);
    }
    return list;
  }, [transformedMapIncidents, selectedCounty, mapSeverityFilter]);

  // ── Fetch functions ─────────────────────────────────────────

  const fetchWeather = async () => {
    setIsLoadingWeather(true);
    try {
      const lat = 53.3498;
      const lon = -6.2603;
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,is_day&timezone=Europe%2FDublin`,
      );
      if (response.ok) {
        const data = await response.json();
        setWeather({
          temperature: data.current.temperature_2m,
          apparentTemperature: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          precipitation: data.current.precipitation,
          cloudCover: data.current.cloud_cover,
        });
      }
    } catch (error) {
      console.error("Failed to fetch weather:", error);
    } finally {
      setIsLoadingWeather(false);
    }
  };


  // ── Location search (for log incident modal) ────────────────

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    setIsSearchingLocation(true);
    try {
      const results = await searchLocations(query, 5);
      if (results.length > 0) {
        setLocationSuggestions(results);
        setShowLocationSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleLocationSelect = (suggestion: any) => {
    setIncidentForm((prev) => ({
      ...prev,
      address: suggestion.display_name,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
    }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleSubmitIncident = async () => {
    setIsLoggingIncident(true);
    try {
      const payload = {
        affected_radius: incidentForm.affected_radius,
        description: incidentForm.description,
        location: {
          address: incidentForm.address,
          latitude: incidentForm.latitude,
          longitude: incidentForm.longitude,
        },
        severity: incidentForm.severity,
        title: incidentForm.title,
        type: incidentForm.type,
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const result = await coreCreateIncident(payload, controller.signal);
      clearTimeout(timeoutId);
      const newIncidentId = result?.data?.id;

      // Refetch (below) will pick up the new incident within 1 s
      void newIncidentId;
      setIncidentForm({
        title: "",
        description: "",
        type: "",
        severity: "P0",
        address: "",
        latitude: 53.341584351173665,
        longitude: -6.253216313519239,
        affected_radius: 50,
      });
      setIsLogIncidentModalOpen(false);
      setTimeout(() => {
        handleRefreshIncidentStreams();
      }, 1000);
    } catch (error: any) {
      if (error.name === "AbortError") {
        alert(
          "Request timed out. The server may be unavailable. Please try again.",
        );
      } else {
        alert(
          `Failed to log incident: ${error.message || "Please try again."}`,
        );
      }
    } finally {
      setIsLoggingIncident(false);
    }
  };

  // ── Effects ─────────────────────────────────────────────────

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (incidentForm.address) {
        searchLocation(incidentForm.address);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [incidentForm.address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".location-search-container")) {
        setShowLocationSuggestions(false);
      }
    };
    if (showLocationSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showLocationSuggestions]);

  useEffect(() => {
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, []);

  // Reset panel pagination whenever the tab datasets refresh
  useEffect(() => {
    setCitizensPendingPage(0);
  }, [rawCitizensPendingIncidents]);

  useEffect(() => {
    setAutomatedPendingPage(0);
  }, [rawAutomatedPendingIncidents]);

  useEffect(() => {
    setActivePage(0);
  }, [rawActiveIncidents]);

  // ── Render ───────────────────────────────────────────────────

  const weatherInfo = weather
    ? getWeatherInfo(weather.weatherCode, weather.isDay)
    : null;
  const WeatherIcon = weatherInfo?.icon ?? Cloud;

  const resolvedIncidents = Math.max(
    0,
    metrics.total_incidents - metrics.active_incidents,
  );
  const resolutionRate =
    metrics.total_incidents > 0
      ? Math.round((resolvedIncidents / metrics.total_incidents) * 100)
      : null;

  const metricCards = [
    {
      title: "Active Incidents",
      value: String(metrics.active_incidents),
      hint: `${metrics.total_incidents} total`,
      hintColor: "#FF453A",
      icon: AlertTriangle,
      iconColor: "#FF453A",
      iconBackground: "rgba(255, 69, 58, 0.15)",
    },
    {
      title: "Units Deployed",
      value: String(dispatches.length),
      hint: `${dispatches.filter((d) => d.status === "in_progress").length} in progress`,
      hintColor:
        dispatches.length > 0 ? "#2563EB" : "var(--muted-foreground)",
      icon: Truck,
      iconColor: "#2563EB",
      iconBackground: "rgba(37, 99, 235, 0.15)",
    },
    {
      title: "Resolution Rate",
      value: resolutionRate != null ? `${resolutionRate}%` : "-",
      hint: `${resolvedIncidents} resolved`,
      hintColor:
        resolutionRate != null && resolutionRate >= 80 ? "#32D74B" : "#FF9F0A",
      icon: ShieldCheck,
      iconColor: "#32D74B",
      iconBackground: "rgba(50, 215, 75, 0.15)",
    },
  ] as const;

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ───────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
      >
        <div>
          <h1
            className="text-foreground"
            style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.3 }}
          >
            Command Center
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            {liveDateTime}
          </p>
        </div>

        {/* Weather pill */}
        {isLoadingWeather ? (
          <motion.div
            className="flex items-center gap-3 px-4 py-2 rounded-[14px]"
            style={{
              background: "var(--card)",
              border: "1px solid var(--secondary)",
            }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springGentle}
          >
            <div className="w-4 h-4 border border-gray-500 border-t-transparent rounded-full animate-spin" />
            <span
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
            >
              Loading weather…
            </span>
          </motion.div>
        ) : weather && weatherInfo ? (
          <motion.div
            className="flex items-center gap-3 px-4 py-2 rounded-[14px]"
            style={{
              background: "var(--card)",
              border: "1px solid var(--secondary)",
            }}
            aria-label="Current weather conditions"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={springGentle}
          >
            <WeatherIcon
              className={`w-5 h-5 ${weatherInfo.color}`}
              aria-hidden="true"
            />
            <div>
              <span
                className="text-foreground"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                {Math.round(weather.temperature)}°C
              </span>
              <span
                className="ml-2"
                style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
              >
                {weatherInfo.description}
              </span>
            </div>
            <div
              className="flex items-center gap-3 ml-2 pl-3"
              style={{ borderLeft: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-1">
                <Wind
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-hidden="true"
                />
                <span
                  style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                >
                  {Math.round(weather.windSpeed)} km/h{" "}
                  {getWindDirection(weather.windDirection)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-hidden="true"
                />
                <span
                  style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                >
                  {weather.humidity}%
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        variants={staggerContainer}
      >
        {metricCards.map((card) => (
          <motion.div
            key={card.title}
            className="rounded-[16px] p-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--secondary)",
            }}
            variants={fadeUp}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
              >
                {card.title}
              </span>
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{ background: card.iconBackground }}
              >
                <card.icon
                  className="w-[18px] h-[18px]"
                  style={{ color: card.iconColor }}
                  aria-hidden="true"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span
                className="text-foreground"
                style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1 }}
              >
                {card.value}
              </span>
              <span
                className="mb-1"
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: card.hintColor,
                }}
              >
                {card.hint}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>


      {/* ── Main Grid: Map + Incidents ────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5"
        variants={staggerContainer}
      >
        {/* Live Map */}
        <motion.div
          className="relative rounded-[20px] overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
            height: "calc(100vh - 310px)",
            minHeight: 440,
          }}
          aria-label="Live incident map"
          variants={fadeUp}
        >
          {/* TomTom map fills the entire card - z-0 keeps markers below overlays */}
          <div className="absolute inset-0 z-0">
            <MapWrapper
              incidents={displayedMapIncidents}
              onIncidentClick={(incidentId) =>
                onNavigate("incident", incidentId)
              }
              countyCenter={counties.find(
                (c) => c.value === selectedCounty,
              )}
              stations={mergedStations}
              onBoundsChange={setMapBounds}
            />
          </div>

          {/* Top-left: title + live dot */}
          <div
            className="absolute top-4 left-4 z-[1100] flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
            style={{
              background: "rgba(20, 20, 20, 0.85)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
            }}
          >
            <span
              className="text-foreground"
              style={{ fontSize: "13px", fontWeight: 600 }}
            >
              Live Map
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "#32D74B",
                boxShadow: "0 0 8px rgba(50, 215, 75, 0.6)",
              }}
              aria-label="Live data indicator"
            />
          </div>

          {/* Top-right: compact map filters */}
          <div className="absolute top-4 right-4 z-[1100] flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-[10px]"
              style={{
                background: "rgba(20, 20, 20, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid var(--border)",
              }}
            >
              <Filter
                className="w-3.5 h-3.5"
                style={{ color: "var(--muted-foreground)" }}
                aria-hidden="true"
              />
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="bg-transparent focus:outline-none appearance-none cursor-pointer"
                style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                aria-label="Filter map by county"
              >
                {counties.map((county) => (
                  <option
                    key={county.value}
                    value={county.value}
                    style={{ background: "var(--secondary)" }}
                  >
                    {county.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-[10px]"
              style={{
                background: "rgba(20, 20, 20, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid var(--border)",
              }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5"
                style={{ color: "var(--muted-foreground)" }}
                aria-hidden="true"
              />
              <select
                value={mapSeverityFilter}
                onChange={(e) => setMapSeverityFilter(e.target.value)}
                className="bg-transparent focus:outline-none appearance-none cursor-pointer"
                style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                aria-label="Filter map by severity"
              >
                {(["all", "P0", "P1", "P2", "P3", "P4", "P5", "P6"] as const).map((severity) => (
                  <option
                    key={severity}
                    value={severity}
                    style={{ background: "var(--secondary)" }}
                  >
                    {severity === "all" ? "All Severities" : severity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Map layer panel - bottom left above severity legend */}
          <div className="absolute bottom-14 left-4 z-[1100]">
            <MapLayerPanel
              enabledLayers={enabledLayers}
              layerCounts={layerCounts}
              onToggle={handleToggleLayer}
              isLoading={isLoadingLayers}
            />
          </div>

          {/* Bottom-left: severity legend */}
          <div
            className="absolute bottom-4 left-4 z-[1100] flex items-center gap-4 px-4 py-2 rounded-[12px]"
            style={{
              background: "rgba(20, 20, 20, 0.85)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
            }}
          >
            {Object.entries(SEVERITY_HEX).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <span
                  style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
                >
                  {SEVERITY_PCODE[label]}
                </span>
              </div>
            ))}
            <span
              style={{
                color: "var(--muted-foreground)",
                fontSize: "11px",
                borderLeft: "1px solid var(--border)",
                paddingLeft: "12px",
              }}
            >
              {displayedMapIncidents.length} incident
              {displayedMapIncidents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Bottom-right: fullscreen button */}
          <button
            onClick={() => setIsMapFullscreen(true)}
            className="absolute bottom-4 right-4 z-[1100] w-8 h-8 flex items-center justify-center rounded-[10px] transition-colors"
            style={{
              background: "rgba(20, 20, 20, 0.85)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
            }}
            aria-label="Open map fullscreen"
          >
            <Expand
              className="w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
              aria-hidden="true"
            />
          </button>
        </motion.div>

        {/* Incidents Panel */}
        <motion.div
          className="rounded-[20px] flex flex-col overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
            height: "calc(100vh - 310px)",
            minHeight: 440,
          }}
          aria-label="Incidents panel"
          variants={fadeUp}
        >
          <div
            className="px-5 py-3.5 flex items-center justify-between gap-3 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--secondary)" }}
          >
            <div>
              <h3
                className="text-foreground"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                Incidents
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(100,210,255,0.15)",
                  color: "#64D2FF",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                title="Citizens pending"
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                {citizensPendingList.length}
              </span>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,159,10,0.15)",
                  color: "#FF9F0A",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                title="Automated pending"
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {automatedPendingList.length}
              </span>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,69,58,0.15)",
                  color: "#FF453A",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
                aria-live="polite"
                title="Active / verified"
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                {activeList.length}
              </span>
              <button
                onClick={handleRefreshIncidentStreams}
                disabled={isRefreshingIncidents}
                className="px-2 py-0.5 rounded-lg transition-colors text-xs disabled:opacity-50"
                style={{
                  background: "var(--secondary)",
                  color: "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
                aria-label="Refresh incidents"
              >
                {isRefreshingIncidents ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Refresh"
                )}
              </button>
            </div>
          </div>

          {incidentPanelError && (
            <div
              className="mx-4 mt-3 mb-0 p-2.5 rounded-xl flex-shrink-0"
              style={{
                background: "rgba(255,159,10,0.1)",
                border: "1px solid rgba(255,159,10,0.2)",
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ color: "#FF9F0A", fontSize: "12px" }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span role="alert">{incidentPanelError}</span>
              </div>
            </div>
          )}

          <div className="px-4 pt-3 flex-shrink-0 space-y-2">
            <Tabs
              value={incidentPanelTab}
              onValueChange={(value) => setIncidentPanelTab(value as IncidentPanelTab)}
              className="gap-0"
            >
              <TabsList className="h-auto w-full rounded-xl border border-border bg-secondary/70 p-1">
                <TabsTrigger
                  value="citizensPending"
                  className="rounded-lg py-1.5 text-[11px]"
                >
                  Citizens Pending ({citizensPendingList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="automatedPending"
                  className="rounded-lg py-1.5 text-[11px]"
                >
                  Automated Pending ({automatedPendingList.length})
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="rounded-lg py-1.5 text-[11px]"
                >
                  Active ({activeList.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="p-4 flex-1 min-h-0">
            <div
              className="h-full rounded-xl overflow-hidden flex flex-col"
              style={{ border: "1px solid var(--secondary)" }}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid var(--secondary)" }}
              >
                <div className="flex items-center gap-2">
                  {isCitizensPendingTabActive ? (
                    <AlertTriangle
                      className="w-3.5 h-3.5"
                      style={{ color: "#64D2FF" }}
                      aria-hidden="true"
                    />
                  ) : isAutomatedPendingTabActive ? (
                    <ShieldCheck
                      className="w-3.5 h-3.5"
                      style={{ color: "#FF9F0A" }}
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertTriangle
                      className="w-3.5 h-3.5"
                      style={{ color: "#FF453A" }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="text-foreground"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    {selectedIncidentSectionLabel}
                  </span>
                </div>
                <span
                  style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
                >
                  {selectedIncidentItems.length} visible
                </span>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0" aria-busy={isIncidentPanelLoading}>
                {isIncidentPanelLoading && selectedIncidentItems.length === 0 ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl"
                        style={{ background: "var(--secondary)" }}
                      >
                        <div
                          className="h-2.5 rounded animate-pulse w-2/3 mb-2"
                          style={{ background: "var(--border)" }}
                        />
                        <div
                          className="h-2 rounded animate-pulse w-full"
                          style={{ background: "var(--border)" }}
                        />
                      </div>
                    ))}
                  </div>
                ) : selectedIncidentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center">
                    <AlertTriangle
                      className="w-8 h-8 mb-2"
                      style={{ color: "var(--border)" }}
                      aria-hidden="true"
                    />
                    <p className="text-foreground text-xs font-medium">
                      {selectedIncidentEmptyTitle}
                    </p>
                    <p
                      style={{ color: "var(--muted-foreground)", fontSize: "11px" }}
                      className="mt-0.5"
                    >
                      {selectedIncidentEmptyHint}
                    </p>
                  </div>
                ) : (
                  selectedIncidentItems.map((incident) => {
                    const severityColor =
                      SEVERITY_HEX[incident.severity] ?? "var(--muted-foreground)";
                    const pCode = SEVERITY_PCODE[incident.severity] ?? "??";
                    const IncidentIcon = incident.icon ?? AlertTriangle;
                    return (
                      <button
                        key={incident.id}
                        onClick={() => onNavigate("incident", incident.id)}
                        className="w-full text-left px-4 py-3 transition-colors group"
                        style={{ borderBottom: "1px solid rgba(28,28,28,0.8)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--secondary)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${severityColor}20` }}
                            aria-hidden="true"
                          >
                            <IncidentIcon
                              className="w-4 h-4"
                              style={{ color: severityColor }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="block text-foreground truncate"
                                style={{ fontSize: "13px", fontWeight: 600 }}
                              >
                                {incident.title || incident.type}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded"
                                style={{
                                  background: `${severityColor}26`,
                                  color: severityColor,
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                {pCode}
                              </span>
                            </div>
                            <span
                              className="truncate block mt-0.5"
                              style={{
                                color: "var(--muted-foreground)",
                                fontSize: "11px",
                              }}
                            >
                              {incident.location}
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                              <span
                                style={{
                                  color: "var(--muted-foreground)",
                                  fontSize: "11px",
                                }}
                              >
                                {incident.time}
                              </span>
                              <span
                                style={{
                                  color: "var(--muted-foreground)",
                                  fontSize: "11px",
                                }}
                              >
                                {incident.units} units
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "var(--muted-foreground)" }}
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedIncidentTotalPages > 1 && (
                <div
                  className="flex items-center justify-between px-4 py-1.5 flex-shrink-0"
                  style={{ borderTop: "1px solid var(--secondary)" }}
                >
                  <button
                    onClick={goToPreviousIncidentPage}
                    disabled={selectedIncidentPage === 0}
                    className="p-1 rounded transition-colors hover:bg-secondary disabled:opacity-30"
                    aria-label="Previous incident page"
                  >
                    <ChevronLeft
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--muted-foreground)" }}
                    />
                  </button>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
                    {selectedIncidentPage + 1} / {selectedIncidentTotalPages}
                  </span>
                  <button
                    onClick={goToNextIncidentPage}
                    disabled={selectedIncidentPage === selectedIncidentTotalPages - 1}
                    className="p-1 rounded transition-colors hover:bg-secondary disabled:opacity-30"
                    aria-label="Next incident page"
                  >
                    <ChevronRight
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--muted-foreground)" }}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Command Center Bottom Grid ─────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        variants={staggerContainer}
      >
        {/* Dispatch & Evacuation */}
        <div className="space-y-5">
          <DispatchOverview
            dispatches={dispatches}
            isLoading={isDispatchLoading}
            error={dispatchError}
            onNavigate={onNavigate}
            onRefresh={refetchDispatches}
          />
          <EvacuationOverview
            evacuations={evacuations}
            isLoading={isEvacLoading}
            error={evacError}
            onNavigate={onNavigate}
          />
        </div>

        {/* Environmental Alerts */}
        <EnvironmentalPanel
          weatherWarnings={weatherWarnings}
          powerOutages={powerOutages}
          floodZones={floodZones}
          isLoading={isEnvLoading}
          error={envError}
          onRefetch={refetchEnv}
        />
      </motion.div>

      {/* ── Fullscreen Map Modal ──────────────────────────────── */}
      <AnimatePresence>
        {isMapFullscreen && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-background flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{
                background: "var(--card)",
                borderBottom: "1px solid var(--secondary)",
              }}
            >
              <div className="flex items-center gap-4">
                <h2 className="text-foreground text-xl font-semibold">
                  Live Incident Map
                </h2>
                <div className="flex items-center gap-4 text-xs">
                  {Object.entries(SEVERITY_HEX).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsMapFullscreen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors hover:bg-secondary"
                style={{ border: "1px solid var(--border)" }}
                aria-label="Close fullscreen map"
              >
                <X
                  className="w-5 h-5"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="flex-1 relative">
              <MapWrapper
                incidents={displayedMapIncidents}
                onIncidentClick={(incidentId) =>
                  onNavigate("incident", incidentId)
                }
                countyCenter={counties.find(
                  (c) => c.value === selectedCounty,
                )}
                stations={mergedStations}
                onBoundsChange={setMapBounds}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Log Incident Modal (internal form with geocoding) ─── */}
      <AnimatePresence>
        {isLogIncidentModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[10000]"
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsLogIncidentModalOpen(false)}
            />
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
              <motion.div
                className="max-w-2xl w-full rounded-[20px] shadow-2xl relative max-h-[90vh] overflow-y-auto pointer-events-auto"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ ...springGentle, delay: 0.04 }}
              >
                <button
                  onClick={() => setIsLogIncidentModalOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-secondary z-10"
                  aria-label="Close modal"
                >
                  <X
                    className="w-4 h-4"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-hidden="true"
                  />
                </button>

                <div className="p-6">
                  <div className="mb-6 pr-12">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle
                        className="w-5 h-5"
                        style={{ color: "#FF453A" }}
                        aria-hidden="true"
                      />
                      <h2 className="text-foreground text-lg font-semibold">
                        Log New Incident
                      </h2>
                    </div>
                    <p
                      style={{
                        color: "var(--muted-foreground)",
                        fontSize: "14px",
                      }}
                    >
                      Report a new emergency incident to the Beacon system. All
                      fields are required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left column */}
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="incident-title"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Incident Title *
                        </label>
                        <Input
                          id="incident-title"
                          placeholder="e.g., Building Fire at City Centre"
                          value={incidentForm.title}
                          onChange={(e) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="bg-secondary border-gray-700 text-foreground placeholder:text-gray-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="incident-type"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Incident Type *
                        </label>
                        <Select
                          value={incidentForm.type}
                          onValueChange={(value) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              type: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            id="incident-type"
                            className="bg-secondary border-gray-700 text-foreground"
                          >
                            <SelectValue placeholder="Select incident type" />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary border-gray-700 z-[10001]">
                            <SelectItem value="Fire">Fire</SelectItem>
                            <SelectItem value="Flood">Flood</SelectItem>
                            <SelectItem value="Earthquake">
                              Earthquake
                            </SelectItem>
                            <SelectItem value="Gas Leak">Gas Leak</SelectItem>
                            <SelectItem value="Building Collapse">
                              Building Collapse
                            </SelectItem>
                            <SelectItem value="Medical Emergency">
                              Medical Emergency
                            </SelectItem>
                            <SelectItem value="Traffic Accident">
                              Traffic Accident
                            </SelectItem>
                            <SelectItem value="Chemical Spill">
                              Chemical Spill
                            </SelectItem>
                            <SelectItem value="Storm">Storm</SelectItem>
                            <SelectItem value="Evacuation">
                              Evacuation
                            </SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="incident-severity"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Severity Level *
                        </label>
                        <Select
                          value={incidentForm.severity}
                          onValueChange={(value) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              severity: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            id="incident-severity"
                            className="bg-secondary border-gray-700 text-foreground"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary border-gray-700 z-[10001]">
                            <SelectItem value="P0">P0 - Critical</SelectItem>
                            <SelectItem value="P1">P1 - High</SelectItem>
                            <SelectItem value="P2">P2 - Medium</SelectItem>
                            <SelectItem value="P3">P3 - Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="incident-radius"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Affected Radius (meters)
                        </label>
                        <Input
                          id="incident-radius"
                          type="number"
                          placeholder="50"
                          value={incidentForm.affected_radius}
                          onChange={(e) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              affected_radius: parseInt(e.target.value) || 50,
                            }))
                          }
                          className="bg-secondary border-gray-700 text-foreground placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                      <div className="relative location-search-container">
                        <label
                          htmlFor="incident-location"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Location Address *
                        </label>
                        <Input
                          id="incident-location"
                          placeholder="Search for location..."
                          value={incidentForm.address}
                          onChange={(e) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          className="bg-secondary border-gray-700 text-foreground placeholder:text-gray-500"
                          autoComplete="off"
                        />
                        {isSearchingLocation && (
                          <div className="absolute right-3 top-10 text-muted-foreground">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                          </div>
                        )}
                        {showLocationSuggestions &&
                          locationSuggestions.length > 0 && (
                            <div
                              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                              style={{
                                background: "var(--secondary)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {locationSuggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion.place_id || index}
                                  onClick={() =>
                                    handleLocationSelect(suggestion)
                                  }
                                  className="w-full text-left p-3 transition-colors"
                                  style={{
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                  onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "var(--border)")
                                  }
                                  onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "transparent")
                                  }
                                >
                                  <div className="font-medium text-sm text-foreground truncate">
                                    {suggestion.display_name}
                                  </div>
                                  <div
                                    className="text-xs mt-1"
                                    style={{ color: "var(--muted-foreground)" }}
                                  >
                                    {suggestion.lat.toFixed(4)},{" "}
                                    {suggestion.lng.toFixed(4)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="incident-lat"
                            className="text-sm font-medium text-foreground mb-2 block"
                          >
                            Latitude
                          </label>
                          <Input
                            id="incident-lat"
                            type="number"
                            step="any"
                            value={incidentForm.latitude}
                            onChange={(e) =>
                              setIncidentForm((prev) => ({
                                ...prev,
                                latitude:
                                  parseFloat(e.target.value) ||
                                  53.341584351173665,
                              }))
                            }
                            className="bg-secondary border-gray-700 text-foreground"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="incident-lng"
                            className="text-sm font-medium text-foreground mb-2 block"
                          >
                            Longitude
                          </label>
                          <Input
                            id="incident-lng"
                            type="number"
                            step="any"
                            value={incidentForm.longitude}
                            onChange={(e) =>
                              setIncidentForm((prev) => ({
                                ...prev,
                                longitude:
                                  parseFloat(e.target.value) ||
                                  -6.253216313519239,
                              }))
                            }
                            className="bg-secondary border-gray-700 text-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="incident-description"
                          className="text-sm font-medium text-foreground mb-2 block"
                        >
                          Description *
                        </label>
                        <Textarea
                          id="incident-description"
                          placeholder="Provide detailed description of the incident..."
                          value={incidentForm.description}
                          onChange={(e) =>
                            setIncidentForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="bg-secondary border-gray-700 text-foreground placeholder:text-gray-500 min-h-[100px] resize-none"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal footer */}
                  <div
                    className="flex gap-3 pt-6"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setIsLogIncidentModalOpen(false)}
                      className="border-gray-700 text-gray-300 hover:bg-secondary hover:text-foreground"
                      disabled={isLoggingIncident}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitIncident}
                      disabled={
                        !incidentForm.title ||
                        !incidentForm.type ||
                        !incidentForm.description ||
                        !incidentForm.address ||
                        isLoggingIncident
                      }
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingIncident ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Logging Incident…
                        </>
                      ) : (
                        <>
                          <AlertTriangle
                            className="w-4 h-4 mr-2"
                            aria-hidden="true"
                          />
                          Log Incident
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
