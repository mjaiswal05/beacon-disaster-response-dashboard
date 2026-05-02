import { cn } from "../ui/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300",
        className,
      )}
    >
      {status}
    </span>
  );
}
