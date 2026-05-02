import type { MemberTrack, LocationPoint, MemberInfo } from "../../types/core.types";
import { TrackMemberRow } from "../molecules/TrackMemberRow";

interface Props {
  tracks: MemberTrack[];
  incidentLat: number;
  incidentLng: number;
  memberColors: Record<string, string>;
  memberInfoMap: Record<string, MemberInfo>;
  isLoading: boolean;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function TrackMemberPanel({
  tracks,
  incidentLat,
  incidentLng,
  memberColors,
  memberInfoMap,
  isLoading,
}: Props) {
  if (isLoading && tracks.length === 0) {
    return (
      <div className="p-4 space-y-3" aria-busy="true" aria-label="Loading staff positions">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isLoading && tracks.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 text-sm">No location data yet</p>
        <p className="text-gray-600 text-xs mt-1">
          Staff positions will appear once they begin reporting
        </p>
      </div>
    );
  }

  // Sort by distance to incident (closest first)
  const sorted = [...tracks].sort((a, b) => {
    const lastA: LocationPoint | null =
      a.points.length > 0 ? a.points[a.points.length - 1] : null;
    const lastB: LocationPoint | null =
      b.points.length > 0 ? b.points[b.points.length - 1] : null;
    const distA = lastA ? haversineKm(lastA.lat, lastA.lng, incidentLat, incidentLng) : Infinity;
    const distB = lastB ? haversineKm(lastB.lat, lastB.lng, incidentLat, incidentLng) : Infinity;
    return distA - distB;
  });

  return (
    <div className="p-4 space-y-2" role="list" aria-label="Deployed staff">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
        Deployed Staff ({tracks.length})
      </p>
      {sorted.map((track) => {
        const lastPoint: LocationPoint | null =
          track.points.length > 0
            ? track.points[track.points.length - 1]
            : null;
        const distanceKm = lastPoint
          ? haversineKm(lastPoint.lat, lastPoint.lng, incidentLat, incidentLng)
          : null;
        return (
          <TrackMemberRow
            key={track.user_id}
            userId={track.user_id}
            color={memberColors[track.user_id] ?? "#6b7280"}
            lastPoint={lastPoint}
            distanceKm={distanceKm}
            memberInfo={memberInfoMap[track.user_id]}
          />
        );
      })}
    </div>
  );
}
