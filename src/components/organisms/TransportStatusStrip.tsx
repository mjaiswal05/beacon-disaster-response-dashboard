import { Bus, ChevronDown, ChevronUp, Train, Zap } from "lucide-react";
import { useState } from "react";
import { useTransport } from "../../hooks/useTransport";
import { cn } from "../ui/utils";

export function TransportStatusStrip() {
  const { vehicles, trains, luas, traffic, vehiclesLoading, trainsLoading, luasLoading } =
    useTransport();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeBuses = vehicles.filter((v) => v.status !== "out_of_service").length;
  const activeTrains = trains.filter((t) => t.train_status !== "terminated").length;
  const nextLuas = luas.length > 0
    ? Math.min(...luas.map((l) => l.due_minutes).filter((d) => d >= 0))
    : null;

  // Unique Luas lines in expanded view
  const luasLines = Array.from(new Set(luas.map((l) => l.line))).sort();

  // Train status summary
  const delayedTrains = trains.filter((t) =>
    t.train_status?.toLowerCase().includes("delay"),
  ).length;

  return (
    <div
      className="border-t border-gray-800 bg-gray-900"
      aria-label="Transport status strip"
    >
      {/* Collapsed bar */}
      <div className="flex items-center gap-4 px-6 py-2 text-sm">
        <span className="text-gray-500 text-xs font-medium flex-shrink-0">Transport</span>

        {/* Buses */}
        <div className="flex items-center gap-1.5">
          <Bus className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-white text-xs font-semibold">
            {vehiclesLoading ? "—" : activeBuses}
          </span>
          <span className="text-gray-400 text-xs">buses</span>
        </div>

        <div className="w-px h-4 bg-gray-800 flex-shrink-0" aria-hidden="true" />

        {/* Trains */}
        <div className="flex items-center gap-1.5">
          <Train className="w-3.5 h-3.5 text-green-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-white text-xs font-semibold">
            {trainsLoading ? "—" : activeTrains}
          </span>
          <span className="text-gray-400 text-xs">trains</span>
        </div>

        <div className="w-px h-4 bg-gray-800 flex-shrink-0" aria-hidden="true" />

        {/* Luas */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-white text-xs font-semibold">
            {luasLoading
              ? "—"
              : nextLuas != null && nextLuas < 60
                ? `${nextLuas}m`
                : "—"}
          </span>
          <span className="text-gray-400 text-xs">Luas next</span>
        </div>

        <div className="w-px h-4 bg-gray-800 flex-shrink-0" aria-hidden="true" />

        <span className="text-gray-500 text-xs">
          {traffic.length} traffic flow{traffic.length !== 1 ? "s" : ""}
        </span>

        <div className="flex-1" />

        <button
          onClick={() => setIsExpanded((p) => !p)}
          className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label={isExpanded ? "Collapse transport strip" : "Expand transport strip"}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="px-6 pb-4 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 pt-3"
          aria-live="polite"
        >
          {/* Buses */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5" aria-hidden="true" />
              Vehicles ({activeBuses} active)
            </p>
            {vehicles.length === 0 ? (
              <p className="text-gray-500 text-xs">No active vehicles</p>
            ) : (
              <ul className="space-y-1">
                {vehicles.slice(0, 5).map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white truncate max-w-[120px]">
                      {v.route_name || v.route_id}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs capitalize",
                        v.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : v.status === "out_of_service"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-700 text-gray-400",
                      )}
                    >
                      {v.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
                {vehicles.length > 5 && (
                  <li className="text-gray-500 text-xs">+{vehicles.length - 5} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Trains */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1.5">
              <Train className="w-3.5 h-3.5" aria-hidden="true" />
              Trains ({activeTrains} running
              {delayedTrains > 0 ? `, ${delayedTrains} delayed` : ""})
            </p>
            {trains.length === 0 ? (
              <p className="text-gray-500 text-xs">No train data</p>
            ) : (
              <ul className="space-y-1">
                {trains.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-white truncate max-w-[120px]">
                      {t.train_code}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs capitalize",
                        t.train_status?.toLowerCase().includes("delay")
                          ? "bg-yellow-500/20 text-yellow-400"
                          : t.train_status === "terminated"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400",
                      )}
                    >
                      {t.train_status?.replace(/_/g, " ") ?? "unknown"}
                    </span>
                  </li>
                ))}
                {trains.length > 5 && (
                  <li className="text-gray-500 text-xs">+{trains.length - 5} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Luas */}
          <div>
            <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Luas Forecasts
            </p>
            {luas.length === 0 ? (
              <p className="text-gray-500 text-xs">No Luas data</p>
            ) : (
              <ul className="space-y-1">
                {luasLines.map((line) => {
                  const lineForecasts = luas
                    .filter((l) => l.line === line)
                    .sort((a, b) => a.due_minutes - b.due_minutes)
                    .slice(0, 2);
                  return lineForecasts.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-white truncate max-w-[120px]">
                        {f.stop_name} → {f.destination}
                      </span>
                      <span className="text-gray-400 flex-shrink-0">
                        {f.due_minutes}m
                      </span>
                    </li>
                  ));
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
