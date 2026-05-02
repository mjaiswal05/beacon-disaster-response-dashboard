import type { Vehicle } from "../../services/observability.api";
import { TransportStatusBadge } from "../atoms/TransportStatusBadge";

interface VehicleRowProps {
  id: string;
  vehicleType: string;
  routeId: string;
  routeName: string;
  status: string;
  speed: number;
  occupancy: number;
  capacity: number;
}

export function VehicleRow({
  vehicleType,
  routeId,
  routeName,
  status,
  speed,
  occupancy,
  capacity,
}: VehicleRowProps) {
  const occupancyPct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <span className="text-blue-400 text-xs font-bold">{vehicleType.slice(0, 3).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            Route {routeId}
            {routeName && routeName !== routeId && (
              <span className="text-gray-400 font-normal"> - {routeName}</span>
            )}
          </p>
          <p className="text-gray-400 text-xs">{Math.round(speed)} km/h · {occupancyPct}% full</p>
        </div>
      </div>
      <TransportStatusBadge status={status} />
    </div>
  );
}

export function vehicleToRowProps(v: Vehicle): VehicleRowProps {
  return {
    id: v.id,
    vehicleType: v.vehicle_type,
    routeId: v.route_id,
    routeName: v.route_name,
    status: v.status,
    speed: v.speed,
    occupancy: v.occupancy,
    capacity: v.capacity,
  };
}
