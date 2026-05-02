import { Activity, AlertTriangle, Droplets, Truck, Wind } from "lucide-react";
import type { IncidentMetrics } from "../../services/core.api";
import type { PowerOutage, WeatherWarning } from "../../types/observability.types";
import { KPIStat } from "../atoms/KPIStat";

interface KPIStatsBarProps {
  metrics: IncidentMetrics;
  dispatchCount: number;
  weatherWarnings: WeatherWarning[];
  powerOutages: PowerOutage[];
  floodZones: any[];
  isLoading: boolean;
}

export function KPIStatsBar({
  metrics,
  dispatchCount,
  weatherWarnings,
  powerOutages,
  floodZones,
  isLoading,
}: KPIStatsBarProps) {
  const hasRedWarning = weatherWarnings.some(
    (w) =>
      w.title?.toLowerCase().includes("red") ||
      w.categories?.toLowerCase().includes("red"),
  );
  const highFloodCount = floodZones.filter(
    (z) => (z.risk_level ?? "").toLowerCase() === "high",
  ).length;

  return (
    <div
      className="flex items-center gap-3 px-6 py-3 bg-gray-900 border-b border-gray-800 overflow-x-auto"
      aria-label="KPI summary bar"
    >
      <span className="text-gray-500 text-xs font-medium flex-shrink-0 mr-1">
        Live Status
      </span>

      <KPIStat
        label="Active Incidents"
        value={metrics.active_incidents}
        icon={<AlertTriangle className="w-4 h-4" />}
        variant={
          metrics.active_incidents > 5
            ? "critical"
            : metrics.active_incidents > 0
              ? "warning"
              : "normal"
        }
        isLoading={isLoading}
      />

      <KPIStat
        label="Pending Dispatches"
        value={dispatchCount}
        icon={<Truck className="w-4 h-4" />}
        variant={dispatchCount > 0 ? "warning" : "normal"}
        isLoading={isLoading}
      />

      <KPIStat
        label="Weather Warnings"
        value={weatherWarnings.length}
        icon={<Wind className="w-4 h-4" />}
        variant={
          hasRedWarning ? "critical" : weatherWarnings.length > 0 ? "warning" : "normal"
        }
        isLoading={isLoading}
      />

      <KPIStat
        label="Flood Zones at Risk"
        value={highFloodCount}
        icon={<Droplets className="w-4 h-4" />}
        variant={highFloodCount > 0 ? "critical" : "normal"}
        isLoading={isLoading}
      />

      <KPIStat
        label="Power Outages"
        value={powerOutages.length}
        icon={<Activity className="w-4 h-4" />}
        variant={powerOutages.length > 0 ? "warning" : "normal"}
        isLoading={isLoading}
      />
    </div>
  );
}
