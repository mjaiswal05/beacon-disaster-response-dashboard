import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRightFromLine,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import type { Evacuation } from "../../types/core.types";
import { fadeUp, staggerContainer } from "../../utils/animations";

interface EvacuationOverviewProps {
  evacuations: Evacuation[];
  isLoading: boolean;
  error: string | null;
  onNavigate: (screen: string, incidentId: string) => void;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  planned: { bg: "rgba(100,210,255,0.15)", text: "#64D2FF", label: "Planned" },
  active: { bg: "rgba(255,159,10,0.15)", text: "#FF9F0A", label: "Active" },
  completed: {
    bg: "rgba(50,215,75,0.15)",
    text: "#32D74B",
    label: "Completed",
  },
  cancelled: {
    bg: "rgba(138,143,152,0.15)",
    text: "#8A8F98",
    label: "Cancelled",
  },
};

export function EvacuationOverview({
  evacuations,
  isLoading,
  error,
  onNavigate,
}: EvacuationOverviewProps) {
  const activeEvacs = evacuations.filter(
    (e) => e.status === "planned" || e.status === "active",
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
          <ArrowRightFromLine
            className="w-4 h-4"
            style={{ color: "#64D2FF" }}
            aria-hidden="true"
          />
          <h3 className="text-foreground text-sm font-semibold">Evacuations</h3>
        </div>
        {activeEvacs.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(100,210,255,0.15)", color: "#64D2FF" }}
          >
            {activeEvacs.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-h-52" aria-busy={isLoading}>
        {isLoading && evacuations.length === 0 ? (
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
        ) : activeEvacs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin
              className="w-7 h-7 mb-2"
              style={{ color: "var(--border)" }}
              aria-hidden="true"
            />
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
              No active evacuations
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {activeEvacs.slice(0, 8).map((evac) => {
              const statusStyle =
                STATUS_STYLES[evac.status] ?? STATUS_STYLES.planned;
              const percentage = evac.notification_sent ? 100 : 0;

              return (
                <motion.button
                  key={evac.id}
                  onClick={() => onNavigate("incident", evac.incident_id)}
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
                    style={{ background: `${statusStyle.text}20` }}
                  >
                    <Users
                      className="w-3.5 h-3.5"
                      style={{ color: statusStyle.text }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground text-xs font-semibold truncate block">
                      {evac.zone_name}
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
                        {statusStyle.label}
                      </span>
                      {evac.notification_sent && (
                        <span
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: "10px",
                          }}
                        >
                          Advisory sent
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div
                      className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--secondary)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          background: statusStyle.text,
                        }}
                      />
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
