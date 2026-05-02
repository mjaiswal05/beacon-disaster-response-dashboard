import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { cn } from "../ui/utils";
import { modalVariants } from "../../utils/animations";
import type { Incident } from "../../types/core.types";

interface IncidentAlertModalProps {
  queue: Incident[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_SECONDS = 60;

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const fmt = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  return <span>{fmt} ago</span>;
}

function CountdownBar({ seconds, total }: { seconds: number; total: number }) {
  return (
    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{
          width: `${(seconds / total) * 100}%`,
          background: seconds > total * 0.4 ? "#32D74B" : "#FF9F0A",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function AlertCard({ incident, onDismiss }: { incident: Incident; onDismiss: () => void }) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const isP0 = incident.severity === "P0";

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) { onDismiss(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDismiss]);

  const handleOpen = useCallback(() => {
    navigate(`/incidents/${incident.id}`);
    onDismiss();
  }, [navigate, incident.id, onDismiss]);

  return (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "w-[520px] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden",
        "border-2",
        isP0 ? "border-red-500 animate-pulse-border" : "border-orange-500",
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`alert-title-${incident.id}`}
      style={{
        boxShadow: isP0
          ? "0 0 40px rgba(239,68,68,0.25), 0 20px 60px rgba(0,0,0,0.5)"
          : "0 0 40px rgba(249,115,22,0.20), 0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3",
          isP0 ? "bg-red-900/40" : "bg-orange-900/30",
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn("w-5 h-5", isP0 ? "text-red-400" : "text-orange-400")}
            aria-hidden="true"
          />
          <span
            id={`alert-title-${incident.id}`}
            className={cn(
              "font-bold text-sm tracking-wide uppercase",
              isP0 ? "text-red-300" : "text-orange-300",
            )}
          >
            {isP0 ? "Critical Incident" : "High Priority Incident"}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Type + severity + status + elapsed */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white font-bold text-lg uppercase tracking-wide">
            {incident.type}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold",
              isP0
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : "bg-orange-500/20 text-orange-300 border border-orange-500/40",
            )}
          >
            {incident.severity}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 capitalize">
            {incident.status}
          </span>
          <span className="text-gray-400 text-xs ml-auto">
            <ElapsedTimer createdAt={incident.created_at} />
          </span>
        </div>

        {/* Location */}
        {incident.location?.address && (
          <div className="flex items-start gap-2 text-sm text-gray-300">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{incident.location.address}</span>
          </div>
        )}

        {/* Description */}
        {incident.description && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
            {incident.description}
          </p>
        )}

        {/* Auto-dismiss countdown bar */}
        <div className="space-y-1">
          <p className="text-gray-600 text-[11px]">
            Auto-dismissing in {countdown}s
          </p>
          <CountdownBar seconds={countdown} total={AUTO_DISMISS_SECONDS} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <button
          onClick={handleOpen}
          className={cn(
            "flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-colors",
            isP0
              ? "bg-red-600 hover:bg-red-500"
              : "bg-orange-600 hover:bg-orange-500",
          )}
        >
          Open Incident →
        </button>
        <button
          onClick={onDismiss}
          className="px-4 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

export function IncidentAlertModal({ queue, onDismiss }: IncidentAlertModalProps) {
  const current = queue[0];

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
      aria-live="assertive"
      aria-atomic="true"
    >
      <AnimatePresence mode="wait">
        {current && (
          <div key={current.id}>
            {/* Queue badge when multiple alerts */}
            {queue.length > 1 && (
              <div className="flex justify-end mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs font-medium">
                  {queue.length} alerts queued
                </span>
              </div>
            )}
            <AlertCard
              incident={current}
              onDismiss={() => onDismiss(current.id)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
