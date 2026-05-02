import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useDispatches } from "../../hooks/useDispatches";
import { fadeUp, springGentle, staggerContainer } from "../../utils/animations";

interface AnalyticsProps {
  onBack: () => void;
}

// Visual configuration for the four KPI card slots (order matches computeKpiCards output)
const KPI_VISUAL: Array<{
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}> = [
    {
      icon: AlertTriangle,
      iconColor: "#FF453A",
      iconBg: "rgba(255,69,58,0.15)",
    },
    {
      icon: Clock,
      iconColor: "#32D74B",
      iconBg: "rgba(50,215,75,0.15)",
    },
    {
      icon: Zap,
      iconColor: "#2563EB",
      iconBg: "rgba(37,99,235,0.15)",
    },
    {
      icon: Users,
      iconColor: "#9333EA",
      iconBg: "rgba(147,51,234,0.15)",
    },
  ];

// Visual configuration for insight severity levels
const INSIGHT_VISUAL: Record<
  "success" | "warning" | "info",
  { Icon: LucideIcon; color: string }
> = {
  success: { Icon: TrendingDown, color: "#32D74B" },
  warning: { Icon: TrendingUp, color: "#FF9F0A" },
  info: { Icon: TrendingUp, color: "#2563EB" },
};


function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-[10px]"
      style={{
        background: "rgba(20,20,20,0.97)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        style={{
          color: "var(--muted-foreground)",
          fontSize: "11px",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <p
          key={i}
          style={{ color: p.color, fontSize: "12px", fontWeight: 600 }}
        >
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function LegendDots({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.dashed ? (
            <div
              className="w-6 h-[2px] rounded-full"
              style={{ background: item.color, opacity: 0.5 }}
            />
          ) : (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: item.color }}
            />
          )}
          <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Analytics({ onBack: _onBack }: AnalyticsProps) {
  const {
    isLoading,
    error,
    monthlyIncidents,
    responseTimeData,
    resolutionData,
    kpiCards,
    insightsData,
    incidents,
  } = useAnalytics();

  const { dispatches } = useDispatches();

  /**
   * Unit utilization derived from dispatch data.
   * Methodology: for each station that appears in dispatches,
   * utilization % = (in_progress dispatches / total dispatches) * 100.
   * Stations with no dispatches are not shown.
   * Falls back to an empty array if no dispatch data is available.
   */
  const unitUtilization = useMemo(() => {
    if (dispatches.length === 0) return [];

    const stationMap = new Map<string, { total: number; active: number }>();
    for (const d of dispatches) {
      const name = d.station_name || "Unknown Station";
      const entry = stationMap.get(name) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (d.status === "in_progress") entry.active += 1;
      stationMap.set(name, entry);
    }

    return Array.from(stationMap.entries())
      .map(([unit, { total, active }]) => ({
        unit,
        utilization: Math.min(100, Math.round((active / total) * 100)),
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 6); // Show at most 6 stations
  }, [dispatches]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading analytics…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p
          role="alert"
          style={{ color: "#FF453A", fontSize: "14px" }}
        >
          Failed to load analytics:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ──────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <h1
          className="text-foreground"
          style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2 }}
        >
          Analytics
        </h1>
        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "14px",
            marginTop: 4,
          }}
        >
          Performance metrics and incident analysis
        </p>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-4 gap-4"
        variants={staggerContainer}
      >
        {kpiCards.map((kpi, idx) => {
          const visual = KPI_VISUAL[idx % KPI_VISUAL.length];
          const color = kpi.positive ? "#32D74B" : "#FF453A";
          return (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="rounded-[16px] p-5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--secondary)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
                >
                  {kpi.label}
                </span>
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ background: visual.iconBg }}
                >
                  <visual.icon
                    className="w-4 h-4"
                    style={{ color: visual.iconColor }}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span
                  className="text-foreground"
                  style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1 }}
                >
                  {kpi.value}
                </span>
                <div className="flex items-center gap-1 mb-1">
                  {kpi.trend === "up" ? (
                    <ArrowUpRight
                      className="w-3.5 h-3.5"
                      style={{ color }}
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowDownRight
                      className="w-3.5 h-3.5"
                      style={{ color }}
                      aria-hidden="true"
                    />
                  )}
                  <span style={{ fontSize: "12px", fontWeight: 600, color }}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Charts 2×2 ───────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 gap-5"
        variants={staggerContainer}
      >
        {/* Incidents by Type - grouped bar */}
        <motion.div
          variants={fadeUp}
          className="rounded-[20px] p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className="text-foreground"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
              Incidents by Type
            </h3>
            <LegendDots
              items={[
                { label: "Fire", color: "#FF453A" },
                { label: "Medical", color: "#32D74B" },
                { label: "HazMat", color: "#9333EA" },
                { label: "Traffic", color: "#FF9F0A" },
              ]}
            />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyIncidents} barGap={2} barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1C1C1C"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
              />
              <Bar
                dataKey="fire"
                name="Fire"
                fill="#FF453A"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="medical"
                name="Medical"
                fill="#32D74B"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="hazmat"
                name="HazMat"
                fill="#9333EA"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="traffic"
                name="Traffic"
                fill="#FF9F0A"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Response Time - area + dashed target */}
        <motion.div
          variants={fadeUp}
          className="rounded-[20px] p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3
                className="text-foreground"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                Response Time (This Week)
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown
                  className="w-3.5 h-3.5"
                  style={{ color: "#32D74B" }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    color: "#32D74B",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  vs 4.5 min target
                </span>
              </div>
            </div>
            <LegendDots
              items={[
                { label: "Avg Time", color: "#2563EB" },
                { label: "Target", color: "#FF453A", dashed: true },
              ]}
            />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={responseTimeData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1C1C1C"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
                domain={[3, 6]}
                tickFormatter={(v) => `${v}m`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="avg"
                name="Avg Response"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#blueGrad)"
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="#FF453A"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                strokeOpacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Resolution Rate - stacked area */}
        <motion.div
          variants={fadeUp}
          className="rounded-[20px] p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
          }}
        >
          <div className="mb-6">
            <h3
              className="text-foreground"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
              Resolution Rate
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp
                className="w-3.5 h-3.5"
                style={{ color: "#32D74B" }}
                aria-hidden="true"
              />
              <span
                style={{ color: "#32D74B", fontSize: "12px", fontWeight: 500 }}
              >
                Resolved vs pending by month
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={resolutionData}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32D74B" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#32D74B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1C1C1C"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#32D74B"
                strokeWidth={2}
                fill="url(#greenGrad)"
              />
              <Area
                type="monotone"
                dataKey="pending"
                name="Pending"
                stroke="#FF9F0A"
                strokeWidth={1.5}
                fill="transparent"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Unit Utilization - animated progress bars */}
        <motion.div
          variants={fadeUp}
          className="rounded-[20px] p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3
              className="text-foreground"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
              Unit Utilization
            </h3>
            <span
              style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
            >
              Current month
            </span>
          </div>
          <div className="space-y-4">
            {unitUtilization.map(({ unit, utilization }, i) => {
              const color =
                utilization > 85
                  ? "#FF453A"
                  : utilization > 65
                    ? "#FF9F0A"
                    : utilization > 45
                      ? "#2563EB"
                      : "#32D74B";
              return (
                <div key={unit}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                      }}
                    >
                      {unit}
                    </span>
                    <span style={{ color, fontSize: "13px", fontWeight: 600 }}>
                      {utilization}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--secondary)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                        boxShadow: `0 0 8px ${color}40`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${utilization}%` }}
                      transition={{ ...springGentle, delay: 0.1 + i * 0.06 }}
                      role="progressbar"
                      aria-valuenow={utilization}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${unit} utilization`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Insights row ─────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        variants={staggerContainer}
      >
        {insightsData.map((insight) => {
          const { Icon, color } = INSIGHT_VISUAL[insight.severity];
          return (
            <motion.div
              key={insight.title}
              variants={fadeUp}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="p-5 rounded-[16px]"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  className="w-4 h-4"
                  style={{ color }}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span style={{ color, fontSize: "13px", fontWeight: 600 }}>
                  {insight.title}
                </span>
              </div>
              <p
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {insight.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
