import { Building2, MapPin, Phone } from "lucide-react";
import { cn } from "../ui/utils";
import type { HospitalLocation } from "../../types/observability.types";

interface HospitalStatusCardProps {
  hospital: HospitalLocation;
  className?: string;
}

export function HospitalStatusCard({
  hospital,
  className,
}: HospitalStatusCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        "p-3",
        "bg-gray-800 border border-gray-700 rounded-lg",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/15">
        <Building2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{hospital.name}</p>

        {hospital.subcategory && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs font-medium rounded bg-gray-700 text-gray-300">
            {hospital.subcategory}
          </span>
        )}

        {hospital.address && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-gray-400 text-xs truncate">{hospital.address}</p>
          </div>
        )}

        {hospital.phone && (
          <div className="flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-gray-400 text-xs">{hospital.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
