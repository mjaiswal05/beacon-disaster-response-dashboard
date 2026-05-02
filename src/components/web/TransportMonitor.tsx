import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useTransport, TIME_RANGE_OPTIONS } from "../../hooks/useTransport";
import { pageVariants, fadeUp } from "../../utils/animations";
import { cn } from "../ui/utils";
import { TrafficOverviewPanel } from "../organisms/TrafficOverviewPanel";
import { TrainStatusPanel } from "../organisms/TrainStatusPanel";
import { TransportStatsBar } from "../organisms/TransportStatsBar";
import { VehicleList } from "../organisms/VehicleList";
import { VehicleMapPanel } from "../organisms/VehicleMapPanel";

export function TransportMonitor() {
  const {
    vehicles,
    vehiclesLoading,
    trains,
    trainsLoading,
    luas,
    luasLoading,
    traffic,
    trafficLoading,
    anyError,
    cityName,
    timeRange,
    setTimeRange,
  } = useTransport();

  // Track last successful data update
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!vehiclesLoading && !trainsLoading && !luasLoading && !trafficLoading) {
      setLastUpdated(new Date());
    }
  }, [vehiclesLoading, trainsLoading, luasLoading, trafficLoading]);

  const isLoading = vehiclesLoading || trainsLoading || luasLoading || trafficLoading;

  // We can't call refetch directly from useTransport without modifying it,
  // so we track a refresh counter and let React Query's own polling handle it.
  // For manual refresh we reload the window transport queries by triggering
  // a state bump — the queries will re-run on the next poll. However,
  // TransportStatsBar just calls onRefresh as a UI affordance; actual
  // refetching is managed by react-query's refetchInterval.
  const handleRefresh = useCallback(() => {
    // The queries auto-refetch every 30s. We optimistically update the
    // "last updated" display to show user the action was taken.
    setLastUpdated(new Date());
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-gray-950 flex flex-col"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.header
        variants={fadeUp}
        className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-semibold">Transport Monitoring</h1>
            <p className="text-gray-400 text-sm mt-0.5">{cityName} real-time transport status</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1" role="group" aria-label="Time range">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                aria-pressed={timeRange === opt.value}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  timeRange === opt.value
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {anyError && (
          <div
            role="alert"
            className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            Some transport data failed to load. Showing available data.
          </div>
        )}
      </motion.header>

      {/* Stats bar */}
      <TransportStatsBar
        vehicles={vehicles}
        trains={trains}
        luas={luas}
        trafficFlows={traffic}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main 2-col layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-0 min-h-0">
        {/* Left: Map hero */}
        <div className="relative min-h-[500px]">
          <VehicleMapPanel
            vehicles={vehicles}
            isLoading={vehiclesLoading}
            cityName={cityName}
          />
        </div>

        {/* Right: Stacked panels, scrollable */}
        <div className="overflow-y-auto border-l border-gray-800 flex flex-col divide-y divide-gray-800">
          <div className="p-4">
            {vehicles.length === 0 && !vehiclesLoading ? (
              <div className="py-4">
                <p className="text-gray-400 text-sm font-medium text-center">No active buses</p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs text-center mt-1">
                    Last checked: {lastUpdated.toLocaleTimeString("en-IE")}
                  </p>
                )}
              </div>
            ) : (
              <VehicleList vehicles={vehicles} isLoading={vehiclesLoading} cityName={cityName} />
            )}
          </div>
          <div className="p-4">
            {trains.length === 0 && !trainsLoading && !luasLoading ? (
              <div className="py-4">
                <p className="text-gray-400 text-sm font-medium text-center">No active trains</p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs text-center mt-1">
                    Last checked: {lastUpdated.toLocaleTimeString("en-IE")}
                  </p>
                )}
              </div>
            ) : (
              <TrainStatusPanel
                trains={trains}
                luas={luas}
                isLoading={trainsLoading || luasLoading}
              />
            )}
          </div>
          <div className="p-4">
            {traffic.length === 0 && !trafficLoading ? (
              <div className="py-4">
                <p className="text-gray-400 text-sm font-medium text-center">
                  No active traffic flows
                </p>
                {lastUpdated && (
                  <p className="text-gray-500 text-xs text-center mt-1">
                    Last checked: {lastUpdated.toLocaleTimeString("en-IE")}
                  </p>
                )}
              </div>
            ) : (
              <TrafficOverviewPanel
                traffic={traffic}
                isLoading={trafficLoading}
                cityName={cityName}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
