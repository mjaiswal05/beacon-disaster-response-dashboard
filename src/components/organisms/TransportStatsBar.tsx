import { Bus, RefreshCw, Train, Zap, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import type { LuasForecast, TrafficFlow, Train as TrainType, Vehicle } from "../../types/observability.types";
import { TransportStatPill } from "../atoms/TransportStatPill";
import { cn } from "../ui/utils";

interface TransportStatsBarProps {
  vehicles: Vehicle[];
  trains: TrainType[];
  luas: LuasForecast[];
  trafficFlows: TrafficFlow[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
}

function useSecondsAgo(date: Date | null): number | null {
  const [secs, setSecs] = useState<number | null>(
    date ? Math.floor((Date.now() - date.getTime()) / 1000) : null,
  );

  useEffect(() => {
    if (!date) {
      setSecs(null);
      return;
    }
    const tick = () => setSecs(Math.floor((Date.now() - date.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date]);

  return secs;
}

function formatSecsAgo(secs: number | null): string {
  if (secs === null) return "";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function TransportStatsBar({
  vehicles,
  trains,
  luas,
  trafficFlows,
  lastUpdated,
  onRefresh,
  isLoading,
}: TransportStatsBarProps) {
  const secsAgo = useSecondsAgo(lastUpdated);
  const isFirstLoad = lastUpdated === null;

  // Derived counts
  const busCount = vehicles.filter((v) => v.status !== "out_of_service").length;
  const trainCount = trains.filter((t) => t.train_status !== "terminated").length;
  const luasStops = new Set(
    luas.filter((l) => l.due_minutes >= 0 && l.due_minutes < 60).map((l) => l.stop_code),
  ).size;
  const trafficCount = trafficFlows.length;

  // Status derivation
  const busStatus = busCount > 0 ? "ok" : "unknown";
  const hasDelayedTrain = trains.some((t) => t.train_status?.toLowerCase().includes("delay"));
  const trainStatus = trainCount > 0 ? (hasDelayedTrain ? "warning" : "ok") : "unknown";
  const luasStatus = luasStops > 0 ? "ok" : "unknown";
  const hasCongestion = trafficFlows.some((f) => f.status?.toLowerCase() === "congested");
  const trafficStatus =
    trafficCount > 0 ? (hasCongestion ? "error" : "ok") : "unknown";

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-gray-900 border-b border-gray-800 overflow-x-auto flex-shrink-0">
      <TransportStatPill
        icon={<Bus className="w-4 h-4" />}
        label="buses"
        count={busCount}
        status={busStatus}
        isLoading={isFirstLoad && isLoading}
      />
      <TransportStatPill
        icon={<Train className="w-4 h-4" />}
        label="trains"
        count={trainCount}
        status={trainStatus}
        isLoading={isFirstLoad && isLoading}
      />
      <TransportStatPill
        icon={<Zap className="w-4 h-4" />}
        label="Luas stops"
        count={luasStops}
        status={luasStatus}
        isLoading={isFirstLoad && isLoading}
      />
      <TransportStatPill
        icon={<Activity className="w-4 h-4" />}
        label="traffic flows"
        count={trafficCount}
        status={trafficStatus}
        isLoading={isFirstLoad && isLoading}
      />

      <div className="flex-1" />

      {/* Updated time + refresh */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {secsAgo !== null && (
          <span className="text-gray-500 text-xs">
            Updated {formatSecsAgo(secsAgo)}
          </span>
        )}
        {!isFirstLoad && isLoading && (
          <span className="text-blue-400 text-xs">Refreshing...</span>
        )}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          style={{ border: "1px solid var(--border)" }}
          aria-label="Refresh transport data"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5 text-gray-400", isLoading && "animate-spin")}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
