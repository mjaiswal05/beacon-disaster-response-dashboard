import { useState, useEffect, useCallback } from "react";
import { getIncidentById } from "../services/core.api";
import {
  getSeverityLabel,
  normalizeIncidentType,
  capitalizeFirst,
} from "../utils/incident.utils";
import { formatTimeAgo, formatTimestamp } from "../utils/date.utils";

export interface IncidentDetail {
  id: string;
  type: string;
  severity: string;
  location: string;
  time: string;
  timestamp: string;
  assignedUnits: string[];
  status: string;
  description: string;
  affectedCitizens: number;
  evacuationRequired: boolean;
  responseTeam: string;
  title: string;
  reportedBy: string;
  verifiedBy?: string;
  affectedRadius: number;
  latitude?: number;
  longitude?: number;
}

function generateMockUnits(severity: string, type: string): string[] {
  const units: string[] = [];
  const lowerType = type.toLowerCase();

  if (lowerType.includes("fire") || lowerType.includes("building")) {
    units.push("Fire Truck 12", "Ladder Truck 8");
    if (severity === "Critical") units.push("Fire Truck 15", "Hazmat Unit 3");
  } else if (lowerType.includes("flood") || lowerType.includes("water")) {
    units.push("Rescue Boat 3", "Water Rescue Team 7");
  } else if (lowerType.includes("gas") || lowerType.includes("chemical")) {
    units.push("Hazmat Unit 2", "Fire Truck 9");
  } else if (lowerType.includes("medical") || lowerType.includes("emergency")) {
    units.push("Ambulance 15", "Paramedic Unit 3");
  } else {
    units.push("Emergency Response Unit 1");
  }

  if (severity === "Critical" && !units.some((u) => u.includes("Ambulance"))) {
    units.push("Ambulance 7");
  }
  if (["Critical", "High"].includes(severity)) {
    units.push("Police Unit 24");
  }

  return units;
}

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!address || address === "Unknown Location") return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=ie`,
      { headers: { "User-Agent": "Beacon-Emergency-Dashboard/1.0" } },
    );

    if (response.ok) {
      const data = await response.json();
      if (data?.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch {
    // geocoding failed, non-critical
  }
  return null;
}

export function useIncidentById(incidentId: string | null | undefined) {
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!incidentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const raw: any = await getIncidentById(incidentId);

      const severity = getSeverityLabel(raw.Severity);
      const type = normalizeIncidentType(raw.Type);
      const location = raw.Location?.address || "Unknown Location";

      let latitude = raw.Location?.latitude || raw.latitude;
      let longitude = raw.Location?.longitude || raw.longitude;

      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        const coords = await geocodeAddress(location);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      setIncident({
        id: raw.ID,
        type,
        severity,
        location,
        time: formatTimeAgo(raw.CreatedAt),
        timestamp: formatTimestamp(raw.CreatedAt),
        assignedUnits: generateMockUnits(severity, type),
        status: capitalizeFirst(raw.Status) || "Reported",
        description: raw.Description || "No description available",
        affectedCitizens: Math.floor(Math.random() * 300) + 50,
        evacuationRequired: ["Critical", "High"].includes(severity),
        responseTeam:
          severity === "Critical"
            ? "Alpha Response Team"
            : "Beta Response Team",
        title: raw.Title,
        reportedBy: raw.ReportedBy || "System",
        verifiedBy: raw.VerifiedBy,
        affectedRadius: raw.AffectedRadius || 50,
        latitude,
        longitude,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load incident details");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { incident, isLoading, error, refetch: fetch };
}
