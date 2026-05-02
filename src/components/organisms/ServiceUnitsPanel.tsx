import { Truck } from "lucide-react";
import { useGeoDefaults } from "../../hooks/useGeoDefaults";
import { useServiceUnits } from "../../hooks/useServiceUnits";
import { EmptyState } from "../atoms/EmptyState";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { cn } from "../ui/utils";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-500/15 text-green-400",
  dispatched: "bg-blue-500/15 text-blue-400",
  busy: "bg-orange-500/15 text-orange-400",
  offline: "bg-gray-500/15 text-gray-400",
};

function getStatusStyle(status?: string): string {
  if (!status) return STATUS_STYLES.offline;
  return STATUS_STYLES[status.toLowerCase()] ?? STATUS_STYLES.offline;
}

export function ServiceUnitsPanel() {
  const { countryId } = useGeoDefaults();
  const { units, isLoading, error } = useServiceUnits(countryId);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <LoadingSpinner label="Loading service units..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p role="alert" className="text-red-400 text-sm">
          Failed to load service units: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <h2 className="text-white font-semibold text-base">Service Units</h2>
        </div>
        <span className="text-gray-500 text-xs">{units.length} total</span>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No service units found"
          description="No units are currently registered for this region."
          className="py-6"
        />
      ) : (
        <ul className="space-y-2" aria-label="Service units list">
          {units.map((unit) => (
            <li
              key={unit.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/15">
                <Truck className="w-4 h-4 text-blue-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {unit.name ?? 'Unknown Service Unit'}
                </p>
                {unit.unit_type && (
                  <p className="text-gray-400 text-xs truncate">{unit.unit_type}</p>
                )}
              </div>
              {unit.status && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded-full capitalize flex-shrink-0",
                    getStatusStyle(unit.status as string),
                  )}
                >
                  {unit.status as string}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
