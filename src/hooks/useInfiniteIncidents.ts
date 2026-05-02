import { useCallback, useEffect, useRef, useState } from "react";
import { getIncidentsPaginated } from "../services/core.api";
import type { Incident, ListIncidentsParams } from "../types/core.types";

interface UseInfiniteIncidentsParams {
  severity?: string;
  type?: string;
  status?: string;
  pageSize?: number;
  pollInterval?: number;
  search?: string;
  // Bounding box for county filtering (format: "lat1,lon1,lat2,lon2")
  bbox?: string;
  /**
   * `true`  → internal-only alerts
   * `false` → public / citizen-submitted incidents
   * `undefined` → no filter (all incidents)
   */
  isInternal?: boolean;
}

interface UseInfiniteIncidentsReturn {
  incidents: Incident[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
  refetch: () => void;
}

export function useInfiniteIncidents(
  params: UseInfiniteIncidentsParams = {},
): UseInfiniteIncidentsReturn {
  const {
    severity,
    type,
    status,
    pageSize = 25,
    pollInterval = 30_000,
    search,
    bbox,
    isInternal,
  } = params;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string>("");
  const [totalCount, setTotalCount] = useState(0);

  // Track whether a fetch is in-flight to prevent duplicate requests
  const isFetchingRef = useRef(false);
  // Ref mirror of nextPageToken so loadMore can read the latest value
  // without being recreated every time the token changes
  const nextPageTokenRef = useRef<string>("");

  const mergeFirstPageIntoLoaded = useCallback(
    (firstPage: Incident[]) => {
      setIncidents((prev) => {
        if (prev.length === 0) return firstPage;
        const firstPageIds = new Set(firstPage.map((incident) => incident.id));
        const remaining = prev.filter((incident) => !firstPageIds.has(incident.id));
        return [...firstPage, ...remaining];
      });
    },
    [],
  );

  // Build API params shared across first-page and next-page fetches
  const buildApiParams = useCallback(
    (pageToken?: string): ListIncidentsParams => {
      const apiParams: ListIncidentsParams = {
        sort_by: "created_at",
        sort_order: "desc",
        page_size: pageSize,
      };
      if (severity) apiParams.severity = severity;
      if (type) apiParams.type = type;
      if (status) apiParams.status = status;
      if (pageToken) apiParams.page_token = pageToken;
      if (bbox) apiParams.bbox = bbox;
      if (search) apiParams.search = search;
      if (isInternal !== undefined) apiParams.is_internal = isInternal;
      return apiParams;
    },
    [severity, type, status, pageSize, bbox, search, isInternal],
  );

  // Fetch the first page (used for initial load, filter changes, and polling)
  const fetchFirstPage = useCallback(async (mode: "replace" | "merge" = "replace") => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);

    try {
      const result = await getIncidentsPaginated(buildApiParams());
      if (mode === "merge") {
        mergeFirstPageIntoLoaded(result.incidents);
      } else {
        setIncidents(result.incidents);
      }
      setNextPageToken(result.next_page_token);
      nextPageTokenRef.current = result.next_page_token;
      setTotalCount(result.total_count);
    } catch (e: any) {
      setError(e.message ?? "Failed to load incidents");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [buildApiParams, mergeFirstPageIntoLoaded]);

  // Fetch the next page and append results.
  // Reads nextPageToken from a ref so this function stays stable
  // between page loads — preventing the IntersectionObserver from
  // being torn down and recreated (which would immediately re-trigger loadMore).
  const loadMore = useCallback(() => {
    if (isFetchingRef.current || !nextPageTokenRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    getIncidentsPaginated(buildApiParams(nextPageTokenRef.current))
      .then((result) => {
        setIncidents((prev) => {
          const seenIds = new Set(prev.map((incident) => incident.id));
          const uniqueNext = result.incidents.filter(
            (incident) => !seenIds.has(incident.id),
          );
          return [...prev, ...uniqueNext];
        });
        setNextPageToken(result.next_page_token);
        nextPageTokenRef.current = result.next_page_token;
        setTotalCount(result.total_count);
      })
      .catch((e: any) => {
        setError(e.message ?? "Failed to load more incidents");
      })
      .finally(() => {
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      });
  }, [buildApiParams]); // stable — no longer depends on nextPageToken state

  // Reset and refetch when filters change
  const refetch = useCallback(() => {
    setIsLoading(true);
    setIncidents([]);
    setNextPageToken("");
    nextPageTokenRef.current = "";
    setTotalCount(0);
    // Clear the fetching flag so fetchFirstPage can proceed
    isFetchingRef.current = false;
    fetchFirstPage("replace");
  }, [fetchFirstPage]);

  // Initial load + reset when filters change
  useEffect(() => {
    setIsLoading(true);
    setIncidents([]);
    setNextPageToken("");
    nextPageTokenRef.current = "";
    setTotalCount(0);
    isFetchingRef.current = false;
    fetchFirstPage("replace");
  }, [fetchFirstPage]);

  // Poll the first page at the configured interval
  useEffect(() => {
    if (pollInterval <= 0) return;
    const id = setInterval(() => {
      void fetchFirstPage("merge");
    }, pollInterval);
    return () => clearInterval(id);
  }, [fetchFirstPage, pollInterval]);

  const hasMore = nextPageToken !== "";

  return {
    incidents,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refetch,
  };
}
