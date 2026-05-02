import { cn } from "../ui/utils";

interface TrafficFlowIndicatorProps {
  speed: number;
  status: string;
  className?: string;
}

function getFlowStyle(speed: number, status: string): { dot: string; label: string; text: string } {
  const s = status.toLowerCase();
  if (s === "free_flow" || s === "freeflow" || speed > 60) {
    return { dot: "bg-green-500", label: "Free flow", text: "text-green-400" };
  }
  if (s === "heavy" || s === "congested" || speed < 15) {
    return { dot: "bg-red-500", label: "Congested", text: "text-red-400" };
  }
  if (s === "slow" || speed < 35) {
    return { dot: "bg-yellow-500", label: "Slow", text: "text-yellow-400" };
  }
  return { dot: "bg-blue-500", label: "Moderate", text: "text-blue-400" };
}

export function TrafficFlowIndicator({
  speed,
  status,
  className,
}: TrafficFlowIndicatorProps) {
  const style = getFlowStyle(speed, status);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn("w-2 h-2 rounded-full shrink-0", style.dot)}
        aria-hidden="true"
      />
      <span className={cn("text-xs font-medium", style.text)}>
        {style.label}
      </span>
      <span className="text-xs text-gray-500">{Math.round(speed)} km/h</span>
    </div>
  );
}
