import { motion } from "framer-motion";
import {
  AlertTriangle,
  Ambulance,
  ChevronRight,
  Loader2,
  RefreshCw,
  Shield,
  Truck,
} from "lucide-react";
import type { Dispatch } from "../../types/core.types";
import { fadeUp, staggerContainer } from "../../utils/animations";

interface DispatchOverviewProps {
  dispatches: Dispatch[];
  isLoading: boolean;
  error: string | null;
  onNavigate: (screen: string, incidentId: string) => void;
  onRefresh: () => void;
}

function getRoleIcon(role: string) {
  const map: Record<string, typeof Truck> = {
    firefighters: Truck,
    medics: Ambulance,
    police: Shield,
  };
  return map[role] ?? Truck;
}

function getRoleColor(role: string) {
  const map: Record<string, string> = {
    firefighters: "#FF9F0A",
    medics: "#FF453A",
    police: "#2563EB",
  };
  return map[role] ?? "var(--muted-foreground)";
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending_acceptance: { bg: "rgba(255,214,10,0.15)", text: "#FFD60A" },
  in_progress: { bg: "rgba(37,99,235,0.15)", text: "#2563EB" },
  completed: { bg: "rgba(50,215,75,0.15)", text: "#32D74B" },
  failed: { bg: "rgba(255,69,58,0.15)", text: "#FF453A" },
  cancelled: { bg: "rgba(138,143,152,0.15)", text: "#8A8F98" },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DispatchOverview({
  dispatches,
  isLoading,
  error,
  onNavigate,
  onRefresh,
}: DispatchOverviewProps) {
  const activeDispatches = dispatches.filter(
    (d) => d.status === "pending_acceptance" || d.status === "in_progress",
  );

  return (
    <motion.div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--secondary)",
      }}
      variants={fadeUp}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--secondary)" }}
      >
        <div className="flex items-center gap-2">
          <Truck
            className="w-4 h-4"
            style={{ color: "#FF9F0A" }}
            aria-hidden="true"
          />
          <h3 className="text-foreground text-sm font-semibold">
            Active Dispatches
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {activeDispatches.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,159,10,0.15)", color: "#FF9F0A" }}
            >
              {activeDispatches.length}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Refresh dispatches"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              style={{ color: "var(--muted-foreground)" }}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-h-52" aria-busy={isLoading}>
        {isLoading && dispatches.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "var(--muted-foreground)" }}
            />
          </div>
        ) : error ? (
          <div
            className="m-3 p-3 rounded-xl"
            style={{ background: "rgba(255,159,10,0.1)" }}
          >
            <div
              className="flex items-center gap-2"
              style={{ color: "#FF9F0A", fontSize: "12px" }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
              />
              <span role="alert">{error}</span>
            </div>
          </div>
        ) : activeDispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Truck
              className="w-7 h-7 mb-2"
              style={{ color: "var(--border)" }}
              aria-hidden="true"
            />
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
              No active dispatches
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {activeDispatches.slice(0, 8).map((d) => {
              const RoleIcon = getRoleIcon(d.role);
              const roleColor = getRoleColor(d.role);
              const statusStyle =
                STATUS_STYLES[d.status] ?? STATUS_STYLES.pending_acceptance;

              return (
                <motion.button
                  key={d.id}
                  onClick={() => onNavigate("incident", d.incident_id)}
                  className="w-full text-left px-4 py-2.5 transition-colors group flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(28,28,28,0.8)" }}
                  variants={fadeUp}
                  onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--secondary)")
                  }
                  onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${roleColor}20` }}
                  >
                    <RoleIcon
                      className="w-3.5 h-3.5"
                      style={{ color: roleColor }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground text-xs font-semibold truncate block">
                      {d.station_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          fontSize: "10px",
                        }}
                      >
                        {formatStatus(d.status)}
                      </span>
                      <span
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "10px",
                        }}
                      >
                        {d.accepted_count}/{d.required_count} accepted
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-hidden="true"
                  />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
