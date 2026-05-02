import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getIncidentsPaginated } from "../services/core.api";
import type { Incident } from "../types/core.types";
import { useMetrics } from "./useMetrics";

const ALERT_POLL_MS = 15_000;
const MAX_INCIDENT_AGE_SECONDS = 90;

export function useNewIncidentAlert(onNewIncident: (incident: Incident) => void) {
  const { metrics } = useMetrics();
  const queryClient = useQueryClient();

  const prevCountRef = useRef<number | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function checkForNew() {
      if (cancelled) return;

      const currentCount = metrics.active_incidents;

      // On first render just set the baseline, don't alert
      if (prevCountRef.current === null) {
        prevCountRef.current = currentCount;
        return;
      }

      // Count increased - fetch the latest incident to check severity & age
      if (currentCount > prevCountRef.current) {
        prevCountRef.current = currentCount;
        try {
          const result = await getIncidentsPaginated({
            page_size: 1,
            sort_by: "created_at",
            sort_order: "desc",
          });
          const latest = result.incidents?.[0];
          if (!latest) return;

          // Skip if already alerted
          if (alertedIdsRef.current.has(latest.id)) return;

          // Only alert for P0 / P1
          if (latest.severity !== "P0" && latest.severity !== "P1") return;

          // Only alert if incident is fresh (< 90s old)
          const ageSeconds =
            (Date.now() - new Date(latest.created_at).getTime()) / 1000;
          if (ageSeconds > MAX_INCIDENT_AGE_SECONDS) return;

          alertedIdsRef.current.add(latest.id);
          onNewIncident(latest);

          // Invalidate incidents cache so lists refresh
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        } catch {
          // Silently swallow - this is a background check
        }
      } else {
        prevCountRef.current = currentCount;
      }
    }

    checkForNew();
    const interval = setInterval(checkForNew, ALERT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [metrics.active_incidents, onNewIncident, queryClient]);
}
