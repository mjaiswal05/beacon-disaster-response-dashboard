import { CheckCircle, Loader2, MessageSquare, TrendingUp, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useIncidentActions } from '../../hooks/useIncidentActions';
import { getErrorMessage } from '../../utils/error.utils';
import { toast } from '../../utils/toast';
import { cn } from '../ui/utils';

interface IncidentActionsPanelProps {
  incidentId: string;
  incidentStatus: string;
  hasActiveDispatches?: boolean;
  hasActiveEvacuations?: boolean;
  isApproved: boolean;
}

type ActiveForm = 'close' | 'escalate' | 'approve' | 'update' | null;

const SEVERITIES = ['P0', 'P1', 'P2', 'P3'];

export function IncidentActionsPanel({ incidentId, incidentStatus, hasActiveDispatches, hasActiveEvacuations, isApproved }: IncidentActionsPanelProps) {
  const { close, escalate, approve, recordUpdate } = useIncidentActions(incidentId);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [message, setMessage] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState('P0');
  const status = (incidentStatus ?? '').toLowerCase();
  const isClosed = status === 'closed' || status === 'resolved';
  const closeBlocked = hasActiveDispatches || hasActiveEvacuations;
  const canApprove = !isApproved && (status === 'reported' || status === 'pending');

  const handleClose = async () => {
    try {
      await close.mutateAsync(message || undefined);
      setMessage(''); setActiveForm(null);
      toast.success('Incident closed successfully.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleEscalate = async () => {
    try {
      await escalate.mutateAsync({ new_severity: escalateSeverity, message: message || undefined });
      setMessage(''); setActiveForm(null);
      toast.success(`Incident escalated to ${escalateSeverity}.`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleApprove = async () => {
    try {
      await approve.mutateAsync(message || undefined);
      setMessage(''); setActiveForm(null);
      toast.success('Incident approved.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleUpdate = async () => {
    if (!message.trim()) return;
    try {
      await recordUpdate.mutateAsync({ update_message: message.trim(), should_alert: true });
      setMessage(''); setActiveForm(null);
      toast.success('Update recorded.');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const toggle = (form: ActiveForm) => {
    setActiveForm((prev) => (prev === form ? null : form));
    setMessage('');
  };

  const btnBase = 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-3">
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {!isClosed && (
          <button
            onClick={() => !closeBlocked && toggle('close')}
            disabled={closeBlocked}
            title={
              closeBlocked
                ? `Cannot close: ${[hasActiveDispatches && 'active dispatches in progress', hasActiveEvacuations && 'active evacuations in progress'].filter(Boolean).join(', ')}`
                : undefined
            }
            className={cn(btnBase, closeBlocked
              ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
              : 'bg-red-900/20 border-red-800/50 text-red-400 hover:bg-red-900/40')}
          >
            {close.isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
            Close Incident
          </button>
        )}
        <button onClick={() => toggle('escalate')} className={cn(btnBase, 'bg-orange-900/20 border-orange-800/50 text-orange-400 hover:bg-orange-900/40')}>
          {escalate.isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <TrendingUp className="w-3 h-3" aria-hidden="true" />}
          Escalate
        </button>
        {canApprove && (
          <button onClick={() => toggle('approve')} className={cn(btnBase, 'bg-green-900/20 border-green-800/50 text-green-400 hover:bg-green-900/40')}>
            {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-3 h-3" aria-hidden="true" />}
            Approve
          </button>
        )}
        <button onClick={() => toggle('update')} className={cn(btnBase, 'bg-blue-900/20 border-blue-800/50 text-blue-400 hover:bg-blue-900/40')}>
          {recordUpdate.isPending ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <MessageSquare className="w-3 h-3" aria-hidden="true" />}
          Record Update
        </button>
      </div>

      {/* Close blocked warning */}
      {closeBlocked && !isClosed && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 text-xs" role="alert">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Cannot close:{' '}
            {[hasActiveDispatches && 'active dispatches are in progress', hasActiveEvacuations && 'active evacuations are in progress'].filter(Boolean).join(' and ')}. Resolve them first.
          </span>
        </div>
      )}

      {/* Inline form for escalate */}
      {activeForm === 'escalate' && (
        <div className="space-y-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
          <p className="text-xs text-gray-400 font-medium">New severity level</p>
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => setEscalateSeverity(s)}
                className={cn('px-2.5 py-1 rounded text-xs font-semibold border transition-colors', escalateSeverity === s ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600')}
              >{s}</button>
            ))}
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reason for escalation (optional)" rows={2}
            className="w-full resize-none rounded-lg bg-gray-800 border border-gray-700 text-white text-xs px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-gray-600" />
          <div className="flex gap-2">
            <button onClick={handleEscalate} disabled={escalate.isPending} className="flex-1 h-8 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {escalate.isPending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />} Escalate
            </button>
            <button onClick={() => setActiveForm(null)} className="px-3 h-8 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Inline form for close / approve / update */}
      {(activeForm === 'close' || activeForm === 'approve' || activeForm === 'update') && (
        <div className="space-y-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder={activeForm === 'update' ? 'Update message (required)…' : 'Optional message…'}
            rows={2}
            className="w-full resize-none rounded-lg bg-gray-800 border border-gray-700 text-white text-xs px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-gray-600" />
          <div className="flex gap-2">
            <button
              onClick={activeForm === 'close' ? handleClose : activeForm === 'approve' ? handleApprove : handleUpdate}
              disabled={close.isPending || approve.isPending || recordUpdate.isPending || (activeForm === 'update' && !message.trim())}
              className={cn('flex-1 h-8 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50',
                activeForm === 'close' ? 'bg-red-600 hover:bg-red-500' : activeForm === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500')}
            >
              {(close.isPending || approve.isPending || recordUpdate.isPending) && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
              {activeForm === 'close' ? 'Close Incident' : activeForm === 'approve' ? 'Approve' : 'Record Update'}
            </button>
            <button onClick={() => setActiveForm(null)} className="px-3 h-8 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
