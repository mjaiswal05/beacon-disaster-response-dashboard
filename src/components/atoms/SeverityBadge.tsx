import { cn } from "../ui/utils";
import {
  getSeverityBadgeStyle,
  getSeverityLabel,
} from "../../utils/incident.utils";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const style = getSeverityBadgeStyle(severity);
  const label = getSeverityLabel(severity);

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full border",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {label}
    </span>
  );
}
