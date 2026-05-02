import { cn } from "../ui/utils";

interface KPIStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "normal" | "warning" | "critical";
  isLoading?: boolean;
}

const ICON_COLOR: Record<NonNullable<KPIStatProps["variant"]>, string> = {
  normal: "text-gray-400",
  warning: "text-yellow-400",
  critical: "text-red-400",
};

export function KPIStat({
  label,
  value,
  icon,
  variant = "normal",
  isLoading = false,
}: KPIStatProps) {
  const iconColor = ICON_COLOR[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        "flex-shrink-0 px-4 py-2",
        "bg-gray-900 border border-gray-800 rounded-lg",
      )}
    >
      <span
        className={cn(
          "w-4 h-4 flex-shrink-0",
          iconColor,
          variant === "critical" && "animate-pulse",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      {isLoading ? (
        <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
      ) : (
        <div className="flex flex-col leading-tight">
          <span className="text-white text-sm font-semibold">{value}</span>
          <span className="text-gray-400 text-xs">{label}</span>
        </div>
      )}
    </div>
  );
}
