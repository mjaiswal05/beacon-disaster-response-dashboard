import { useEffect, useRef, useState } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import { MapPin } from "lucide-react";
import type { Vehicle } from "../../services/observability.api";
import { EmptyState } from "../atoms/EmptyState";
import { cn } from "../ui/utils";

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ?? "XEJ9TyM0ypdEpDWoTi00ZzPqIFD0a6rj";

const MAP_STYLE =
  "https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_night&poi=poi_main";

const DUBLIN_CENTER: [number, number] = [-6.2603, 53.3498];

interface VehicleMapPanelProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  cityName: string;
}

function hasValidCoords(v: Vehicle): boolean {
  return Boolean(
    v.location?.latitude &&
      v.location?.longitude &&
      !(v.location.latitude === 0 && v.location.longitude === 0),
  );
}

function createVehicleMarkerEl(status: string): HTMLElement {
  const el = document.createElement("div");
  const isActive = status === "active";
  el.style.cssText = `
    width: 12px; height: 12px;
    background: ${isActive ? "#3b82f6" : "#6b7280"};
    border: 2px solid ${isActive ? "#93c5fd" : "#9ca3af"};
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 0 4px ${isActive ? "rgba(59,130,246,0.2)" : "rgba(107,114,128,0.2)"};
  `;
  return el;
}

function buildPopupHTML(v: Vehicle): string {
  const statusColor = v.status === "active" ? "#3b82f6" : "#6b7280";
  const routeLabel =
    v.route_name && v.route_name !== v.route_id
      ? `<div style="color:#d1d5db;font-size:12px;margin-top:2px;">${v.route_name}</div>`
      : "";
  return `
    <div style="padding:12px;min-width:180px;font-family:system-ui,sans-serif;color:white;">
      <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${v.route_id}</div>
      ${routeLabel}
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <span style="
          padding:2px 8px;border-radius:6px;font-size:11px;font-weight:500;
          background:${statusColor}33;color:${statusColor};border:1px solid ${statusColor}55;
        ">${v.status}</span>
      </div>
      <div style="color:#9ca3af;font-size:12px;margin-top:6px;">${v.speed} km/h</div>
    </div>
  `;
}

export function VehicleMapPanel({
  vehicles,
  isLoading,
  cityName,
}: VehicleMapPanelProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const markersRef = useRef<tt.Marker[]>([]);
  const hasFitBounds = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mappable = vehicles.filter(hasValidCoords);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainer.current,
      center: DUBLIN_CENTER,
      zoom: 12,
      style: MAP_STYLE,
    });

    map.addControl(new tt.NavigationControl(), "top-right");
    map.on("load", () => setMapLoaded(true));
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sync markers when vehicles or map load state changes
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    mappable.forEach((v) => {
      if (!mapInstance.current) return;

      const popup = new tt.Popup({
        offset: 16,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "220px",
      }).setHTML(buildPopupHTML(v));

      const el = createVehicleMarkerEl(v.status);
      const marker = new tt.Marker({ element: el })
        .setLngLat([v.location.longitude, v.location.latitude])
        .setPopup(popup)
        .addTo(mapInstance.current);

      markersRef.current.push(marker);
    });

    if (mappable.length > 0 && !hasFitBounds.current) {
      const bounds = new tt.LngLatBounds();
      mappable.forEach((v) => {
        bounds.extend([v.location.longitude, v.location.latitude]);
      });
      mapInstance.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 15,
        duration: 800,
      });
      hasFitBounds.current = true;
    }
  }, [mappable, mapLoaded]);

  return (
    <section
      className={cn(
        "bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden",
      )}
      aria-label="Live Vehicle Map"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
        <MapPin className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-white">Live Vehicle Map</h2>
      </div>

      {/* Body */}
      {isLoading ? (
        <div
          className="w-full bg-gray-800 animate-pulse"
          style={{ height: 400 }}
          aria-busy="true"
          aria-label="Loading map"
        />
      ) : mappable.length === 0 ? (
        <div style={{ height: 400 }} className="flex items-center justify-center">
          <EmptyState
            icon={MapPin}
            title="No vehicle locations"
            description={`No ${cityName} vehicles are reporting coordinates.`}
          />
        </div>
      ) : (
        <div ref={mapContainer} style={{ width: "100%", height: 400 }} />
      )}
    </section>
  );
}
