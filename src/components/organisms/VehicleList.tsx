import { motion, AnimatePresence } from "framer-motion";
import { Bus } from "lucide-react";
import type { Vehicle } from "../../services/observability.api";
import { staggerFast, listItem } from "../../utils/animations";
import { EmptyState } from "../atoms/EmptyState";
import { TableSkeleton } from "../atoms/TableSkeleton";
import { VehicleRow, vehicleToRowProps } from "../molecules/VehicleRow";

interface VehicleListProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  cityName?: string;
}

export function VehicleList({ vehicles, isLoading, cityName = "City" }: VehicleListProps) {
  return (
    <section
      className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
      aria-label={`${cityName} Bus vehicles`}
      aria-busy={isLoading}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Bus className="w-4 h-4 text-blue-400" aria-hidden="true" />
          </div>
          <h2 className="text-white text-sm font-semibold">{`${cityName} Bus`}</h2>
        </div>
        {!isLoading && (
          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">
            {vehicles.length} vehicles
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[480px]">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles"
            description={`No active ${cityName} vehicles found.`}
          />
        ) : (
          <motion.ul
            variants={staggerFast}
            initial="hidden"
            animate="visible"
            aria-label="Vehicle list"
          >
            <AnimatePresence mode="popLayout">
              {vehicles.map((v) => (
                <motion.li key={v.id} variants={listItem} initial="hidden" animate="visible" exit="exit">
                  <VehicleRow {...vehicleToRowProps(v)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
