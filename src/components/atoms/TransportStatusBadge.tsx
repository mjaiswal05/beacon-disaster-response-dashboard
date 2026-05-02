import { cn } from "../ui/utils";

interface TransportStatusBadgeProps {
  status: string;
  className?: string;
}

function getStatusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "running" || s === "on_time") {
    return "bg-green-500/20 text-green-400 border-green-500/30";
  }
  if (s === "delayed" || s === "late") {
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }
  if (s === "cancelled" || s === "out_of_service") {
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }
  return "bg-gray-700 text-gray-400 border-gray-600";
}

export function TransportStatusBadge({
  status,
  className,
}: TransportStatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full border capitalize",
        getStatusStyle(status),
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
