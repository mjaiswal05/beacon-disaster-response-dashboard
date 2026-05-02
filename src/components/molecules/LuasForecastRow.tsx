import { Zap } from "lucide-react";
import type { LuasForecast } from "../../services/observability.api";
import { cn } from "../ui/utils";

interface LuasForecastRowProps {
  stopName: string;
  line: string;
  direction: string;
  destination: string;
  dueMinutes: number;
  statusMessage: string;
}

function getLineColor(line: string): string {
  const l = line.toLowerCase();
  if (l.includes("green") || l === "g") return "text-green-400 bg-green-500/10";
  if (l.includes("red") || l === "r") return "text-red-400 bg-red-500/10";
  return "text-blue-400 bg-blue-500/10";
}

export function LuasForecastRow({
  stopName,
  line,
  direction,
  destination,
  dueMinutes,
}: LuasForecastRowProps) {
  const lineStyle = getLineColor(line);
  const dueLabel = dueMinutes <= 1 ? "Due" : `${dueMinutes} min`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", lineStyle)}>
          <Zap className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{stopName}</p>
          <p className="text-gray-400 text-xs truncate">
            {direction} · {destination}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className={cn(
          "text-sm font-semibold",
          dueMinutes <= 2 ? "text-green-400" : "text-white",
        )}>
          {dueLabel}
        </span>
      </div>
    </div>
  );
}

export function luasToRowProps(f: LuasForecast): LuasForecastRowProps {
  return {
    stopName: f.stop_name,
    line: f.line,
    direction: f.direction,
    destination: f.destination,
    dueMinutes: f.due_minutes,
    statusMessage: f.status_message,
  };
}
