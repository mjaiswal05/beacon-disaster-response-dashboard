import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import { Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Evacuation, SafeZone } from "../../types/core.types";

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ?? "XEJ9TyM0ypdEpDWoTi00ZzPqIFD0a6rj";

const ADVISORY_ZONE_COLOR: Record<string, string> = {
  evacuate: "#ef4444",
  shelter_in_place: "#6366f1",
  all_clear: "#22c55e",
};

interface EvacuationMapProps {
  lat: number;
  lng: number;
  safeZones: SafeZone[];
  evacuations?: Evacuation[];
}

export function EvacuationMap({
  lat,
  lng,
  safeZones,
  evacuations = [],
}: EvacuationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Refs to track dynamically-added content for cleanup
  const dynamicMarkersRef = useRef<tt.Marker[]>([]);
  const dynamicLayerIdsRef = useRef<string[]>([]);
  const dynamicSourceIdsRef = useRef<string[]>([]);

  // ─── Effect 1: Initialize map once (tied to lat/lng) ──────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainer.current,
      center: [lng, lat],
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
      setMapLoaded(true);

      // Static: incident location marker
      const dangerEl = document.createElement("div");
      dangerEl.innerHTML = `
        <div style="position:relative;">
          <div style="
            width:110px;height:110px;
            background:radial-gradient(circle,rgba(239,68,68,0.35) 0%,rgba(239,68,68,0.08) 70%,transparent 100%);
            border-radius:50%;position:absolute;left:-55px;top:-55px;
            animation:pulse-danger 2s ease-in-out infinite;pointer-events:none;">
          </div>
          <div style="
            width:46px;height:46px;
            background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 18px rgba(239,68,68,0.55),0 4px 10px rgba(0,0,0,0.35);
            border:3px solid white;position:absolute;left:-23px;top:-23px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style="
            position:absolute;top:30px;left:50%;transform:translateX(-50%);
            background:#dc2626;color:white;padding:3px 10px;border-radius:4px;
            font-size:10px;font-weight:700;white-space:nowrap;letter-spacing:0.5px;">
            INCIDENT
          </div>
        </div>`;
      new tt.Marker({ element: dangerEl, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);

      const styleEl = document.createElement("style");
      styleEl.textContent = `@keyframes pulse-danger{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:0.65}}`;
      document.head.appendChild(styleEl);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      setMapLoaded(false);
      dynamicMarkersRef.current = [];
      dynamicLayerIdsRef.current = [];
      dynamicSourceIdsRef.current = [];
    };
  }, [lat, lng]);

  // ─── Effect 2: Dynamic content ─────────────────────────────────────────────
  // Re-runs when map loads OR when safeZones/evacuations change so markers
  // always reflect the latest prop values even if they arrived asynchronously.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapLoaded) return;

    // Remove previous dynamic markers
    dynamicMarkersRef.current.forEach((m) => m.remove());
    dynamicMarkersRef.current = [];

    // Remove previous dynamic layers then sources (layers must go first)
    dynamicLayerIdsRef.current.forEach((id) => {
      try {
        map.removeLayer(id);
      } catch { /* already gone */ }
    });
    dynamicSourceIdsRef.current.forEach((id) => {
      try {
        (map as any).removeSource(id);
      } catch { /* already gone */ }
    });
    dynamicLayerIdsRef.current = [];
    dynamicSourceIdsRef.current = [];

    // ─── Safe-zone markers (hospitals, fire stations, API shelters) ───────
    safeZones.forEach((zone) => {
      const isShelter = zone.type === "shelter";
      const c = isShelter
        ? { from: "#8b5cf6", to: "#7c3aed", glow: "rgba(139,92,246,0.5)", popup: "#8b5cf6", bb: "rgba(139,92,246,0.2)", bt: "#a78bfa" }
        : { from: "#22c55e", to: "#16a34a", glow: "rgba(34,197,94,0.5)", popup: "#22c55e", bb: "rgba(34,197,94,0.2)", bt: "#4ade80" };
      const icon = isShelter
        ? `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/></svg>`
        : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

      const el = document.createElement("div");
      el.innerHTML = `<div style="width:40px;height:40px;background:linear-gradient(135deg,${c.from} 0%,${c.to} 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px ${c.glow},0 3px 10px rgba(0,0,0,0.3);border:3px solid white;cursor:pointer;transition:transform 0.2s;">${icon}</div>`;
      el.onmouseenter = () => ((el.querySelector("div") as HTMLElement).style.transform = "scale(1.15)");
      el.onmouseleave = () => ((el.querySelector("div") as HTMLElement).style.transform = "scale(1)");

      const cap = (zone as any).capacity;
      const popup = new tt.Popup({ offset: 28, closeButton: false }).setHTML(`
        <div style="background:#1f2937;padding:10px;border-radius:8px;min-width:150px;">
          <div style="color:${c.popup};font-weight:600;font-size:13px;margin-bottom:5px;">${zone.name}</div>
          <div style="color:#9ca3af;font-size:11px;line-height:1.5;">
            <div>${zone.address || zone.type}</div>
            ${cap ? `<div>Capacity: ${cap.toLocaleString()}</div>` : ""}
            <div style="margin-top:4px;">
              <span style="background:${c.bb};color:${c.bt};padding:2px 6px;border-radius:4px;font-size:10px;">${zone.status}</span>
            </div>
          </div>
        </div>`);

      const marker = new tt.Marker({ element: el, anchor: "center" })
        .setLngLat([zone.lng, zone.lat])
        .setPopup(popup)
        .addTo(map);
      dynamicMarkersRef.current.push(marker);
    });

    // ─── Evacuation zone overlays (real bbox polygons + shelter markers) ──
    evacuations.forEach((evac) => {
      const aType = evac.advisory_type ?? "evacuate";
      const color = ADVISORY_ZONE_COLOR[aType] ?? "#ef4444";
      const { bounding_box_ne_lat: neLat, bounding_box_ne_lon: neLon, bounding_box_sw_lat: swLat, bounding_box_sw_lon: swLon } = evac;

      // Draw bbox polygon if coordinates are present
      if (neLat != null && neLon != null && swLat != null && swLon != null) {
        const srcId = `evac-src-${evac.id}`;
        const fillId = `evac-fill-${evac.id}`;
        const lineId = `evac-line-${evac.id}`;

        try {
          (map as any).addSource(srcId, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [swLon, swLat],
                  [neLon, swLat],
                  [neLon, neLat],
                  [swLon, neLat],
                  [swLon, swLat],
                ]],
              },
              properties: {},
            },
          });
          (map as any).addLayer({
            id: fillId, type: "fill", source: srcId,
            paint: { "fill-color": color, "fill-opacity": 0.13 },
          });
          (map as any).addLayer({
            id: lineId, type: "line", source: srcId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": color, "line-width": 2, "line-opacity": 0.65, "line-dasharray": [3, 1.5] },
          });
          dynamicLayerIdsRef.current.push(fillId, lineId);
          dynamicSourceIdsRef.current.push(srcId);

          // Zone name label at bbox center
          const centerLat = (neLat + swLat) / 2;
          const centerLon = (neLon + swLon) / 2;
          const labelEl = document.createElement("div");
          labelEl.innerHTML = `<div style="background:${color};color:white;padding:3px 9px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.45);pointer-events:none;letter-spacing:0.4px;">${evac.zone_name.toUpperCase()}</div>`;
          const labelMarker = new tt.Marker({ element: labelEl, anchor: "center" })
            .setLngLat([centerLon, centerLat])
            .addTo(map);
          dynamicMarkersRef.current.push(labelMarker);
        } catch { /* source/layer may already exist on rapid re-renders */ }
      }

      // Designated shelter marker (specific to this evacuation, not from API list)
      if (evac.shelter_lat != null && evac.shelter_lon != null) {
        const shEl = document.createElement("div");
        shEl.innerHTML = `
          <div style="
            width:38px;height:38px;
            background:linear-gradient(135deg,#059669 0%,#047857 100%);
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 14px rgba(5,150,105,0.55),0 3px 8px rgba(0,0,0,0.3);
            border:3px solid white;cursor:pointer;transition:transform 0.2s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <path d="M9 22v-4h6v4"/>
              <path d="M8 6h.01"/><path d="M16 6h.01"/>
            </svg>
          </div>`;
        shEl.onmouseenter = () => ((shEl.querySelector("div") as HTMLElement).style.transform = "scale(1.15)");
        shEl.onmouseleave = () => ((shEl.querySelector("div") as HTMLElement).style.transform = "scale(1)");

        const shPopup = new tt.Popup({ offset: 26, closeButton: false }).setHTML(`
          <div style="background:#1f2937;padding:10px;border-radius:8px;min-width:160px;">
            <div style="color:#34d399;font-weight:700;font-size:10px;letter-spacing:0.5px;margin-bottom:5px;">DESIGNATED SHELTER</div>
            <div style="color:white;font-weight:600;font-size:13px;margin-bottom:2px;">${evac.shelter_name ?? "Shelter"}</div>
            ${evac.shelter_address ? `<div style="color:#9ca3af;font-size:11px;">${evac.shelter_address}</div>` : ""}
            <div style="color:#6ee7b7;font-size:10px;margin-top:5px;">For: ${evac.zone_name}</div>
          </div>`);

        const marker = new tt.Marker({ element: shEl, anchor: "center" })
          .setLngLat([evac.shelter_lon, evac.shelter_lat])
          .setPopup(shPopup)
          .addTo(map);
        dynamicMarkersRef.current.push(marker);
      }
    });
  }, [mapLoaded, safeZones, evacuations]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />

      {isLoading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" aria-hidden="true" />
            <p className="text-sm text-foreground">Loading evacuation map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur-md rounded-lg p-2 text-xs space-y-1.5 z-10 border border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500 opacity-70" />
          <span className="text-foreground">Evacuate Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-500 opacity-70" />
          <span className="text-foreground">Shelter in Place Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
          <span className="text-foreground">Designated Shelter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white" />
          <span className="text-foreground">Nearby Shelter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
          <span className="text-foreground">Incident</span>
        </div>
      </div>
    </div>
  );
}
