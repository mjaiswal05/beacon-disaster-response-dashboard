import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ambulance,
  Construction,
  Flame,
  Hospital,
  Layers,
  Shield,
  Waves,
  X,
  Zap,
} from "lucide-react";
import type { LayerName } from "../../hooks/useObservability";
import { cn } from "../ui/utils";

interface MapLayerPanelProps {
  enabledLayers: Set<LayerName>;
  layerCounts: Record<LayerName, number>;
  onToggle: (layer: LayerName) => void;
  isLoading?: boolean;
}

interface LayerDef {
  key: LayerName;
  label: string;
  icon: typeof Hospital;
  color: string;
}

const EMERGENCY_LAYERS: LayerDef[] = [
  { key: "hospitals", label: "Hospitals", icon: Hospital, color: "#32D74B" },
  { key: "fireStations", label: "Fire Stations", icon: Flame, color: "#FF9F0A" },
  { key: "policeStations", label: "Police", icon: Shield, color: "#2563EB" },
  { key: "ambulances", label: "Ambulances", icon: Ambulance, color: "#FF453A" },
];

const INFRA_LAYERS: LayerDef[] = [
  { key: "trafficIncidents", label: "Traffic", icon: Construction, color: "#FFD60A" },
  { key: "powerOutages", label: "Power", icon: Zap, color: "#9333EA" },
  { key: "waterSensors", label: "Water", icon: Waves, color: "#64D2FF" },
];

function LayerRow({
  layer,
  isActive,
  count,
  onToggle,
}: {
  layer: LayerDef;
  isActive: boolean;
  count: number;
  onToggle: () => void;
}) {
  const Icon = layer.icon;
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-colors text-left",
        isActive
          ? "bg-white/5"
          : "hover:bg-white/5"
      )}
      aria-pressed={isActive}
      aria-label={`Toggle ${layer.label} layer`}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: isActive ? `${layer.color}22` : "rgba(255,255,255,0.05)",
          border: `1px solid ${isActive ? layer.color : "transparent"}`,
        }}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{ color: isActive ? layer.color : "#6b7280" }}
          aria-hidden="true"
        />
      </div>
      <span
        className="text-xs font-medium flex-1"
        style={{ color: isActive ? "#f3f4f6" : "#9ca3af" }}
      >
        {layer.label}
      </span>
      {isActive && count > 0 && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: `${layer.color}22`,
            color: layer.color,
          }}
        >
          {count}
        </span>
      )}
      {/* Toggle dot */}
      <div
        className="w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors"
        style={{
          borderColor: isActive ? layer.color : "#4b5563",
          background: isActive ? layer.color : "transparent",
        }}
        aria-hidden="true"
      />
    </button>
  );
}

export function MapLayerPanel({
  enabledLayers,
  layerCounts,
  onToggle,
  isLoading,
}: MapLayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = enabledLayers.size;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div ref={panelRef} className="relative">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="trigger"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 h-8 px-3 rounded-[10px] transition-colors"
            style={{
              background: "rgba(20, 20, 20, 0.85)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
              opacity: isLoading ? 0.6 : 1,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            aria-label="Open map layers panel"
          >
            <Layers className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            <span className="text-xs font-medium text-gray-300">Layers</span>
            {activeCount > 0 && (
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {activeCount}
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            className="w-56 rounded-xl overflow-hidden"
            style={{
              background: "rgba(20, 20, 20, 0.92)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-200">
                  Map Layers
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                aria-label="Close layers panel"
              >
                <X className="w-3 h-3 text-gray-500" aria-hidden="true" />
              </button>
            </div>

            {/* Emergency Services */}
            <div className="px-2 pt-2 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-1">
                Emergency Services
              </span>
              <div className="mt-1 space-y-0.5">
                {EMERGENCY_LAYERS.map((layer) => (
                  <LayerRow
                    key={layer.key}
                    layer={layer}
                    isActive={enabledLayers.has(layer.key)}
                    count={layerCounts[layer.key] ?? 0}
                    onToggle={() => onToggle(layer.key)}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-white/5" />

            {/* Infrastructure */}
            <div className="px-2 pt-2 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-1">
                Infrastructure
              </span>
              <div className="mt-1 space-y-0.5">
                {INFRA_LAYERS.map((layer) => (
                  <LayerRow
                    key={layer.key}
                    layer={layer}
                    isActive={enabledLayers.has(layer.key)}
                    count={layerCounts[layer.key] ?? 0}
                    onToggle={() => onToggle(layer.key)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
