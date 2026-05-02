import { Building2, Flame, Shield } from "lucide-react";
import { useGeoDefaults } from "../../hooks/useGeoDefaults";
import { useNearbyResources } from "../../hooks/useNearbyResources";
import { EmptyState } from "../atoms/EmptyState";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { HospitalStatusCard } from "../molecules/HospitalStatusCard";

interface NearbyResourcesPanelProps {
  lat?: number;
  lng?: number;
}

export function NearbyResourcesPanel({ lat, lng }: NearbyResourcesPanelProps) {
  const { countryId } = useGeoDefaults();
  const { hospitals, fireStations, policeStations, isLoading, error } =
    useNearbyResources(countryId, lat, lng);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <LoadingSpinner label="Loading nearby resources..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p role="alert" className="text-red-400 text-sm">
          Failed to load nearby resources: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-5">
      <h2 className="text-white font-semibold text-base">Nearby Resources</h2>

      {/* Hospitals */}
      <section aria-label="Hospitals">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
            Hospitals
          </span>
          <span className="ml-auto text-gray-500 text-xs">{hospitals.length}</span>
        </div>
        {hospitals.length === 0 ? (
          <EmptyState icon={Building2} title="No hospitals found" className="py-4" />
        ) : (
          <ul className="space-y-2">
            {hospitals.slice(0, 5).map((h) => (
              <li key={h.id}>
                <HospitalStatusCard hospital={h} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fire Stations */}
      <section aria-label="Fire Stations">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
            Fire Stations
          </span>
          <span className="ml-auto text-gray-500 text-xs">{fireStations.length}</span>
        </div>
        {fireStations.length === 0 ? (
          <EmptyState icon={Flame} title="No fire stations found" className="py-4" />
        ) : (
          <ul className="space-y-1">
            {fireStations.slice(0, 5).map((fs) => (
              <li
                key={fs.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-white text-sm truncate">{fs.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Police Stations */}
      <section aria-label="Police Stations">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
            Police Stations
          </span>
          <span className="ml-auto text-gray-500 text-xs">{policeStations.length}</span>
        </div>
        {policeStations.length === 0 ? (
          <EmptyState icon={Shield} title="No police stations found" className="py-4" />
        ) : (
          <ul className="space-y-1">
            {policeStations.slice(0, 5).map((ps) => (
              <li
                key={ps.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-white text-sm truncate">{ps.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
