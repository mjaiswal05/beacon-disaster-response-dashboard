import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { ArrowLeft, RadioTower } from "lucide-react";
import { getDispatch, getIncidentById } from "../../services/core.api";
import { getUserById } from "../../services/iam.api";
import { useDispatchTrack } from "../../hooks/useDispatchTrack";
import { usePageTitle } from "../../hooks/usePageTitle";
import { TrackMemberPanel } from "../organisms/TrackMemberPanel";
import { TrackMapPanel } from "../organisms/TrackMapPanel";
import type { MemberInfo } from "../../types/core.types";

const MEMBER_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#eab308",
];

export function DispatchTrackingPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageTitle("Track Dispatch");

  // Fetch dispatch metadata (members, station name, incident_id)
  const { data: dispatch } = useQuery({
    queryKey: ["dispatch", id],
    queryFn: () => getDispatch(id),
    enabled: Boolean(id),
  });

  // Fetch incident details to get location coordinates
  const incidentId = dispatch?.incident_id ?? "";
  const { data: incident } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => getIncidentById(incidentId),
    enabled: Boolean(incidentId),
  });

  // Fetch IAM user profiles for all dispatch members in parallel
  const dispatchMembers = dispatch?.members ?? [];
  const memberIds = dispatchMembers.map((m) => m.user_id);
  const profileQueries = useQueries({
    queries: memberIds.map((userId) => ({
      queryKey: ["user", userId],
      queryFn: () => getUserById(userId),
      enabled: Boolean(userId),
      staleTime: 5 * 60_000, // profiles rarely change
    })),
  });

  // Build a lookup map: user_id → MemberInfo
  const memberInfoMap: Record<string, MemberInfo> = {};
  dispatchMembers.forEach((member, i) => {
    const profile = profileQueries[i]?.data;
    memberInfoMap[member.user_id] = {
      userId: member.user_id,
      name: profile?.name ?? "Staff Member",
      affiliation: member.affiliation,
      memberStatus: member.status,
      role: dispatch?.role ?? "",
    };
  });

  const { tracks, isLoading } = useDispatchTrack(id);

  // Assign stable colors per user
  const memberColors: Record<string, string> = {};
  let colorIndex = 0;
  const seen = new Set<string>();
  tracks.forEach((t) => {
    if (!seen.has(t.user_id)) {
      seen.add(t.user_id);
      memberColors[t.user_id] =
        MEMBER_COLORS[colorIndex % MEMBER_COLORS.length];
      colorIndex++;
    }
  });

  // Also assign colors for members with no location yet (so map legend is consistent)
  dispatchMembers.forEach((m) => {
    if (!seen.has(m.user_id)) {
      seen.add(m.user_id);
      memberColors[m.user_id] =
        MEMBER_COLORS[colorIndex % MEMBER_COLORS.length];
      colorIndex++;
    }
  });

  const incidentLat = incident?.location?.latitude ?? 53.35;
  const incidentLng = incident?.location?.longitude ?? -6.26;
  const stationName = dispatch?.station_name ?? "Dispatch";
  const incidentTitle =
    incident?.title || incident?.type || "Active Incident";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </button>

          <div className="flex items-start gap-2">
            <RadioTower
              className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h1 className="text-white font-semibold leading-tight truncate">
                {stationName}
              </h1>
              <p className="text-gray-400 text-xs mt-0.5 truncate">
                {incidentTitle}
              </p>
            </div>
          </div>

          {/* Dispatch meta */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Live tracking · 15s refresh</span>
            {dispatch && (
              <span
                className={
                  dispatch.status === "in_progress"
                    ? "text-blue-400"
                    : "text-gray-500"
                }
              >
                {dispatch.status.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Member list */}
        <TrackMemberPanel
          tracks={tracks}
          incidentLat={incidentLat}
          incidentLng={incidentLng}
          memberColors={memberColors}
          memberInfoMap={memberInfoMap}
          isLoading={isLoading}
        />
      </div>

      {/* Map panel */}
      <div className="flex-1">
        <TrackMapPanel
          tracks={tracks}
          incidentLat={incidentLat}
          incidentLng={incidentLng}
          memberColors={memberColors}
        />
      </div>
    </div>
  );
}
