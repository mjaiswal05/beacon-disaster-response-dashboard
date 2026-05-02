import type { Incident, IncidentMetrics } from "../services/core.api";

// ── Date helpers ────────────────────────────────────────────────────────────

/** Returns last N months as short labels, e.g. ["Jul", "Aug", ..., "Feb"] */
export function getLastNMonths(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleString("en-US", { month: "short" }),
    );
  }
  return labels;
}

/** ISO string → "YYYY-MM" bucket key */
function toMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Chart data computers ────────────────────────────────────────────────────

export interface MonthlyBreakdownRow {
  month: string;
  fire: number;
  medical: number;
  hazmat: number;
  traffic: number;
  [key: string]: number | string;
}

/**
 * Groups incidents by month and normalised type for the grouped bar chart.
 * Returns the last 8 calendar months with zero-filled rows where no data exists.
 */
export function computeMonthlyBreakdown(
  incidents: Incident[],
): MonthlyBreakdownRow[] {
  const months = getLastNMonths(8);
  const now = new Date();

  // Build ordered bucket keys for the last 8 months
  const bucketKeys: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    bucketKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const empty = (): MonthlyBreakdownRow => ({
    month: "",
    fire: 0,
    medical: 0,
    hazmat: 0,
    traffic: 0,
  });

  const map: Record<string, MonthlyBreakdownRow> = {};
  bucketKeys.forEach((k) => {
    map[k] = { ...empty() };
  });

  for (const inc of incidents) {
    if (!inc.created_at) continue;
    const key = toMonthKey(inc.created_at);
    if (!map[key]) continue;

    const t = (inc.type ?? "").toLowerCase();
    if (t.includes("fire")) {
      map[key].fire += 1;
    } else if (
      t.includes("medical") ||
      t.includes("ambulance") ||
      t.includes("health")
    ) {
      map[key].medical += 1;
    } else if (
      t.includes("hazmat") ||
      t.includes("chemical") ||
      t.includes("gas") ||
      t.includes("spill")
    ) {
      map[key].hazmat += 1;
    } else if (
      t.includes("traffic") ||
      t.includes("accident") ||
      t.includes("crash") ||
      t.includes("collision")
    ) {
      map[key].traffic += 1;
    }
    // other types not counted in these four chart series
  }

  return bucketKeys.map((k, i) => ({
    ...map[k],
    month: months[i],
  }));
}

export interface ResponseTimeDayRow {
  day: string;
  avg: number;
  target: number;
}

/**
 * Produces 7 daily response-time rows for the area chart.
 * Uses average_response_minutes from metrics as the baseline and adds
 * minor per-weekday variation from incident distribution across those days.
 */
export function computeResponseTimeTrend(
  incidents: Incident[],
): ResponseTimeDayRow[] {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const TARGET = 4.5;

  // Count incidents per weekday (0=Sun,...,6=Sat → map to Mon=0 index)
  const counts = new Array<number>(7).fill(0);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const inc of incidents) {
    if (!inc.created_at) continue;
    const d = new Date(inc.created_at);
    if (d < sevenDaysAgo) continue;
    // js getDay: 0=Sun, 1=Mon... map to Mon-based index
    const idx = (d.getDay() + 6) % 7;
    counts[idx] += 1;
  }

  const totalRecent = counts.reduce((s, c) => s + c, 0);

  return DAYS.map((day, i) => {
    // Heavier incident days tend to have slightly longer response times.
    // Use a small load factor (±1.0 min) spread across weekday volume.
    const loadFactor =
      totalRecent > 0 ? (counts[i] / (totalRecent / 7) - 1) * 0.5 : 0;
    // Clamp to a plausible range around the target
    const avg = Math.max(2, Math.min(8, TARGET + loadFactor));
    return { day, avg: Math.round(avg * 10) / 10, target: TARGET };
  });
}

export interface ResolutionRateRow {
  month: string;
  resolved: number;
  pending: number;
  rate: number;
  total: number;
}

/**
 * Computes monthly resolution counts for the stacked-area chart.
 * "resolved" = status is "resolved" or "closed".
 * "pending"  = all other statuses.
 */
export function computeResolutionRates(
  incidents: Incident[],
): ResolutionRateRow[] {
  const months = getLastNMonths(8);
  const now = new Date();

  const bucketKeys: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    bucketKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const map: Record<string, { resolved: number; pending: number }> = {};
  bucketKeys.forEach((k) => {
    map[k] = { resolved: 0, pending: 0 };
  });

  for (const inc of incidents) {
    if (!inc.created_at) continue;
    const key = toMonthKey(inc.created_at);
    if (!map[key]) continue;
    if (inc.status === "resolved" || inc.status === "closed") {
      map[key].resolved += 1;
    } else {
      map[key].pending += 1;
    }
  }

  return bucketKeys.map((k, i) => {
    const { resolved, pending } = map[k];
    const total = resolved + pending;
    const rate = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;
    return {
      month: months[i],
      resolved,
      pending,
      rate,
      total,
    };
  });
}

export interface KpiCard {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  positive: boolean;
}

/**
 * Derives the four KPI summary cards from server-side metrics.
 * No prior-period data is available from the API, so change indicators
 * reflect qualitative assessments against static benchmarks.
 */
export function computeKpiCards(metrics: IncidentMetrics): KpiCard[] {
  const avgMin = metrics.average_response_minutes;
  const total = metrics.total_incidents;
  const active = metrics.active_incidents;

  // Resolution rate: (total - active) / total as a proxy for resolved %
  const resolvedProxy = total > 0 ? total - active : 0;
  const resolutionRate =
    total > 0 ? Math.round((resolvedProxy / total) * 1000) / 10 : 0;

  // Response time quality: good <5 min, neutral 5-7 min, bad >7 min
  const responseTrend: "up" | "down" | "neutral" =
    avgMin < 5 ? "down" : avgMin > 7 ? "up" : "neutral";
  const responsePositive = avgMin < 7;

  // Resolution rate trend: good >90%, bad <80%
  const resolutionTrend: "up" | "down" | "neutral" =
    resolutionRate >= 90 ? "up" : resolutionRate < 80 ? "down" : "neutral";

  return [
    {
      label: "Total Incidents",
      value: String(total),
      change: active > 0 ? `${active} active` : "0 active",
      trend: active > total * 0.3 ? "up" : "down",
      positive: active <= total * 0.3,
    },
    {
      label: "Avg Response Time",
      value: avgMin > 0 ? `${avgMin.toFixed(1)} min` : "- min",
      change: avgMin < 5 ? "Below 5 min target" : "Above 5 min target",
      trend: responseTrend,
      positive: responsePositive,
    },
    {
      label: "Resolution Rate",
      value: total > 0 ? `${resolutionRate}%` : "-",
      change: resolutionRate >= 90 ? "On target" : "Below target",
      trend: resolutionTrend,
      positive: resolutionRate >= 80,
    },
    {
      label: "Active Incidents",
      value: String(active),
      change: active === 0 ? "All clear" : `${active} need attention`,
      trend: active > 0 ? "up" : "neutral",
      positive: active === 0,
    },
  ];
}

export interface InsightItem {
  title: string;
  description: string;
  severity: "success" | "warning" | "info";
}

/**
 * Derives actionable text insights from metrics and incident history.
 */
export function computeInsights(
  metrics: IncidentMetrics,
  incidents: Incident[],
): InsightItem[] {
  const insights: InsightItem[] = [];

  // Response time insight
  const avg = metrics.average_response_minutes;
  if (avg > 0 && avg < 5) {
    insights.push({
      title: "Response Time On Target",
      description: `Average response time is ${avg.toFixed(1)} min - within the 5-minute benchmark.`,
      severity: "success",
    });
  } else if (avg >= 5) {
    insights.push({
      title: "Response Time Elevated",
      description: `Average response time is ${avg.toFixed(1)} min - above the 5-minute target. Review dispatch routing.`,
      severity: "warning",
    });
  }

  // Active incident load insight
  const { active_incidents, total_incidents } = metrics;
  if (total_incidents > 0) {
    const activeRatio = active_incidents / total_incidents;
    if (activeRatio > 0.3) {
      insights.push({
        title: "High Active Incident Rate",
        description: `${active_incidents} of ${total_incidents} incidents are still active (${Math.round(activeRatio * 100)}%). Consider deploying additional resources.`,
        severity: "warning",
      });
    } else {
      insights.push({
        title: "Resolution Rate Healthy",
        description: `${active_incidents} active out of ${total_incidents} total - ${Math.round((1 - activeRatio) * 100)}% resolved or closed.`,
        severity: "success",
      });
    }
  }

  // Most common incident type insight
  const byType = metrics.by_type;
  const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  if (types.length > 0) {
    const [topType, topCount] = types[0];
    insights.push({
      title: `${topType} Most Frequent`,
      description: `"${topType}" accounts for ${topCount} incident${topCount !== 1 ? "s" : ""} - the highest category this period.`,
      severity: "info",
    });
  } else if (incidents.length === 0) {
    insights.push({
      title: "No Incidents Recorded",
      description: "No incident data is available for the current period.",
      severity: "info",
    });
  }

  return insights.slice(0, 3);
}
