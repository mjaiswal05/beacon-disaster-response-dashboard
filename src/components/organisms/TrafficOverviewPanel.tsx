import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { TrafficFlow } from "../../services/observability.api";
import { staggerFast, listItem } from "../../utils/animations";
import { EmptyState } from "../atoms/EmptyState";
import { TableSkeleton } from "../atoms/TableSkeleton";
import { TrafficFlowIndicator } from "../atoms/TrafficFlowIndicator";

interface TrafficOverviewPanelProps {
  traffic: TrafficFlow[];
  isLoading: boolean;
  cityName?: string;
}

export function TrafficOverviewPanel({ traffic, isLoading, cityName = "this area" }: TrafficOverviewPanelProps) {
  return (
    <section
      className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
      aria-label="Traffic overview"
      aria-busy={isLoading}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-400" aria-hidden="true" />
          </div>
          <h2 className="text-white text-sm font-semibold">Traffic Flows</h2>
        </div>
        {!isLoading && (
          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">
            {traffic.length} segments
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : traffic.length === 0 ? (
          <EmptyState
            title="No traffic data"
            description={`No traffic flow data available for ${cityName}.`}
          />
        ) : (
          <motion.ul
            variants={staggerFast}
            initial="hidden"
            animate="visible"
            aria-label="Traffic flow list"
          >
            <AnimatePresence mode="popLayout">
              {traffic.map((flow) => (
                <motion.li
                  key={flow.id}
                  variants={listItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {flow.road_segment_id}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Density: {Math.round(flow.density)} · Flow: {Math.round(flow.flow_rate)}/min
                    </p>
                  </div>
                  <TrafficFlowIndicator
                    speed={flow.speed}
                    status={flow.status}
                    className="shrink-0 ml-3"
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
