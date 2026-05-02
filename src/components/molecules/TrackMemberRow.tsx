import { cn } from "../ui/utils";
import type { LocationPoint, MemberInfo, DispatchMemberStatus } from "../../types/core.types";

interface Props {
  userId: string;
  color: string;
  lastPoint: LocationPoint | null;
  distanceKm: number | null;
  memberInfo?: MemberInfo;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function isLive(point: LocationPoint): boolean {
  return Date.now() - new Date(point.recorded_at).getTime() < 30_000;
}

const STATUS_CONFIG: Record<
  DispatchMemberStatus,
  { label: string; color: string; bg: string }
> = {
  accepted: {
    label: "Active",
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
  },
  notified: {
    label: "Notified",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
  },
  rejected: {
    label: "Declined",
    color: "text-red-400",
    bg: "bg-red-500/20",
  },
  completed: {
    label: "Completed",
    color: "text-gray-400",
    bg: "bg-gray-700",
  },
};

function StatusBadge({ status }: { status: DispatchMemberStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.notified;
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
        cfg.color,
        cfg.bg,
      )}
    >
      {cfg.label}
    </span>
  );
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TrackMemberRow({
  userId,
  color,
  lastPoint,
  distanceKm,
  memberInfo,
}: Props) {
  const timeAgo = lastPoint
    ? formatTimeAgo(new Date(lastPoint.recorded_at))
    : null;
  const live = lastPoint ? isLive(lastPoint) : false;
  const displayName = memberInfo?.name ?? "Staff Member";
  const affiliation = memberInfo?.affiliation;
  const role = memberInfo?.role ? formatRole(memberInfo.role) : null;
  const memberStatus = memberInfo?.memberStatus ?? "notified";

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
      role="listitem"
    >
      {/* Color indicator — pulsing when live */}
      <div className="relative flex-shrink-0 mt-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {live && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Text column */}
      <div className="flex-1 min-w-0">
        {/* Name + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-white font-medium truncate">{displayName}</p>
          <StatusBadge status={memberStatus} />
        </div>

        {/* Affiliation / role */}
        {(affiliation || role) && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {[affiliation, role].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Last seen + accuracy */}
        {lastPoint ? (
          <p className="text-xs text-gray-500 mt-0.5">
            {timeAgo}
            {lastPoint.accuracy > 0 && (
              <span className="ml-1.5 text-gray-600">
                ±{Math.round(lastPoint.accuracy)}m
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-gray-600 mt-0.5">No location data</p>
        )}
      </div>

      {/* Distance */}
      {distanceKm !== null && (
        <div className="flex-shrink-0 text-right mt-0.5">
          <span className="text-sm font-medium text-gray-300">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`}
          </span>
          <p className="text-[10px] text-gray-600">from scene</p>
        </div>
      )}
    </div>
  );
}
