import { StatCard } from "../atoms/StatCard";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import type { Incident } from "../../types/core.types";

interface DashboardStatsGridProps {
  incidents: Incident[];
  isLoading?: boolean;
}

export function DashboardStatsGrid({
  incidents,
  isLoading,
}: DashboardStatsGridProps) {
  const total = incidents.length;
  const critical = incidents.filter(
    (i) => i.severity === "P0" || i.severity === "critical",
  ).length;
  const active = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  ).length;
  const resolved = incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Incidents"
        value={total}
        icon={AlertTriangle}
        iconColor="text-blue-400"
        iconBg="bg-blue-500/20"
        iconRing="ring-1 ring-blue-500/30"
        isLoading={isLoading}
      />
      <StatCard
        label="Critical"
        value={critical}
        icon={TrendingUp}
        iconColor="text-red-400"
        iconBg="bg-red-500/20"
        iconRing="ring-1 ring-red-500/30"
        isLoading={isLoading}
      />
      <StatCard
        label="Active"
        value={active}
        icon={Clock}
        iconColor="text-amber-400"
        iconBg="bg-amber-500/20"
        iconRing="ring-1 ring-amber-500/30"
        isLoading={isLoading}
      />
      <StatCard
        label="Resolved"
        value={resolved}
        icon={CheckCircle}
        iconColor="text-green-400"
        iconBg="bg-green-500/20"
        iconRing="ring-1 ring-green-500/30"
        isLoading={isLoading}
      />
    </div>
  );
}
