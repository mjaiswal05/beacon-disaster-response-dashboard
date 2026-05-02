import { Home, MapPin } from "lucide-react";
import { cn } from "../ui/utils";

interface ShelterPickerCardProps {
  id: string;
  name: string;
  address: string;
  distance: string;
  capacity?: number;
  shelterType?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ShelterPickerCard({
  id,
  name,
  address,
  distance,
  capacity,
  shelterType,
  isSelected,
  onSelect,
}: ShelterPickerCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={isSelected}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        isSelected
          ? "border-blue-500 bg-blue-600/10"
          : "border-border bg-secondary hover:border-blue-500/50 hover:bg-blue-600/5",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          isSelected ? "bg-blue-600/20" : "bg-gray-800",
        )}>
          <Home className="w-4 h-4 text-blue-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium truncate", isSelected ? "text-blue-300" : "text-foreground")}>
            {name}
          </p>
          {shelterType && (
            <p className="text-xs text-muted-foreground capitalize">{shelterType.replace(/_/g, " ")}</p>
          )}
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs truncate">{address}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn(
            "text-xs font-medium",
            isSelected ? "text-blue-400" : "text-muted-foreground",
          )}>
            {distance}
          </span>
          {capacity !== undefined && capacity > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {capacity.toLocaleString()} cap.
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
