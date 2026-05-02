import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Building2,
  Droplets,
  Flame,
  MapPin,
  Truck,
  Wind,
} from "lucide-react";

// Severity helpers

type Severity = "P0" | "P1" | "P2" | "P3";
type SeverityLabel = "Critical" | "High" | "Medium" | "Low";
type SeverityColor = "red" | "orange" | "yellow" | "blue";

const SEVERITY_LABELS: Record<string, SeverityLabel> = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Low",
};

const SEVERITY_COLORS: Record<string, SeverityColor> = {
  P0: "red",
  P1: "orange",
  P2: "yellow",
  P3: "blue",
};

export function getSeverityLabel(severity: string): SeverityLabel {
  return SEVERITY_LABELS[severity] ?? "Medium";
}

export function getSeverityColor(severity: string): SeverityColor {
  return SEVERITY_COLORS[severity] ?? "yellow";
}

export interface SeverityBadgeStyle {
  bg: string;
  text: string;
  border: string;
}

export function getSeverityBadgeStyle(severity: string): SeverityBadgeStyle {
  const styles: Record<string, SeverityBadgeStyle> = {
    P0: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
    },
    P1: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
    },
    P2: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
    },
    P3: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    Critical: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
    },
    High: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
    },
    Medium: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
    },
    Low: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
  };
  return styles[severity] ?? styles.P2;
}

// Incident icon helpers

const INCIDENT_ICONS: Record<string, LucideIcon> = {
  Fire: Flame,
  Flood: Droplets,
  "Gas Leak": Wind,
  "Building Collapse": Building2,
  Earthquake: Building2,
  "Medical Emergency": AlertTriangle,
  "Traffic Accident": Truck,
  "Chemical Spill": Wind,
  Storm: Wind,
  Evacuation: MapPin,
  "Snow Storm": Droplets,
  snow: Droplets,
  "Emergency Alert": AlertTriangle,
  string: AlertTriangle,
  Other: AlertTriangle,
};

export function getIncidentIcon(type: string): LucideIcon {
  return INCIDENT_ICONS[type] ?? AlertTriangle;
}

export interface IncidentIconStyle {
  bg: string;
  iconColor: string;
  ring: string;
}

export function getIncidentIconStyle(color: string): IncidentIconStyle {
  const styles: Record<string, IncidentIconStyle> = {
    red: {
      bg: "bg-gradient-to-br from-red-500/20 to-red-600/10",
      iconColor: "text-red-400",
      ring: "ring-1 ring-red-500/30",
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-500/20 to-orange-600/10",
      iconColor: "text-orange-400",
      ring: "ring-1 ring-orange-500/30",
    },
    yellow: {
      bg: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10",
      iconColor: "text-yellow-400",
      ring: "ring-1 ring-yellow-500/30",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
      ring: "ring-1 ring-blue-500/30",
    },
  };
  return styles[color] ?? styles.yellow;
}

// Type normalization

export function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const TYPE_MAP: Record<string, string> = {
  snow: "Snow Storm",
  string: "Emergency Alert",
  "Gas Leak": "Gas Leak",
  Fire: "Fire",
  Flood: "Flood",
};

export function normalizeIncidentType(type: string): string {
  return TYPE_MAP[type] ?? capitalizeFirst(type);
}

/**
 * Map a severity P-code (P0–P6) to its hex colour.
 */
export function getIncidentColor(severity: string): string {
  const map: Record<string, string> = {
    P0: "#991B1B",
    P1: "#DC2626",
    P2: "#EA580C",
    P3: "#F97316",
    P4: "#FACC15",
    P5: "#60A5FA",
    P6: "#9CA3AF",
  };
  return map[severity] ?? "#9CA3AF";
}
