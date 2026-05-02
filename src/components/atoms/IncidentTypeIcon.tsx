import { cn } from "../ui/utils";
import {
  getIncidentIcon,
  getIncidentIconStyle,
} from "../../utils/incident.utils";

interface IncidentTypeIconProps {
  type: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-7 h-7", icon: "w-3.5 h-3.5" },
  md: { container: "w-9 h-9", icon: "w-4 h-4" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

export function IncidentTypeIcon({
  type,
  color,
  size = "md",
  className,
}: IncidentTypeIconProps) {
  const Icon = getIncidentIcon(type);
  const style = getIncidentIconStyle(color);
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        s.container,
        style.bg,
        style.ring,
        "rounded-lg flex items-center justify-center flex-shrink-0",
        className,
      )}
    >
      <Icon className={cn(s.icon, style.iconColor)} aria-hidden="true" />
    </div>
  );
}
