import { cn } from "../ui/utils";

type StatusType = "ok" | "warning" | "error" | "unknown";

interface TransportStatPillProps {
  icon: React.ReactNode;
  label: string;
  count: number | string;
  status?: StatusType;
  isLoading?: boolean;
}

const STATUS_DOT: Record<StatusType, string> = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  unknown: "bg-gray-500",
};

export function TransportStatPill({
  icon,
  label,
  count,
  status = "unknown",
  isLoading = false,
}: TransportStatPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "flex-shrink-0 px-3 py-1.5",
        "bg-gray-900 border border-gray-800 rounded-lg",
      )}
    >
      <span className="text-gray-400 w-4 h-4 flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      {isLoading ? (
        <div className="h-3 w-12 bg-gray-800 rounded animate-pulse" />
      ) : (
        <>
          <span className="text-white text-sm font-bold">{count}</span>
          <span className="text-gray-400 text-xs">{label}</span>
        </>
      )}
      <span
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0 ml-1",
          STATUS_DOT[status],
        )}
        aria-label={`Status: ${status}`}
      />
    </div>
  );
}
