import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import {
  AlertCircle,
  Ambulance,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Truck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDispatch,
  getIncidentById,
  getNearestStations,
  listDispatchesByIncident,
} from "../../services/core.api";
import type { Dispatch, NearestStation } from "../../types/core.types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";

interface DispatchPanelProps {
  incidentId: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

// Local types

interface StationWithRole extends NearestStation {
  role: string;
}

const ROLES = ["firefighters", "medics", "police"] as const;
type RoleTab = (typeof ROLES)[number];

const ROLE_TABS: Array<{ key: RoleTab; label: string }> = [
  { key: "firefighters", label: "Fire Stations" },
  { key: "medics", label: "Hospitals" },
  { key: "police", label: "Police" },
];

function getRoleIcon(role: string) {
  switch (role) {
    case "firefighters":
      return Truck;
    case "medics":
      return Ambulance;
    case "police":
      return Shield;
    default:
      return MapPin;
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "firefighters":
      return "Fire Station";
    case "medics":
      return "Hospital";
    case "police":
      return "Police";
    default:
      return role;
  }
}

function getRoleColor(role: string): { from: string; to: string; glow: string } {
  switch (role) {
    case "firefighters":
      return { from: "#f97316", to: "#ea580c", glow: "rgba(249,115,22,0.5)" };
    case "medics":
      return { from: "#3b82f6", to: "#2563eb", glow: "rgba(59,130,246,0.5)" };
    case "police":
      return { from: "#8b5cf6", to: "#7c3aed", glow: "rgba(139,92,246,0.5)" };
    default:
      return { from: "#6b7280", to: "#4b5563", glow: "rgba(107,114,128,0.5)" };
  }
}

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ?? "XEJ9TyM0ypdEpDWoTi00ZzPqIFD0a6rj";

// DispatchMap - TomTom map showing incident + nearby stations

interface StationMarkerEntry {
  marker: tt.Marker;
  popup: tt.Popup;
  stationId: string;
  role: string;
  markerInner: HTMLDivElement;
}

function getRoleMarkerGlyph(role: string): string {
  switch (role) {
    case "firefighters":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14a4 4 0 1 0 8 0c0-3-2-4-2-7 0-1.4 1-2.4 1-2.4S10 6.4 10 11c0 1-1 2-2 3Z"/><path d="M12 18a2 2 0 0 0 2-2c0-1.5-1-2.2-2-3-1 .8-2 1.5-2 3a2 2 0 0 0 2 2Z"/></svg>`;
    case "medics":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
    case "police":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z"/></svg>`;
    default:
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/></svg>`;
  }
}

function applyMarkerSelectionStyle(
  markerInner: HTMLDivElement,
  role: string,
  isSelected: boolean,
) {
  const color = getRoleColor(role);
  markerInner.style.background = `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`;
  markerInner.style.border = isSelected ? "3px solid #60a5fa" : "2px solid white";
  markerInner.style.boxShadow = isSelected
    ? "0 0 14px rgba(96,165,250,0.8), 0 0 28px rgba(96,165,250,0.35), 0 4px 8px rgba(0,0,0,0.3)"
    : `0 0 12px ${color.glow}, 0 4px 8px rgba(0,0,0,0.3)`;
}

function DispatchMap({
  incidentLat,
  incidentLng,
  stations,
  selectedStations,
  onToggleStation,
}: {
  incidentLat: number;
  incidentLng: number;
  stations: StationWithRole[];
  selectedStations: string[];
  onToggleStation: (sourceId: string) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const onToggleStationRef = useRef(onToggleStation);
  const stationMarkersRef = useRef<Map<string, StationMarkerEntry>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onToggleStationRef.current = onToggleStation;
  }, [onToggleStation]);

  useEffect(() => {
    if (!mapContainer.current) return;

    setIsLoading(true);
    setIsMapReady(false);

    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainer.current,
      center: [incidentLng, incidentLat],
      zoom: 13,
      style: {
        map: "basic_night",
        poi: "poi_main",
        trafficFlow: "flow_relative0",
        trafficIncidents: "incidents_night",
      },
    });

    mapInstance.current = map;

    map.on("load", () => {
      setIsLoading(false);
      setIsMapReady(true);

      // Incident marker (red pulsing)
      const incidentEl = document.createElement("div");
      incidentEl.innerHTML = `
        <div style="position: relative;">
          <div style="
            width: 80px; height: 80px;
            background: radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.1) 70%, transparent 100%);
            border-radius: 50%; position: absolute; left: -40px; top: -40px;
            animation: pulse-incident 2s ease-in-out infinite;
          "></div>
          <div style="
            width: 40px; height: 40px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px rgba(239,68,68,0.6), 0 4px 12px rgba(0,0,0,0.3);
            border: 3px solid white; position: absolute; left: -20px; top: -20px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style="
            position: absolute; top: 28px; left: 50%; transform: translateX(-50%);
            background: #dc2626; color: white; padding: 3px 10px; border-radius: 4px;
            font-size: 10px; font-weight: 600; white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">INCIDENT</div>
        </div>
      `;

      new tt.Marker({ element: incidentEl, anchor: "center" })
        .setLngLat([incidentLng, incidentLat])
        .addTo(map);

      // Pulse animation
      if (!document.getElementById("dispatch-map-pulse-style")) {
        const style = document.createElement("style");
        style.id = "dispatch-map-pulse-style";
        style.textContent = `
          @keyframes pulse-incident {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.6; }
          }
        `;
        document.head.appendChild(style);
      }
    });

    return () => {
      stationMarkersRef.current.forEach((entry) => {
        entry.popup.remove();
        entry.marker.remove();
      });
      stationMarkersRef.current.clear();

      if (mapInstance.current === map) {
        map.remove();
        mapInstance.current = null;
      }

      setIsMapReady(false);
    };
  }, [incidentLat, incidentLng]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isMapReady) return;

    stationMarkersRef.current.forEach((entry) => {
      entry.popup.remove();
      entry.marker.remove();
    });
    stationMarkersRef.current.clear();

    const bounds = new tt.LngLatBounds();
    bounds.extend([incidentLng, incidentLat]);

    stations.forEach((station) => {
      const stationRoot = document.createElement("button");
      stationRoot.type = "button";
      stationRoot.style.background = "transparent";
      stationRoot.style.border = "none";
      stationRoot.style.padding = "0";
      stationRoot.style.cursor = "pointer";
      stationRoot.style.outline = "none";
      stationRoot.setAttribute("aria-label", `${station.name} ${getRoleLabel(station.role)} marker`);

      const markerInner = document.createElement("div");
      markerInner.style.width = "38px";
      markerInner.style.height = "38px";
      markerInner.style.borderRadius = "50%";
      markerInner.style.display = "flex";
      markerInner.style.alignItems = "center";
      markerInner.style.justifyContent = "center";
      markerInner.style.transition = "transform 0.18s";
      markerInner.innerHTML = getRoleMarkerGlyph(station.role);

      applyMarkerSelectionStyle(
        markerInner,
        station.role,
        selectedStations.includes(station.source_id),
      );

      const roleColor = getRoleColor(station.role);
      const popup = new tt.Popup({
        offset: 20,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div style="background:#111827;padding:10px;border-radius:8px;min-width:170px;border:1px solid #374151;">
          <div style="color:${roleColor.from};font-weight:700;font-size:12px;line-height:1.3;">${station.name}</div>
          <div style="color:#9ca3af;font-size:11px;margin-top:4px;line-height:1.35;">
            <div>${getRoleLabel(station.role)} · ${station.distance_km.toFixed(1)} km</div>
            <div style="margin-top:2px;">${station.address || "No address"}</div>
          </div>
        </div>
      `);

      stationRoot.appendChild(markerInner);

      const marker = new tt.Marker({ element: stationRoot, anchor: "center" })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map);

      stationRoot.onmouseenter = () => {
        markerInner.style.transform = "scale(1.12)";
        if (!marker.getPopup()?.isOpen()) {
          marker.togglePopup();
        }
      };

      stationRoot.onmouseleave = () => {
        markerInner.style.transform = "scale(1)";
        if (marker.getPopup()?.isOpen()) {
          marker.togglePopup();
        }
      };

      stationRoot.onclick = () => onToggleStationRef.current(station.source_id);

      stationMarkersRef.current.set(station.source_id, {
        marker,
        popup,
        stationId: station.source_id,
        role: station.role,
        markerInner,
      });

      bounds.extend([station.longitude, station.latitude]);
    });

    if (stations.length > 0) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    } else {
      map.easeTo({ center: [incidentLng, incidentLat], zoom: 13 });
    }
  }, [incidentLat, incidentLng, isMapReady, stations]);

  useEffect(() => {
    stationMarkersRef.current.forEach((entry) => {
      applyMarkerSelectionStyle(
        entry.markerInner,
        entry.role,
        selectedStations.includes(entry.stationId),
      );
    });
  }, [selectedStations]);

  return (
    <div className="relative w-full h-full min-h-[280px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      {isLoading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <Loader
              className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400"
              aria-hidden="true"
            />
            <p className="text-sm text-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

const DISPATCH_STATUS_STYLES: Record<string, string> = {
  pending_acceptance: "bg-yellow-500/10 text-yellow-400",
  in_progress: "bg-blue-500/10 text-blue-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

function formatDispatchStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function DispatchPanel({
  incidentId,
  onBack,
  onSuccess,
}: DispatchPanelProps) {
  // Station data
  const [stations, setStations] = useState<StationWithRole[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [stationsError, setStationsError] = useState<string | null>(null);

  // Existing dispatches
  const [existingDispatches, setExistingDispatches] = useState<Dispatch[]>([]);
  const [isLoadingDispatches, setIsLoadingDispatches] = useState(true);

  // Selection + dispatch flow
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [requiredCounts, setRequiredCounts] = useState<Record<string, number>>({});
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>("firefighters");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Incident coordinates for map
  const [incidentCoords, setIncidentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ---------- Fetch nearest stations ----------

  const fetchStations = useCallback(async () => {
    if (!incidentId) {
      setStations([]);
      setIncidentCoords(null);
      setStationsError("Incident reference is missing.");
      setIsLoadingStations(false);
      return;
    }

    setIsLoadingStations(true);
    setStationsError(null);

    try {
      // 1. Get incident details for coordinates
      const raw = await getIncidentById(incidentId);
      const lat = raw.location?.latitude;
      const lng = raw.location?.longitude;

      if (!lat || !lng || lat === 0 || lng === 0) {
        setStationsError("Incident location coordinates are unavailable.");
        setStations([]);
        return;
      }

      setIncidentCoords({ lat, lng });

      // 2. Fetch nearest stations for each role in parallel
      const results = await Promise.all(
        ROLES.map(async (role) => {
          const stationList = await getNearestStations(incidentId, lat, lng, role, 5);
          return stationList.map((s): StationWithRole => ({ ...s, role }));
        }),
      );

      // 3. Combine and deduplicate by source_id (keep the first occurrence)
      const seen = new Set<string>();
      const combined: StationWithRole[] = [];

      for (const roleStations of results) {
        for (const station of roleStations) {
          if (!seen.has(station.source_id)) {
            seen.add(station.source_id);
            combined.push(station);
          }
        }
      }

      // 4. Sort by distance
      combined.sort((a, b) => a.distance_km - b.distance_km);

      setStations(combined);
    } catch (e: any) {
      setStationsError(e.message || "Failed to fetch nearby stations.");
    } finally {
      setIsLoadingStations(false);
    }
  }, [incidentId]);

  // ---------- Fetch existing dispatches ----------

  const fetchDispatches = useCallback(async () => {
    if (!incidentId) {
      setExistingDispatches([]);
      setIsLoadingDispatches(false);
      return;
    }

    setIsLoadingDispatches(true);
    try {
      const dispatches = await listDispatchesByIncident(incidentId);
      setExistingDispatches(dispatches);
    } catch {
      // Non-critical; just show empty list
      setExistingDispatches([]);
    } finally {
      setIsLoadingDispatches(false);
    }
  }, [incidentId]);

  // ---------- Effects ----------

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  useEffect(() => {
    const validStationIds = new Set(
      stations
        .filter((station) => station.available > 0)
        .map((station) => station.source_id),
    );

    setSelectedStations((prev) => {
      const next = prev.filter((id) => validStationIds.has(id));
      return next.length === prev.length ? prev : next;
    });

    setRequiredCounts((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([id]) => validStationIds.has(id)),
      ) as Record<string, number>;
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [stations]);

  const stationsByRole = useMemo(() => {
    const grouped: Record<RoleTab, StationWithRole[]> = {
      firefighters: [],
      medics: [],
      police: [],
    };

    stations.forEach((station) => {
      if (station.role in grouped) {
        grouped[station.role as RoleTab].push(station);
      }
    });

    return grouped;
  }, [stations]);

  useEffect(() => {
    if (stationsByRole[activeRoleTab].length > 0) return;
    const fallback = ROLES.find((role) => stationsByRole[role].length > 0);
    if (fallback) setActiveRoleTab(fallback);
  }, [activeRoleTab, stationsByRole]);

  const visibleStations = stationsByRole[activeRoleTab] ?? [];

  const totalRequestedMembers = useMemo(
    () => selectedStations.reduce((sum, id) => sum + (requiredCounts[id] || 1), 0),
    [requiredCounts, selectedStations],
  );

  // ---------- Handlers ----------

  const toggleStation = (sourceId: string) => {
    const isSelected = selectedStations.includes(sourceId);

    if (isSelected) {
      setSelectedStations((prev) => prev.filter((id) => id !== sourceId));
      setRequiredCounts((prev) => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
    } else {
      setSelectedStations((prev) => [...prev, sourceId]);
      setRequiredCounts((prev) => ({ ...prev, [sourceId]: prev[sourceId] ?? 1 }));
    }

    setDispatchError(null);
  };

  const clearSelection = () => {
    setSelectedStations([]);
    setRequiredCounts({});
    setDispatchError(null);
  };

  const handleDispatch = async () => {
    if (!incidentId || selectedStations.length === 0) return;

    setIsDispatching(true);
    setDispatchError(null);

    try {
      const selected = stations.filter((s) =>
        selectedStations.includes(s.source_id),
      );

      if (selected.length === 0) {
        setDispatchError("Selected stations are no longer available. Please reselect units.");
        return;
      }

      await Promise.all(
        selected.map((station) =>
          createDispatch({
            incident_id: incidentId,
            station_id: station.source_id,
            station_name: station.name,
            role: station.role,
            required_count: requiredCounts[station.source_id] || 1,
          }),
        ),
      );

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (e: any) {
      setDispatchError(
        e.message || "Failed to dispatch units. Please try again.",
      );
    } finally {
      setIsDispatching(false);
    }
  };

  // ---------- Render helpers ----------

  const renderLoadingSkeleton = () => (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-2"
      aria-busy="true"
      aria-label="Loading stations"
    >
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card border-border p-3">
          <div className="flex items-start gap-2 animate-pulse">
            <div className="w-9 h-9 bg-secondary rounded-md" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-secondary rounded w-3/4" />
              <div className="h-3 bg-secondary rounded w-1/2" />
              <div className="h-3 bg-secondary rounded w-1/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderError = () => (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <AlertCircle className="w-8 h-8 text-red-400 mb-2" aria-hidden="true" />
      <p className="text-red-400 mb-3 text-sm">{stationsError}</p>
      <Button
        onClick={fetchStations}
        variant="outline"
        className="border-border text-muted-foreground gap-2"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="bg-card border-b border-border px-3 md:px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              aria-label="Go back"
              className="hover:bg-secondary p-1.5 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h2 className="text-foreground truncate">Dispatch Emergency Units</h2>
              <p className="text-muted-foreground text-xs truncate">
                Select nearby stations and deploy in one step.
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground hidden md:block">
            {selectedStations.length} station
            {selectedStations.length !== 1 ? "s" : ""} selected
            {selectedStations.length > 0 && ` • ${totalRequestedMembers} members`}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-3 md:p-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 h-full">
          <div className="xl:col-span-5 min-h-0 flex flex-col gap-3">
            <Card className="bg-card border-border p-2.5 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-foreground">Available Emergency Stations</h3>
                {!isLoadingStations && !stationsError && (
                  <span className="text-xs text-muted-foreground">
                    {visibleStations.length} in {ROLE_TABS.find((tab) => tab.key === activeRoleTab)?.label}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {ROLE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveRoleTab(tab.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap transition-colors",
                      activeRoleTab === tab.key
                        ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground",
                    )}
                    aria-label={`Show ${tab.label}`}
                  >
                    {tab.label} ({stationsByRole[tab.key].length})
                  </button>
                ))}
              </div>

              <div className="mt-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
                {isLoadingStations && renderLoadingSkeleton()}

                {!isLoadingStations && stationsError && renderError()}

                {!isLoadingStations && !stationsError && visibleStations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
                    <p className="text-muted-foreground text-sm">
                      No {ROLE_TABS.find((tab) => tab.key === activeRoleTab)?.label.toLowerCase()} found nearby.
                    </p>
                  </div>
                )}

                {!isLoadingStations && !stationsError && visibleStations.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {visibleStations.map((station) => {
                      const Icon = getRoleIcon(station.role);
                      const isSelected = selectedStations.includes(station.source_id);
                      const isUnavailable = station.available <= 0;
                      const maxAllowed = station.available > 0 ? Math.min(20, station.available) : 20;

                      return (
                        <Card
                          key={station.source_id}
                          className={cn(
                            "p-2.5 cursor-pointer transition-all",
                            isUnavailable && "opacity-60 cursor-not-allowed",
                            isSelected
                              ? "bg-card border-border border-blue-500"
                              : "bg-card border-border hover:border-blue-600",
                          )}
                          onClick={() => {
                            if (!isUnavailable) toggleStation(station.source_id);
                          }}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-md flex items-center justify-center",
                                  isSelected ? "bg-white/20" : "bg-secondary",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    isSelected ? "text-white" : "text-muted-foreground",
                                  )}
                                  aria-hidden="true"
                                />
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-foreground text-sm truncate leading-tight">{station.name}</h4>
                                <div className="space-y-0.5 text-xs mt-0">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="w-3 h-3" aria-hidden="true" />
                                    {station.distance_km.toFixed(1)} km away
                                  </div>
                                  <div className="text-muted-foreground truncate">{station.address}</div>
                                </div>
                              </div>
                            </div>

                            {isSelected ? (
                              <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                Selected
                              </span>
                            ) : isUnavailable ? (
                              <span className="px-1.5 py-0.5 rounded text-[11px] bg-red-500/10 text-red-300 border border-red-500/40">
                                Unavailable
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[11px] bg-secondary text-muted-foreground border border-border">
                                Add
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-green-500/10 text-green-400">
                              {getRoleLabel(station.role)}
                            </span>

                            {isSelected ? (
                              <div
                                className="flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <label
                                  htmlFor={`members-${station.source_id}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Request
                                </label>
                                <input
                                  id={`members-${station.source_id}`}
                                  type="number"
                                  min={1}
                                  max={maxAllowed}
                                  value={requiredCounts[station.source_id] || 1}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const val = Math.max(1, Math.min(maxAllowed, parseInt(e.target.value, 10) || 1));
                                    setRequiredCounts((prev) => ({ ...prev, [station.source_id]: val }));
                                  }}
                                  className="w-12 h-6 text-center text-xs bg-secondary border border-border rounded px-1 text-foreground"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {station.available} / {station.total_staff} available
                              </span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              {dispatchError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-2 p-2.5 mt-2 bg-red-500/10 border border-red-500/30 rounded-md"
                >
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                  <p className="text-red-400 text-sm">{dispatchError}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-border flex-shrink-0">
                <div className="text-xs text-muted-foreground">
                  Total requested: {totalRequestedMembers}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                    disabled={selectedStations.length === 0}
                    className="border-border text-muted-foreground"
                  >
                    Clear
                  </Button>

                  <Button
                    onClick={handleDispatch}
                    disabled={selectedStations.length === 0 || isDispatching}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed h-9 px-4 gap-2"
                  >
                    {isDispatching && (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    )}
                    {isDispatching
                      ? "Dispatching..."
                      : `Dispatch ${selectedStations.length > 0 ? `(${selectedStations.length})` : ""}`}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-7 min-h-0 flex flex-col gap-3">
            <Card className="bg-card border-border p-3 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground">Unit Locations</h3>
                <span className="text-xs text-muted-foreground">
                  {selectedStations.length} selected on map
                </span>
              </div>
              {incidentCoords && !isLoadingStations ? (
                <DispatchMap
                  incidentLat={incidentCoords.lat}
                  incidentLng={incidentCoords.lng}
                  stations={stations}
                  selectedStations={selectedStations}
                  onToggleStation={toggleStation}
                />
              ) : (
                <div className="relative w-full h-full min-h-[280px] bg-gradient-to-br from-secondary to-card rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center">
                    <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="bg-card border-border p-3 min-h-[160px] max-h-[42%] flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground">Active Dispatches</h3>
                {!isLoadingDispatches && (
                  <span className="text-xs text-muted-foreground">
                    {existingDispatches.length} active
                  </span>
                )}
              </div>
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
                {isLoadingDispatches ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Loading dispatches...
                  </div>
                ) : existingDispatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active dispatches for this incident yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {existingDispatches.map((dispatch) => {
                      const Icon = getRoleIcon(dispatch.role);
                      return (
                        <Card key={dispatch.id} className="bg-secondary border-border p-2.5">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 bg-card rounded-md flex items-center justify-center">
                              <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-foreground text-sm truncate">
                                {dispatch.station_name || "Unknown Station"}
                              </h4>
                              <div className="space-y-0.5 text-xs mt-0.5">
                                <div className="text-muted-foreground">
                                  {getRoleLabel(dispatch.role)}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  Required: {dispatch.required_count} | Accepted: {dispatch.accepted_count}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-border">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[11px]",
                                DISPATCH_STATUS_STYLES[dispatch.status] ?? "bg-gray-500/10 text-gray-400",
                              )}
                            >
                              {formatDispatchStatus(dispatch.status)}
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2
                className="w-10 h-10 text-green-500"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-foreground mb-2">
              Units Dispatched Successfully
            </h3>
            <p className="text-muted-foreground text-sm">
              {selectedStations.length} emergency unit
              {selectedStations.length !== 1 ? "s" : ""}{" "}
              {selectedStations.length !== 1 ? "have" : "has"} been dispatched
              to the incident location.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
