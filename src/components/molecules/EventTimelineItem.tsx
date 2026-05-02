import { Activity, Building2, Clock, MapPin, User } from 'lucide-react';
import type { EventMetadata } from '../../types/core.types';
import { TimeAgo } from '../atoms/TimeAgo';
import { cn } from '../ui/utils';

interface EventTimelineItemProps {
  action: string;
  message: string;
  changedBy: string;
  createdAt: string;
  metadata?: EventMetadata;
  visible_to_citizens?: boolean;
  actorNames?: Record<string, string>;
  hideLeadingDot?: boolean;
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: '#32D74B',
  updated: '#2563EB',
  closed: '#8A8F98',
  escalated: '#FF453A',
  approved: '#32D74B',
  alerted: '#FF9F0A',
  resolved: '#32D74B',
  dispatch_created: '#FF9F0A',
  dispatch_accepted: '#32D74B',
  dispatch_rejected: '#FF453A',
  dispatch_completed: '#32D74B',
  evacuation_created: '#A855F7',
};

function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? ACTION_COLORS[action.toLowerCase().split('_')[0]] ?? '#60A5FA';
}

const ROLE_LABELS: Record<string, string> = {
  ROLE_GROUND_STAFF: 'Ground Staff',
  ROLE_ERT_MEMBERS: 'ERT',
  ROLE_SYS_ADMIN: 'Admin',
  ROLE_CITIZENS: 'Citizen',
  'internal-service': 'Internal',
};

function actorDisplay(changedBy: string, meta?: EventMetadata, actorNames?: Record<string, string>): string {
  if (meta?.actor?.name) return meta.actor.name;
  if (!changedBy || changedBy === 'system' || changedBy === 'internal-service') return 'System';
  if (actorNames?.[changedBy]) return actorNames[changedBy];
  return 'Unknown User';
}

export function EventTimelineItem({
  action,
  message,
  changedBy,
  createdAt,
  metadata,
  actorNames,
  hideLeadingDot = false,
  className,
}: EventTimelineItemProps) {
  const color = getActionColor(action);
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={cn(
        'p-3 rounded-xl',
        'bg-gray-800/50 border border-gray-700',
        !hideLeadingDot && 'flex gap-3',
        className,
      )}
    >
      {/* Colored dot */}
      {!hideLeadingDot && (
        <div className="flex flex-col items-center pt-1 shrink-0">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
            aria-hidden="true"
          />
        </div>
      )}

      <div className={cn('min-w-0', !hideLeadingDot && 'flex-1')}>
        {/* Action title */}
        <div className="flex items-center gap-1.5 mb-1">
          <Activity className="w-3 h-3 shrink-0" style={{ color }} aria-hidden="true" />
          <span className="text-white text-xs font-semibold">{label}</span>
        </div>

        {/* Message body */}
        {message && (
          <p className="text-gray-300 text-xs leading-relaxed mb-2">{message}</p>
        )}

        {/* Entity chip — station or evacuation zone */}
        {metadata?.entity && (
          <div className="flex items-center gap-1 mt-1.5">
            {metadata.entity.type === 'evacuation' ? (
              <MapPin className="w-3 h-3 text-purple-400" />
            ) : (
              <Building2 className="w-3 h-3 text-blue-400" />
            )}
            <span className="text-xs text-blue-400 font-medium">{metadata.entity.name}</span>
          </div>
        )}

        {/* Footer: who + when */}
        <div className="flex items-center gap-3 text-gray-400 mt-2">
          {/* Actor name */}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User className="w-3 h-3" aria-hidden="true" />
            {actorDisplay(changedBy, metadata, actorNames)}
          </span>

          {/* Role badge — only when present */}
          {metadata?.actor?.role && ROLE_LABELS[metadata.actor.role] && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-300">
              {ROLE_LABELS[metadata.actor.role]}
            </span>
          )}

          <span className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <TimeAgo timestamp={createdAt} className="text-xs text-gray-400" />
          </span>
        </div>
      </div>
    </div>
  );
}
