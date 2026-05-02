import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Users, Clock, CheckCircle, XCircle, Loader2, MapPin } from 'lucide-react';
import type { Dispatch } from '../../types/core.types';
import {
  acceptDispatch,
  rejectDispatch,
  completeDispatch,
  cancelDispatch,
} from '../../services/core.api';
import { cn } from '../ui/utils';
import { TimeAgo } from '../atoms/TimeAgo';
import { toast } from '../../utils/toast';
import { getErrorMessage } from '../../utils/error.utils';

interface DispatchCardProps {
  dispatch: Dispatch;
  onActionComplete?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_acceptance: { bg: 'rgba(255,214,10,0.15)', text: '#FFD60A', label: 'Pending' },
  in_progress: { bg: 'rgba(37,99,235,0.15)', text: '#2563EB', label: 'In Progress' },
  completed: { bg: 'rgba(50,215,75,0.15)', text: '#32D74B', label: 'Completed' },
  failed: { bg: 'rgba(255,69,58,0.15)', text: '#FF453A', label: 'Failed' },
  cancelled: { bg: 'rgba(138,143,152,0.15)', text: '#8A8F98', label: 'Cancelled' },
};

export function DispatchCard({ dispatch, onActionComplete }: DispatchCardProps) {
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();

  const style = STATUS_STYLES[dispatch.status] ?? STATUS_STYLES.pending_acceptance;

  const runAction = async (action: () => Promise<unknown>) => {
    setIsPending(true);
    try {
      await action();
      onActionComplete?.();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsPending(false);
    }
  };

  const btnBase = cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 space-y-3">
      {/* Top row: station + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-orange-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{dispatch.station_name || 'Unknown Station'}</p>
            <p className="text-gray-400 text-xs capitalize">{dispatch.role}</p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
          style={{ background: style.bg, color: style.text }}
        >
          {style.label}
        </span>
      </div>

      {/* Info row: accepted count + timeout */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" aria-hidden="true" />
          {dispatch.accepted_count}/{dispatch.required_count} accepted
        </span>
        {dispatch.timeout_at && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <TimeAgo timestamp={dispatch.timeout_at} className="text-xs text-gray-400" />
          </span>
        )}
      </div>

      {(dispatch.status === 'in_progress') && (
        <div className="flex gap-2">
          <button
            onClick={() => runAction(() => completeDispatch(dispatch.id))}
            disabled={isPending}
            className={cn(btnBase, 'flex-1 bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-900/50 justify-center')}
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-3 h-3" aria-hidden="true" />}
            Complete
          </button>
          <button
            onClick={() => runAction(() => cancelDispatch(dispatch.id))}
            disabled={isPending}
            className={cn(btnBase, 'flex-1 bg-gray-700/50 border-gray-600/50 text-gray-400 hover:bg-gray-700 justify-center')}
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
            Cancel
          </button>
        </div>
      )}

      {dispatch.status === 'in_progress' && (
        <button
          onClick={() => navigate(`/dispatches/${dispatch.id}/track`)}
          className={cn(btnBase, 'w-full bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30 justify-center')}
          aria-label="Track deployed staff on map"
        >
          <MapPin className="w-3 h-3" aria-hidden="true" />
          Track Staff
        </button>
      )}
    </div>
  );
}
