import { cn } from "../ui/utils";
import { SeverityBadge } from "../atoms/SeverityBadge";
import { TimeAgo } from "../atoms/TimeAgo";
import { IncidentTypeIcon } from "../atoms/IncidentTypeIcon";
import { getSeverityColor } from "../../utils/incident.utils";

interface IncidentCardProps {
  id: string;
  title: string;
  type: string;
  severity: string;
  locationAddress: string;
  createdAt: string;
  status: string;
  isSelected?: boolean;
  onClick: (id: string) => void;
}

export function IncidentCard({
  id,
  title,
  type,
  severity,
  locationAddress,
  createdAt,
  status,
  isSelected,
  onClick,
}: IncidentCardProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "w-full text-left flex items-start gap-3",
        "p-4",
        "bg-card border border-border rounded-lg",
        "cursor-pointer transition-colors hover:bg-secondary",
        isSelected && "ring-2 ring-blue-500 bg-secondary",
      )}
    >
      <IncidentTypeIcon
        type={type}
        color={getSeverityColor(severity)}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {title || type}
          </span>
          <SeverityBadge severity={severity} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {locationAddress}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground capitalize">
            {status}
          </span>
          <TimeAgo timestamp={createdAt} />
        </div>
      </div>
    </button>
  );
}
