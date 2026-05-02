import {
  AlertTriangle,
  Building2,
  Car,
  Droplets,
  Flame,
  FlaskConical,
  HeartPulse,
  Landmark,
  MapPin,
  PowerOff,
  Radiation,
  Shield,
  Waves,
  Wind,
  Zap,
} from "lucide-react";

/** Severity P-code → hex color (P0 = Catastrophic, P6 = Advisory) */
export const SEV_HEX: Record<string, string> = {
  P0: "#991B1B",
  P1: "#DC2626",
  P2: "#EA580C",
  P3: "#F97316",
  P4: "#FACC15",
  P5: "#60A5FA",
  P6: "#9CA3AF",
};

/** Severity word-label → hex color */
export const SEVERITY_HEX: Record<string, string> = {
  Catastrophic: "#991B1B",
  Critical: "#DC2626",
  Serious: "#EA580C",
  High: "#F97316",
  Medium: "#FACC15",
  Low: "#60A5FA",
  Advisory: "#9CA3AF",
};

/** P-code → human-readable word label */
export const SEV_LABEL: Record<string, string> = {
  P0: "Catastrophic",
  P1: "Critical",
  P2: "Serious",
  P3: "High",
  P4: "Medium",
  P5: "Low",
  P6: "Advisory",
};

/** Word label → P-code */
export const SEVERITY_PCODE: Record<string, string> = {
  Catastrophic: "P0",
  Critical: "P1",
  Serious: "P2",
  High: "P3",
  Medium: "P4",
  Low: "P5",
  Advisory: "P6",
};

/** Incident status → display config */
export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  reported: { color: "#FFD60A", label: "Reported" },
  verified: { color: "#2563EB", label: "Verified" },
  responding: { color: "#FF9F0A", label: "Responding" },
  in_progress: { color: "#FF9F0A", label: "Responding" },
  resolved: { color: "#32D74B", label: "Resolved" },
};

/** ERT member status → display config */
export const ERT_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  ACTIVE: { color: "#32D74B", label: "Active" },
  INACTIVE: { color: "var(--muted-foreground)", label: "Inactive" },
};

/** Maps incident type string → Lucide icon component (backend snake_case values) */
export const INCIDENT_TYPE_ICONS: Record<string, React.ElementType> = {
  fire: Flame,
  flood: Droplets,
  earthquake: Building2,
  accident: Car,
  tsunami: Waves,
  landslide: Landmark,
  explosion: Zap,
  gas_leak: FlaskConical,
  power_outage: PowerOff,
  structural_failure: Building2,
  terror_attack: Shield,
  chemical_spill: Radiation,
  wildfire: Flame,
  cyclone: Wind,
  medical_emergency: HeartPulse,
  sos: AlertTriangle,
  other: AlertTriangle,
};

/** Helper: get icon for a given incident type */
export function getIncidentIcon(type: string): React.ElementType {
  return INCIDENT_TYPE_ICONS[type] || AlertTriangle;
}

export const QUICK_EMOJIS = ["👍", "❤️", "🚨", "✅", "👀", "🔥"];
