import React, { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { StationRole } from "../../types/core.types";
import type { MapBounds } from "./TomTomMap";

// Lazy load the TomTomMap component to handle any potential SSR issues
const TomTomMapComponent = lazy(() =>
  import("./TomTomMap").then((module) => ({ default: module.TomTomMap })),
);

interface Incident {
  id: string;
  type: string;
  severity: string;
  location: string;
  time: string;
  units: number;
  status: string;
  lat: number;
  lng: number;
  icon: React.ComponentType<any>;
  color: string;
}

export interface MapStation {
  source_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  role: StationRole;
}

interface MapWrapperProps {
  incidents: Incident[];
  onIncidentClick: (incidentId: string) => void;
  countyCenter?: { lat: number; lng: number; zoom: number };
  stations?: MapStation[];
  onBoundsChange?: (bounds: MapBounds) => void;
}

// Loading component
const MapLoading = () => (
  <div className="flex items-center justify-center h-full bg-secondary rounded-lg">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  </div>
);

// Error fallback component
const MapError = ({ onIncidentClick, incidents }: MapWrapperProps) => (
  <div className="relative w-full h-full bg-gradient-to-br from-secondary to-card rounded-lg overflow-hidden">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          Map temporarily unavailable
        </p>
        <div className="grid grid-cols-1 gap-2 max-w-xs">
          {incidents.map((incident) => (
            <button
              key={incident.id}
              onClick={() => onIncidentClick(incident.id)}
              className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  incident.color === "red"
                    ? "bg-red-500"
                    : incident.color === "orange"
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                }`}
              />
              <div className="text-left">
                <div className="text-foreground text-sm font-medium">
                  {incident.type}
                </div>
                <div className="text-muted-foreground text-xs">
                  {incident.location}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export function MapWrapper({
  incidents,
  onIncidentClick,
  countyCenter,
  stations,
  onBoundsChange,
}: MapWrapperProps) {
  return (
    <Suspense fallback={<MapLoading />}>
      <ErrorBoundary
        fallback={() => (
          <MapError incidents={incidents} onIncidentClick={onIncidentClick} />
        )}
      >
        <TomTomMapComponent
          incidents={incidents}
          onIncidentClick={onIncidentClick}
          countyCenter={countyCenter}
          stations={stations}
          onBoundsChange={onBoundsChange}
        />
      </ErrorBoundary>
    </Suspense>
  );
}

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<any> },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent {...this.props} />;
    }

    return this.props.children;
  }
}
