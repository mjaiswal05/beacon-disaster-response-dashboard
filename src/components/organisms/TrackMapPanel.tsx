import { useEffect, useRef } from "react";
import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import type { MemberTrack } from "../../types/core.types";

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ?? "XEJ9TyM0ypdEpDWoTi00ZzPqIFD0a6rj";

interface Props {
  tracks: MemberTrack[];
  incidentLat: number;
  incidentLng: number;
  memberColors: Record<string, string>;
}

export function TrackMapPanel({
  tracks,
  incidentLat,
  incidentLng,
  memberColors,
}: Props) {
  const mapRef = useRef<tt.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerIdsRef = useRef<string[]>([]);
  const sourceIdsRef = useRef<string[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: containerRef.current,
      center: [incidentLng, incidentLat],
      zoom: 13,
      style: {
        map: "basic_night",
        poi: "poi_main",
        trafficFlow: "flow_relative0",
        trafficIncidents: "incidents_night",
      },
    });

    mapRef.current = map;

    // Add incident marker
    map.on("load", () => {
      const incidentEl = document.createElement("div");
      incidentEl.style.cssText = `
        width: 16px; height: 16px; border-radius: 50%;
        background: #ef4444; border: 2px solid white;
        box-shadow: 0 0 0 4px rgba(239,68,68,0.3);
      `;
      new tt.Marker({ element: incidentEl })
        .setLngLat([incidentLng, incidentLat])
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update tracks whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateTracks = () => {
      // Remove previous layers and sources
      layerIdsRef.current.forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      sourceIdsRef.current.forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });
      layerIdsRef.current = [];
      sourceIdsRef.current = [];

      const allCoords: [number, number][] = [[incidentLng, incidentLat]];

      tracks.forEach((track) => {
        if (track.points.length === 0) return;
        const coords = track.points.map(
          (p): [number, number] => [p.lng, p.lat],
        );
        allCoords.push(...coords);
        const color = memberColors[track.user_id] ?? "#6b7280";

        // Polyline source + layer
        const srcId = `track-${track.user_id}`;
        const layerId = `track-line-${track.user_id}`;
        map.addSource(srcId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: {},
          },
        });
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": color,
            "line-width": 3,
            "line-opacity": 0.8,
          },
        });
        sourceIdsRef.current.push(srcId);
        layerIdsRef.current.push(layerId);

        // Current position marker
        const lastPoint = track.points[track.points.length - 1];
        const el = document.createElement("div");
        el.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 0 0 2px ${color}44;
        `;
        new tt.Marker({ element: el })
          .setLngLat([lastPoint.lng, lastPoint.lat])
          .addTo(map);
      });

      // Fit bounds to all points
      if (allCoords.length > 1) {
        const lngs = allCoords.map((c) => c[0]);
        const lats = allCoords.map((c) => c[1]);
        const bounds = new tt.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
      }
    };

    if (map.isStyleLoaded()) {
      updateTracks();
    } else {
      map.once("load", updateTracks);
    }
  }, [tracks, memberColors, incidentLat, incidentLng]);

  return <div ref={containerRef} className="w-full h-full" />;
}
