import { Bus, Info } from "lucide-react";
import type { TransportMode } from "../../types/core.types";

interface NearestTransitPreviewProps {
  transportMode: TransportMode;
}

export function NearestTransitPreview({ transportMode }: NearestTransitPreviewProps) {
  if (transportMode !== "public_transport") return null;

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-600/5 border border-blue-500/20">
      <div className="w-7 h-7 rounded-lg bg-blue-600/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bus className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-blue-300 font-medium">Public Transport Selected</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Citizens will be shown the nearest bus stops, Luas stops, and train stations to the shelter in the mobile app — including route numbers and live departure times.
        </p>
      </div>
      <Info className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0 mt-0.5" aria-hidden="true" />
    </div>
  );
}
