import { useCallback, useEffect, useState } from "react";
import { getIncidentsPaginated } from "../services/core.api";
import type { Incident } from "../types/core.types";

/**
 * All supported server-side filters for incident queries.
 * Every field maps directly to a ListIncidentsParams key.
 */
export interface IncidentFetchOptions {
  /** Filter by lifecycle status: "reported" | "verified" | "responding" | "active" | "contained" | "resolved" | "closed" */
  status?: string;
  /** Filter by severity code: "P0" – "P6" */
  severity?: string;
  /** Filter by incident type string */
  type?: string;
  /** Full-text search (forwarded when the API supports it) */
  search?: string;
  /** Bounding-box filter: "minLat,minLon,maxLat,maxLon" */
  bbox?: string;
  /**
   * `true`  → internal-only alerts (ERT ops, system-generated)
   * `false` → public / citizen-submitted incidents
   * `undefined` → no filter (all incidents)
   */
  isInternal?: boolean;
  /** ISO-8601 lower bound for created_at */
  fromDate?: string;
  /** ISO-8601 upper bound for created_at */
  toDate?: string;
}

/**
 * useIncidents — polling hook for a single page of incidents.
 *
 * Supports every server-side filter. Refreshes on `pollInterval`.
 * Use `pageSize` to control how many records are fetched per poll.
 *
 * For infinite-scroll / load-more behaviour use `useInfiniteIncidents` instead.
 *
 * @example — public pending alerts only
 * const { incidents } = useIncidents(50, 30_000, { isInternal: false, status: "reported" });
 *
 * @example — internal operational incidents for the map overlay
 * const { incidents } = useIncidents(1000, 30_000, { isInternal: true });
 *
 * @example — all active incidents regardless of origin
 * const { incidents } = useIncidents(1000, 30_000, { status: "active" });
 */
export function useIncidents(
  pageSize = 100,
  pollInterval = 30_000,
  options: IncidentFetchOptions = {},
) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const result = await getIncidentsPaginated({
        sort_by: "created_at",
        sort_order: "desc",
        page_size: pageSize,
        status: options.status,
        severity: options.severity,
        type: options.type,
        search: options.search,
        bbox: options.bbox,
        is_internal: options.isInternal,
        from_date: options.fromDate,
        to_date: options.toDate,
      });
      setIncidents(result.incidents);
      setTotalCount(result.total_count);
    } catch (e: any) {
      setError(e.message ?? "Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  }, [
    pageSize,
    options.status,
    options.severity,
    options.type,
    options.search,
    options.bbox,
    options.isInternal,
    options.fromDate,
    options.toDate,
  ]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { incidents, isLoading, error, totalCount, refetch: fetch };
}
