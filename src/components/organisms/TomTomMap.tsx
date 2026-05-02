import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { StationRole } from "../../types/core.types";

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ?? "XEJ9TyM0ypdEpDWoTi00ZzPqIFD0a6rj";

/**
 * Severity rank: 0 = highest priority (P0 Catastrophic), 6 = lowest (P6 Advisory).
 * Used to derive z-index and marker size so that critical incidents always
 * render visually above lower-priority ones on the map.
 */
const SEVERITY_RANK: Record<string, number> = {
  Catastrophic: 0,
  Critical: 1,
  Serious: 2,
  High: 3,
  Medium: 4,
  Low: 5,
  Advisory: 6,
};

/**
 * Keep recency boost below a full severity step (100) so severity stays the
 * primary ordering rule while still letting newer updates bubble up.
 */
const RECENCY_Z_BOOST_MAX = 49;

/** Returns a wrapper z-index: severity band + bounded recency boost. */
const severityWrapperZ = (severity: string, recencyBoost = 0): number =>
  700 - (SEVERITY_RANK[severity] ?? 6) * 100 + recencyBoost;

/** Returns an inner element z-index in the same order as wrapper but half scale. */
const severityElementZ = (severity: string, recencyBoost = 0): number =>
  350 - (SEVERITY_RANK[severity] ?? 6) * 50 + Math.round(recencyBoost / 2);

const toEpochMs = (value?: string): number => {
  if (!value) return 0;
  const epoch = new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : 0;
};

interface Incident {
  id: string;
  type: string;
  severity: string;
  location: string;
  time: string;
  updatedAt?: string;
  units: number;
  status: string;
  lat: number;
  lng: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface MapStation {
  source_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  role: StationRole;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface TomTomMapProps {
  incidents: Incident[];
  onIncidentClick: (incidentId: string) => void;
  countyCenter?: { lat: number; lng: number; zoom: number };
  stations?: MapStation[];
  onBoundsChange?: (bounds: MapBounds) => void;
}

const getIncidentUpdatedEpoch = (incident: Incident): number =>
  toEpochMs(incident.updatedAt) || toEpochMs(incident.time);

const getRecencyBoostByIncidentId = (incidents: Incident[]): Map<string, number> => {
  if (incidents.length <= 1) {
    return new Map(incidents.map((incident) => [incident.id, 0]));
  }

  const sortedByUpdatedAt = [...incidents].sort(
    (a, b) => getIncidentUpdatedEpoch(a) - getIncidentUpdatedEpoch(b),
  );

  const denominator = sortedByUpdatedAt.length - 1;
  return new Map(
    sortedByUpdatedAt.map((incident, index) => [
      incident.id,
      Math.round((index / denominator) * RECENCY_Z_BOOST_MAX),
    ]),
  );
};

// Derive marker colours directly from the hex value passed in.
const getMarkerColor = (
  hex: string,
): { primary: string; secondary: string; glow: string } => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    primary: hex,
    secondary: `rgba(${r}, ${g}, ${b}, 0.45)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.6)`,
  };
};

// Human-readable label for each API incident type value.
const INCIDENT_LABELS: Record<string, string> = {
  fire: "Fire",
  flood: "Flood",
  earthquake: "Earthquake",
  accident: "Accident",
  tsunami: "Tsunami",
  landslide: "Landslide",
  explosion: "Explosion",
  gas_leak: "Gas Leak",
  power_outage: "Power Outage",
  structural_failure: "Structural",
  terror_attack: "Terror Attack",
  chemical_spill: "Chemical Spill",
  wildfire: "Wildfire",
  cyclone: "Cyclone",
  medical_emergency: "Medical",
  other: "Other",
};

const getIncidentLabel = (type: string): string =>
  INCIDENT_LABELS[type.toLowerCase()] ?? type;

// Get emergency icon SVG keyed by API value (fire, gas_leak, etc.).
// Always uses white icons since the marker background carries the colour.
const getEmergencyIcon = (type: string, _color?: string): string => {
  const c = "#ffffff";

  const icons: Record<string, string> = {
    fire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.534.458-2.957 1.243-4.143C7.029 11.72 8.543 10.5 10 8.5c0 3.5 2 4.5 2 4.5s.5-2 1.5-4c.667 1.333 2.5 3 2.5 5.5 0 1.5-.5 2.5-.5 2.5s1.5-.5 2.5-2.5c.354.915.5 1.957.5 3 0 3.314-3.134 6-7 6z"/>
    </svg>`,
    wildfire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.534.458-2.957 1.243-4.143C7.029 11.72 8.543 10.5 10 8.5c0 3.5 2 4.5 2 4.5s.5-2 1.5-4c.667 1.333 2.5 3 2.5 5.5 0 1.5-.5 2.5-.5 2.5s1.5-.5 2.5-2.5c.354.915.5 1.957.5 3 0 3.314-3.134 6-7 6z"/>
    </svg>`,
    flood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <path d="M3.5 18.5c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1"/>
      <path d="M3.5 14.5c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1"/>
      <path d="M12 3v8M9 8l3-5 3 5" fill="${c}" stroke="${c}"/>
    </svg>`,
    tsunami: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <path d="M3.5 18.5c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1c.5.5 1.5 1 2.5 1s2-.5 2.5-1"/>
      <path d="M3 12c2-4 5-6 9-3s7 1 9-3"/>
    </svg>`,
    earthquake: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <polyline points="2 12 6 8 10 14 14 10 18 12 22 9"/>
    </svg>`,
    accident: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>`,
    landslide: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M12 2L2 22h20L12 2zm0 4l7.5 14h-15L12 6zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z"/>
    </svg>`,
    explosion: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M13 2L3 14h8l-2 8 12-10h-8z"/>
    </svg>`,
    gas_leak: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <path d="M9 3h6l1 7H8L9 3z"/>
      <path d="M8 10c0 4 2 6 4 8M16 10c0 4-2 6-4 8"/>
      <path d="M10 18h4"/>
    </svg>`,
    power_outage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M13 2L3 14h8l-2 8 12-10h-8z"/>
      <line x1="2" y1="2" x2="22" y2="22" stroke="${c}" stroke-width="2"/>
    </svg>`,
    structural_failure: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 14h-2v-2h2v2zm0-4h-2V8h2v4zm4 4h-2v-2h2v2zm0-4h-2V8h2v4z"/>
    </svg>`,
    terror_attack: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4l6 3.33V13c0 3.72-2.57 7.19-6 8.26C8.57 20.19 6 16.72 6 13V9.33L12 6z"/>
    </svg>`,
    chemical_spill: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <path d="M9 3h6l1 7H8L9 3z"/>
      <path d="M8 10c0 4 2 6 4 8M16 10c0 4-2 6-4 8"/>
      <circle cx="12" cy="19" r="2" fill="${c}"/>
    </svg>`,
    cyclone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" width="18" height="18">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>`,
    medical_emergency: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
    </svg>`,
  };

  const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}" width="18" height="18">
    <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z"/>
  </svg>`;

  return icons[type.toLowerCase()] ?? defaultIcon;
};

// Get marker size based on severity — steps down 4 px per priority rank.
// Catastrophic (P0) = 52 px … Advisory (P6) = 28 px.
const getMarkerSize = (severity: string): number =>
  52 - (SEVERITY_RANK[severity] ?? 6) * 4;

// Get station marker colors based on role
const getStationColors = (
  role: StationRole,
): { primary: string; secondary: string; glow: string } => {
  switch (role) {
    case "firefighters":
      return {
        primary: "#FF453A",
        secondary: "#ffb4b0",
        glow: "rgba(255, 69, 58, 0.5)",
      };
    case "police":
      return {
        primary: "#007AFF",
        secondary: "#a0cfff",
        glow: "rgba(0, 122, 255, 0.5)",
      };
    case "medics":
      return {
        primary: "#32D74B",
        secondary: "#a8f0b4",
        glow: "rgba(50, 215, 75, 0.5)",
      };
    default:
      return {
        primary: "#8E8E93",
        secondary: "#c7c7cc",
        glow: "rgba(142, 142, 147, 0.5)",
      };
  }
};

// Get station icon SVG based on role
const getStationIcon = (role: StationRole): string => {
  const iconColor = "#ffffff";
  switch (role) {
    case "firefighters":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${iconColor}" width="14" height="14">
        <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.534.458-2.957 1.243-4.143C7.029 11.72 8.543 10.5 10 8.5c0 3.5 2 4.5 2 4.5s.5-2 1.5-4c.667 1.333 2.5 3 2.5 5.5 0 1.5-.5 2.5-.5 2.5s1.5-.5 2.5-2.5c.354.915.5 1.957.5 3 0 3.314-3.134 6-7 6z"/>
      </svg>`;
    case "police":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${iconColor}" width="14" height="14">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>`;
    case "medics":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${iconColor}" width="14" height="14">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${iconColor}" width="14" height="14">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`;
  }
};

// Get station label based on role
const getStationLabel = (role: StationRole): string => {
  switch (role) {
    case "firefighters":
      return "Fire Station";
    case "police":
      return "Police";
    case "medics":
      return "Hospital";
    default:
      return "Station";
  }
};

// Create station marker element
const createStationMarkerElement = (station: MapStation): HTMLElement => {
  const colors = getStationColors(station.role);
  const icon = getStationIcon(station.role);
  const label = getStationLabel(station.role);
  const size = 32;

  const wrapper = document.createElement("div");
  wrapper.className = "station-marker-wrapper";
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
    z-index: 100;
  `;

  // Main marker circle
  const element = document.createElement("div");
  element.className = "station-marker";
  element.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${colors.primary};
    border: 2px solid ${colors.secondary};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px ${colors.glow};
    position: relative;
  `;

  // Icon container
  const iconContainer = document.createElement("div");
  iconContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `;
  iconContainer.innerHTML = icon;
  element.appendChild(iconContainer);

  // Pointer
  const pointer = document.createElement("div");
  pointer.style.cssText = `
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid ${colors.primary};
    margin-top: -1px;
  `;

  wrapper.appendChild(element);
  wrapper.appendChild(pointer);

  // Label badge
  const labelEl = document.createElement("div");
  labelEl.className = "station-label";
  labelEl.textContent = label;
  labelEl.style.cssText = `
    background: rgba(17, 24, 39, 0.95);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
    white-space: nowrap;
    margin-top: 2px;
    border: 1px solid ${colors.primary};
    text-transform: uppercase;
    letter-spacing: 0.3px;
  `;
  wrapper.appendChild(labelEl);

  return wrapper;
};

// Create station popup content
const createStationPopupContent = (station: MapStation): HTMLElement => {
  const container = document.createElement("div");
  container.className = "station-popup-content";
  container.style.cssText = `
    padding: 12px;
    min-width: 200px;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const colors = getStationColors(station.role);
  const label = getStationLabel(station.role);
  const icon = getStationIcon(station.role);

  container.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors.primary};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${icon}
      </div>
      <div style="flex: 1; min-width: 0;">
        <span style="
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          background: ${colors.primary}22;
          color: ${colors.primary};
          margin-bottom: 4px;
        ">${label}</span>
        <h3 style="font-weight: 600; color: white; margin: 0; font-size: 13px;">${station.name}</h3>
      </div>
    </div>
    <div style="
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      padding: 8px 10px;
    ">
      <div style="font-size: 11px; color: #9ca3af; line-height: 1.5;">
        <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="12" height="12" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span style="color: #d1d5db;">${station.address}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${colors.primary}" width="12" height="12" style="flex-shrink: 0;">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
          </svg>
          <span style="color: ${colors.primary}; font-weight: 500;">${station.distance_km.toFixed(1)} km away</span>
        </div>
      </div>
    </div>
  `;

  return container;
};

// Create custom marker element with emergency-themed design
const createMarkerElement = (
  incident: Incident,
  onClick: () => void,
  recencyBoost: number,
): HTMLElement => {
  const colors = getMarkerColor(incident.color);
  const size = getMarkerSize(incident.severity);
  const icon = getEmergencyIcon(incident.type, incident.color);

  // Create wrapper that will be properly anchored
  const wrapper = document.createElement("div");
  wrapper.className = "emergency-marker-wrapper";
  wrapper.setAttribute("data-severity", incident.severity);
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    pointer-events: auto;
    will-change: transform;
    z-index: ${severityWrapperZ(incident.severity, recencyBoost)};
  `;

  // Main circular marker
  const element = document.createElement("div");
  element.className = "emergency-marker";
  element.setAttribute("data-incident-id", incident.id);
  element.setAttribute("data-severity", incident.severity);

  element.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: linear-gradient(180deg, ${colors.primary} 0%, ${colors.primary}cc 100%);
    border: 3px solid ${colors.secondary};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 0 0 2px rgba(255,255,255,0.2),
      0 4px 12px ${colors.glow};
    z-index: ${severityElementZ(incident.severity, recencyBoost)};
    position: relative;
  `;

  // Icon container
  const iconContainer = document.createElement("div");
  iconContainer.className = "marker-icon";
  iconContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size - 12}px;
    height: ${size - 12}px;
    pointer-events: none;
  `;
  iconContainer.innerHTML = icon;

  element.appendChild(iconContainer);

  // Pointer/tail at bottom
  const pointer = document.createElement("div");
  pointer.style.cssText = `
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 12px solid ${colors.primary};
    margin-top: -2px;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
  `;

  wrapper.appendChild(element);
  wrapper.appendChild(pointer);

  // Add type label badge for better identification
  const label = document.createElement("div");
  label.className = "marker-label";
  label.textContent = incident.type;
  label.style.cssText = `
    background: rgba(17, 24, 39, 0.95);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    margin-top: 2px;
    border: 1px solid ${colors.primary};
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;
  wrapper.appendChild(label);

  // Pulse ring for critical incidents
  if (incident.severity === "Critical") {
    const pulseRing = document.createElement("div");
    pulseRing.className = "pulse-ring";
    pulseRing.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${size + 16}px;
      height: ${size + 16}px;
      border: 2px solid ${colors.primary};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: emergency-pulse 1.5s ease-out infinite;
      pointer-events: none;
    `;
    element.appendChild(pulseRing);
  }

  // Add click event
  wrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });

  return wrapper;
};

// Create popup content with emergency theme
const createPopupContent = (
  incident: Incident,
  onIncidentClick: (id: string) => void,
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "tomtom-popup-content";
  container.style.cssText = `
    padding: 16px;
    min-width: 260px;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const colors = getMarkerColor(incident.color);
  const severityColor =
    incident.color === "red"
      ? "#fca5a5"
      : incident.color === "orange"
        ? "#fdba74"
        : incident.color === "blue"
          ? "#93c5fd"
          : "#fde047";
  const severityBg =
    incident.color === "red"
      ? "rgba(239, 68, 68, 0.2)"
      : incident.color === "orange"
        ? "rgba(249, 115, 22, 0.2)"
        : incident.color === "blue"
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(234, 179, 8, 0.2)";
  const statusBg = "rgba(59, 130, 246, 0.2)";
  const statusColor = "#93c5fd";

  const icon = getEmergencyIcon(incident.type, incident.color);

  container.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px ${colors.glow};
      ">
        ${icon.replace('width="18"', 'width="22"').replace('height="18"', 'height="22"')}
      </div>
      <div style="flex: 1; min-width: 0;">
        <h3 style="font-weight: 600; color: white; margin: 0 0 4px 0; font-size: 15px;">${incident.type}</h3>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span style="
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            background-color: ${severityBg};
            color: ${severityColor};
            border: 1px solid ${severityColor}33;
          ">
            ${incident.severity}
          </span>
          <span style="
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            background-color: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusColor}33;
          ">
            ${incident.status}
          </span>
        </div>
      </div>
    </div>
    
    <div style="
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 12px;
    ">
      <div style="font-size: 12px; color: #9ca3af; line-height: 1.7;">
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="14" height="14" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span style="color: #d1d5db;">${incident.location}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="14" height="14" style="flex-shrink: 0;">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          <span style="color: #d1d5db;">${incident.time}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="14" height="14" style="flex-shrink: 0;">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
          <span style="color: #d1d5db;">${incident.units} units assigned</span>
        </div>
      </div>
    </div>
    
    <button id="view-details-btn" style="
      width: 100%;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16" height="16">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
      View Details
    </button>
  `;

  // Add click handler for the button
  setTimeout(() => {
    const btn = container.querySelector("#view-details-btn");
    if (btn) {
      btn.addEventListener("click", () => onIncidentClick(incident.id));
      btn.addEventListener("mouseenter", () => {
        (btn as HTMLElement).style.backgroundColor = "#1d4ed8";
      });
      btn.addEventListener("mouseleave", () => {
        (btn as HTMLElement).style.backgroundColor = "#2563eb";
      });
    }
  }, 0);

  return container;
};

export function TomTomMap({
  incidents,
  onIncidentClick,
  countyCenter,
  stations,
  onBoundsChange,
}: TomTomMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<tt.Map | null>(null);
  const markersRef = useRef<tt.Marker[]>([]);
  const stationMarkersRef = useRef<tt.Marker[]>([]);
  const activePopupRef = useRef<tt.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasFitBounds = useRef(false); // Track if we've already fit bounds
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const emitBounds = useCallback(() => {
    const map = mapInstance.current;
    if (!map || !onBoundsChangeRef.current) return;
    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
    boundsTimerRef.current = setTimeout(() => {
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLon: b.getWest(),
        maxLon: b.getEast(),
      });
    }, 300);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Add custom styles
    const style = document.createElement("style");
    style.id = "tomtom-custom-styles";
    style.textContent = `
      @keyframes emergency-pulse {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(1.5);
        }
      }
      
      @keyframes marker-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      
      .emergency-marker-wrapper {
        transition: transform 0.2s ease;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      
      .emergency-marker-wrapper:hover {
        transform: scale(1.1);
        z-index: 999 !important;
      }
      
      .emergency-marker-wrapper:hover .emergency-marker {
        box-shadow: 
          0 0 0 3px rgba(255,255,255,0.4),
          0 6px 16px rgba(0,0,0,0.4);
      }
      
      .emergency-marker-wrapper[data-severity="Critical"] .emergency-marker,
      .emergency-marker[data-severity="Critical"] {
        /* Animation removed - markers stay fixed */
      }
      
      .mapboxgl-marker {
        pointer-events: auto !important;
        cursor: pointer !important;
        overflow: visible !important;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform: translate3d(0,0,0);
        -webkit-transform: translate3d(0,0,0);
      }
      
      .mapboxgl-popup {
        z-index: 10000 !important;
      }

      .mapboxgl-popup-content {
        background: linear-gradient(180deg, #374151 0%, #1f2937 100%) !important;
        border-radius: 12px !important;
        padding: 0 !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }
      
      .mapboxgl-popup-tip {
        border-top-color: #374151 !important;
      }
      
      .mapboxgl-popup-close-button {
        color: white !important;
        font-size: 20px !important;
        padding: 8px 12px !important;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .mapboxgl-popup-close-button:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        opacity: 1;
      }

      .station-marker-wrapper {
        transition: transform 0.2s ease;
      }

      .station-marker-wrapper:hover {
        transform: scale(1.15);
        z-index: 200 !important;
      }

      .station-marker-wrapper:hover .station-marker {
        box-shadow:
          0 0 0 2px rgba(255,255,255,0.3),
          0 4px 12px rgba(0,0,0,0.4);
      }
    `;
    document.head.appendChild(style);

    // Initialize TomTom map
    const map = tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainer.current,
      center: [-6.2603, 53.3498], // Dublin, Ireland [lng, lat]
      zoom: 12,
      style:
        "https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_night&poi=poi_main",
    });

    map.addControl(new tt.NavigationControl(), "top-right");
    map.addControl(new tt.FullscreenControl(), "top-right");

    map.on("load", () => {
      setMapLoaded(true);
      emitBounds();
    });

    map.on("moveend", emitBounds);

    mapInstance.current = map;

    return () => {
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
      const styleEl = document.getElementById("tomtom-custom-styles");
      if (styleEl) {
        document.head.removeChild(styleEl);
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [emitBounds]);

  // Pan to county center when county changes
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !countyCenter) return;

    mapInstance.current.easeTo({
      center: [countyCenter.lng, countyCenter.lat],
      zoom: countyCenter.zoom,
      duration: 1000,
    });
  }, [countyCenter, mapLoaded]);

  // Update markers when incidents change
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const recencyBoostByIncidentId = getRecencyBoostByIncidentId(incidents);

    // Add new markers — lowest priority first so highest priority is inserted last
    // and sits on top in the natural DOM stacking context (defence-in-depth with z-index).
    const sortedIncidents = [...incidents].sort((a, b) => {
      const severityDiff =
        (SEVERITY_RANK[b.severity] ?? 6) - (SEVERITY_RANK[a.severity] ?? 6);
      if (severityDiff !== 0) return severityDiff;

      return getIncidentUpdatedEpoch(a) - getIncidentUpdatedEpoch(b);
    });
    sortedIncidents.forEach((incident) => {
      if (!mapInstance.current) return;

      const popupContent = createPopupContent(incident, onIncidentClick);

      const popup = new tt.Popup({
        offset: 20,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
      }).setDOMContent(popupContent);

      // Create marker element with click handler to toggle popup
      const recencyBoost = recencyBoostByIncidentId.get(incident.id) ?? 0;
      const markerElement = createMarkerElement(incident, () => {
        if (popup.isOpen()) {
          popup.remove();
          activePopupRef.current = null;
        } else {
          // Close any currently open popup first
          if (activePopupRef.current && activePopupRef.current !== popup) {
            activePopupRef.current.remove();
          }
          popup.addTo(mapInstance.current!);
          activePopupRef.current = popup;
        }
      }, recencyBoost);

      const marker = new tt.Marker({
        element: markerElement,
        anchor: "bottom", // Bottom anchor - pointer tip is the anchor point
        offset: [0, 0], // No offset - pointer tip exactly at coordinates
      })
        .setLngLat([incident.lng, incident.lat])
        .setPopup(popup)
        .addTo(mapInstance.current);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers only on first load
    if (incidents.length > 0 && mapInstance.current && !hasFitBounds.current) {
      const bounds = new tt.LngLatBounds();
      incidents.forEach((incident) => {
        bounds.extend([incident.lng, incident.lat]);
      });

      // Only fit bounds if there are multiple incidents spread out
      if (incidents.length > 1) {
        mapInstance.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 13,
          duration: 1000, // Smooth animation
        });
      }
      hasFitBounds.current = true; // Mark as done
    }
  }, [incidents, mapLoaded, onIncidentClick]);

  // Update station markers when stations change
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !stations) return;

    // Remove existing station markers
    stationMarkersRef.current.forEach((marker) => marker.remove());
    stationMarkersRef.current = [];

    // Add new station markers
    stations.forEach((station) => {
      if (!mapInstance.current) return;

      const popupContent = createStationPopupContent(station);

      const popup = new tt.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "280px",
      }).setDOMContent(popupContent);

      const markerElement = createStationMarkerElement(station);

      // Add click handler to toggle popup
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        if (popup.isOpen()) {
          popup.remove();
          activePopupRef.current = null;
        } else {
          if (activePopupRef.current && activePopupRef.current !== popup) {
            activePopupRef.current.remove();
          }
          popup.addTo(mapInstance.current!);
          activePopupRef.current = popup;
        }
      });

      const marker = new tt.Marker({
        element: markerElement,
        anchor: "bottom",
        offset: [0, 0],
      })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(mapInstance.current);

      stationMarkersRef.current.push(marker);
    });
  }, [stations, mapLoaded]);

  return (
    <div
      ref={mapContainer}
      style={{ width: "100%", height: "100%", borderRadius: "8px" }}
    />
  );
}
