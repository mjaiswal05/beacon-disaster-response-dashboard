import { AlertTriangle, Droplets, RefreshCw, Wind, Zap } from "lucide-react";
import type { PowerOutage, WeatherWarning } from "../../types/observability.types";
import { cn } from "../ui/utils";

interface EnvironmentalPanelProps {
  weatherWarnings: WeatherWarning[];
  powerOutages: PowerOutage[];
  floodZones: any[];
  isLoading: boolean;
  error: string | null;
  onRefetch: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() ?? "";
  const cls = s.includes("red")
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : s.includes("orange")
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-xs font-medium rounded border capitalize flex-shrink-0",
        cls,
      )}
    >
      {severity || "Advisory"}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const r = risk?.toLowerCase() ?? "";
  const cls =
    r === "high"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : r === "medium"
        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
        : "bg-green-500/20 text-green-400 border-green-500/30";
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-xs font-medium rounded border capitalize flex-shrink-0",
        cls,
      )}
    >
      {risk || "Low"}
    </span>
  );
}

function OutageStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  const cls = s === "active"
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : s === "resolved"
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-xs font-medium rounded border capitalize flex-shrink-0",
        cls,
      )}
    >
      {status || "Unknown"}
    </span>
  );
}

function formatPublishedAt(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

export function EnvironmentalPanel({
  weatherWarnings,
  powerOutages,
  floodZones,
  isLoading,
  error,
  onRefetch,
}: EnvironmentalPanelProps) {
  const displayWarnings = weatherWarnings.slice(0, 5);
  const displayOutages = powerOutages.slice(0, 5);
  const displayFlood = floodZones.slice(0, 5);

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--secondary)",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--secondary)" }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
          <h3 className="text-foreground text-sm font-semibold">Environmental Alerts</h3>
        </div>
        <button
          onClick={onRefetch}
          disabled={isLoading}
          className="p-1.5 rounded-lg transition-colors hover:bg-gray-800 disabled:opacity-50"
          style={{ border: "1px solid var(--border)" }}
          aria-label="Refresh environmental data"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5 text-gray-400", isLoading && "animate-spin")}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-3 mt-2 p-2.5 rounded-xl"
          style={{
            background: "rgba(255,159,10,0.1)",
            border: "1px solid rgba(255,159,10,0.2)",
          }}
        >
          <p className="text-xs flex items-center gap-2" style={{ color: "#FF9F0A" }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span role="alert">{error}</span>
          </p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" aria-busy={isLoading}>
        {/* ── Weather Warnings ── */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-foreground text-xs font-semibold">Weather Warnings</span>
            {weatherWarnings.length > 0 && (
              <span className="text-gray-400 text-xs ml-auto">{weatherWarnings.length}</span>
            )}
          </div>

          {isLoading && weatherWarnings.length === 0 ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg animate-pulse"
                  style={{ background: "var(--secondary)" }}
                />
              ))}
            </div>
          ) : displayWarnings.length === 0 ? (
            <p className="text-gray-500 text-xs py-2">No active weather warnings</p>
          ) : (
            <ul className="space-y-1">
              {displayWarnings.map((w) => (
                <li
                  key={w.id}
                  className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg"
                  style={{ background: "var(--secondary)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{w.title}</p>
                    {w.published_at && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {formatPublishedAt(w.published_at)}
                      </p>
                    )}
                  </div>
                  <SeverityBadge severity={w.categories ?? "Advisory"} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mx-4 my-2" style={{ height: 1, background: "var(--secondary)" }} />

        {/* ── Power Outages ── */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-foreground text-xs font-semibold">Power Outages</span>
            {powerOutages.length > 0 && (
              <span className="text-gray-400 text-xs ml-auto">{powerOutages.length}</span>
            )}
          </div>

          {isLoading && powerOutages.length === 0 ? (
            <div className="space-y-2">
              {[1].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg animate-pulse"
                  style={{ background: "var(--secondary)" }}
                />
              ))}
            </div>
          ) : displayOutages.length === 0 ? (
            <p className="text-gray-500 text-xs py-2">No active outages</p>
          ) : (
            <ul className="space-y-1">
              {displayOutages.map((o: PowerOutage) => (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg"
                  style={{ background: "var(--secondary)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      Zone {o.zone_id}
                    </p>
                    {o.affected_count > 0 && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {o.affected_count.toLocaleString()} affected
                      </p>
                    )}
                  </div>
                  <OutageStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mx-4 my-2" style={{ height: 1, background: "var(--secondary)" }} />

        {/* ── Flood Risk Zones ── */}
        <div className="px-4 py-1 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-foreground text-xs font-semibold">Flood Risk Zones</span>
            {floodZones.length > 0 && (
              <span className="text-gray-400 text-xs ml-auto">{floodZones.length}</span>
            )}
          </div>

          {isLoading && floodZones.length === 0 ? (
            <div className="space-y-2">
              {[1].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg animate-pulse"
                  style={{ background: "var(--secondary)" }}
                />
              ))}
            </div>
          ) : displayFlood.length === 0 ? (
            <p className="text-gray-500 text-xs py-2">No flood risk areas</p>
          ) : (
            <ul className="space-y-1">
              {displayFlood.map((z: any, idx: number) => (
                <li
                  key={z.id ?? idx}
                  className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-lg"
                  style={{ background: "var(--secondary)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      {z.station_name ?? z.name ?? `Zone ${idx + 1}`}
                    </p>
                    {z.water_level != null && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Level: {z.water_level}
                        {z.water_level_units ? ` ${z.water_level_units}` : ""}
                      </p>
                    )}
                  </div>
                  <RiskBadge risk={z.risk_level ?? "low"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
