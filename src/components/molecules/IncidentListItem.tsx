import { cn } from "../ui/utils";
import { SeverityBadge } from "../atoms/SeverityBadge";
import { TimeAgo } from "../atoms/TimeAgo";
import { MapPin } from "lucide-react";

interface IncidentListItemProps {
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

export function IncidentListItem({
  id,
  title,
  type,
  severity,
  locationAddress,
  createdAt,
  status,
  isSelected,
  onClick,
}: IncidentListItemProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "w-full text-left flex items-center gap-4",
        "px-4 py-3",
        "border-b border-border",
        "transition-colors hover:bg-secondary/50",
        isSelected && "bg-secondary/70",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {title || type}
          </span>
          <SeverityBadge severity={severity} />
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" aria-hidden="true" />
          <span className="truncate">{locationAddress}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-xs text-muted-foreground capitalize block">
          {status}
        </span>
        <TimeAgo timestamp={createdAt} />
      </div>
    </button>
  );
}
