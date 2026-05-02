import { Train, Zap } from "lucide-react";
import { useState } from "react";
import type { LuasForecast, Train as TrainType } from "../../services/observability.api";
import { EmptyState } from "../atoms/EmptyState";
import { TableSkeleton } from "../atoms/TableSkeleton";
import { LuasForecastRow, luasToRowProps } from "../molecules/LuasForecastRow";
import { TrainCard, trainToCardProps } from "../molecules/TrainCard";
import { cn } from "../ui/utils";

interface TrainStatusPanelProps {
  trains: TrainType[];
  luas: LuasForecast[];
  isLoading: boolean;
}

type Tab = "rail" | "luas";

export function TrainStatusPanel({ trains, luas, isLoading }: TrainStatusPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("rail");

  return (
    <section
      className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
      aria-label="Rail transport"
      aria-busy={isLoading}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Train className="w-4 h-4 text-purple-400" aria-hidden="true" />
          </div>
          <h2 className="text-white text-sm font-semibold">Rail Services</h2>
        </div>
        {!isLoading && (
          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-xs">
            {activeTab === "rail" ? trains.length : luas.length} entries
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "rail"}
          onClick={() => setActiveTab("rail")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
            activeTab === "rail"
              ? "text-purple-400 border-purple-500"
              : "text-gray-400 border-transparent hover:text-gray-300",
          )}
        >
          <Train className="w-3.5 h-3.5" aria-hidden="true" />
          Irish Rail
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "luas"}
          onClick={() => setActiveTab("luas")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
            activeTab === "luas"
              ? "text-green-400 border-green-500"
              : "text-gray-400 border-transparent hover:text-gray-300",
          )}
        >
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          Luas
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : activeTab === "rail" ? (
          trains.length === 0 ? (
            <EmptyState title="No trains" description="No active Irish Rail services found." />
          ) : (
            <ul aria-label="Train list">
              {trains.map((t) => (
                <li key={t.id}>
                  <TrainCard {...trainToCardProps(t)} />
                </li>
              ))}
            </ul>
          )
        ) : luas.length === 0 ? (
          <EmptyState title="No Luas forecasts" description="No Luas forecasts available." />
        ) : (
          <ul aria-label="Luas forecast list">
            {luas.map((f) => (
              <li key={f.id}>
                <LuasForecastRow {...luasToRowProps(f)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
