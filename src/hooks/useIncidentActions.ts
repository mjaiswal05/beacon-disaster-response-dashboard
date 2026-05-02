import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  closeIncident,
  escalateIncident,
  approveIncident,
  recordIncidentUpdate,
} from '../services/core.api';
import type {
  EscalateIncidentPayload,
  RecordIncidentUpdatePayload,
} from '../services/core.api';

export function useIncidentActions(incidentId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
    queryClient.invalidateQueries({ queryKey: ['incident-events', incidentId] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  };

  const close = useMutation({
    mutationFn: (message?: string) => closeIncident(incidentId, message),
    onSuccess: invalidate,
  });

  const escalate = useMutation({
    mutationFn: (payload: EscalateIncidentPayload) =>
      escalateIncident(incidentId, payload),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (message?: string) => approveIncident(incidentId, message),
    onSuccess: invalidate,
  });

  const recordUpdate = useMutation({
    mutationFn: (payload: RecordIncidentUpdatePayload) =>
      recordIncidentUpdate(incidentId, payload),
    onSuccess: invalidate,
  });

  return { close, escalate, approve, recordUpdate };
}
