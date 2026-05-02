import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getIncidentsPaginated,
  getMetrics,
} from "../services/core.api";
import type { AnalyticsOverview } from "../services/core.api";
import {
  computeInsights,
  computeKpiCards,
  getLastNMonths,
} from "../utils/analytics.utils";
import type {
  MonthlyBreakdownRow,
  ResolutionRateRow,
  ResponseTimeDayRow,
} from "../utils/analytics.utils";

/**
 * Converts server-side monthly_trend data into the chart format expected by Analytics.tsx.
 */
function toMonthlyBreakdown(analytics: AnalyticsOverview): MonthlyBreakdownRow[] {
  const labels = getLastNMonths(analytics.monthly_trend.length || 8);
  return (analytics.monthly_trend ?? []).map((pt, i) => ({
    month: labels[i] ?? pt.month,
    fire: pt.by_type?.fire ?? 0,
    medical:
      (pt.by_type?.medical_emergency ?? 0) +
      (pt.by_type?.medical ?? 0),
    hazmat:
      (pt.by_type?.chemical_spill ?? 0) +
      (pt.by_type?.gas_leak ?? 0),
    traffic: pt.by_type?.accident ?? 0,
  }));
}

/**
 * Converts server-side response_time_trend into the chart format.
 * Falls back to a flat target line if no data is available.
 */
function toResponseTimeData(analytics: AnalyticsOverview): ResponseTimeDayRow[] {
  const TARGET = 4.5;
  if (!analytics.response_time_trend || analytics.response_time_trend.length === 0) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      avg: TARGET,
      target: TARGET,
    }));
  }
  return analytics.response_time_trend.map((b) => ({
    day: b.period.slice(5), // "MM-DD" short label
    avg: b.avg_minutes,
    target: TARGET,
  }));
}

/**
 * Converts server-side monthly_trend into resolution rate chart data.
 */
function toResolutionData(analytics: AnalyticsOverview): ResolutionRateRow[] {
  const labels = getLastNMonths(analytics.monthly_trend.length || 8);
  return (analytics.monthly_trend ?? []).map((pt, i) => {
    const total = pt.resolved + pt.pending;
    const rate = total > 0 ? Math.round((pt.resolved / total) * 1000) / 10 : 0;
    return {
      month: labels[i] ?? pt.month,
      resolved: pt.resolved,
      pending: pt.pending,
      rate,
      total,
    };
  });
}

export function useAnalytics() {
  const analyticsQuery = useQuery({
    queryKey: ["analytics"],
    queryFn: () => getAnalyticsOverview(8),
    refetchInterval: 60_000,
  });

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: getMetrics,
    refetchInterval: 30_000,
  });

  // Lightweight incident fetch for dispatch utilization (only IDs needed)
  const incidentsQuery = useQuery({
    queryKey: ["incidents", "analytics-ids"],
    queryFn: () =>
      getIncidentsPaginated({
        page_size: 20,
        sort_by: "created_at",
        sort_order: "desc",
        status: "active",
      }),
    refetchInterval: 60_000,
  });

  const analytics = analyticsQuery.data;
  const metrics = metricsQuery.data;
  const incidents = incidentsQuery.data?.incidents ?? [];

  const monthlyIncidents = useMemo(
    () => (analytics ? toMonthlyBreakdown(analytics) : []),
    [analytics],
  );

  const responseTimeData = useMemo(
    () =>
      analytics
        ? toResponseTimeData(analytics)
        : [],
    [analytics],
  );

  const resolutionData = useMemo(
    () => (analytics ? toResolutionData(analytics) : []),
    [analytics],
  );

  const kpiCards = useMemo(
    () => (metrics ? computeKpiCards(metrics) : []),
    [metrics],
  );

  const insightsData = useMemo(
    () => (metrics ? computeInsights(metrics, []) : []),
    [metrics],
  );

  return {
    isLoading: analyticsQuery.isLoading || metricsQuery.isLoading,
    error: analyticsQuery.error || metricsQuery.error,
    monthlyIncidents,
    responseTimeData,
    resolutionData,
    kpiCards,
    insightsData,
    metrics,
    analytics,
    incidents,
  };
}
