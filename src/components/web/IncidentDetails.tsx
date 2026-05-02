import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Loader,
  Loader2,
  Map,
  MapPin,
  MessageSquare,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateIncidentChannel } from "../../hooks/useChannels";
import {
  getIncidentById,
  listDispatchesByIncident,
  listEvacuationsByIncident,
  recordIncidentUpdate
} from "../../services/core.api";
import type { Dispatch, Evacuation, NearestStation, StationRole } from "../../types/core.types";
import {
  fadeUp,
  staggerContainer
} from "../../utils/animations";
import { DispatchCard } from "../molecules/DispatchCard";
import { IncidentActionsPanel } from "../organisms/IncidentActionsPanel";
import { IncidentAdvisoryPanel } from "../organisms/IncidentAdvisoryPanel";
import { IncidentAttachments } from "../organisms/IncidentAttachments";
import { IncidentTimeline } from "../organisms/IncidentTimeline";
import { MapWrapper } from "../organisms/MapWrapper";
import { cn } from "../ui/utils";

interface StationWithRole extends NearestStation {
  role: StationRole;
}

interface IncidentDetailsProps {
  incidentId: string | null;
  onNavigate: (screen: string) => void;
  onBack: () => void;
}

interface IncidentData {
  id: string;
  type: string;
  severity: string;
  location: string;
  time: string;
  timestamp: string;
  createdAt: string;
  assignedUnits: string[];
  status: string;
  description: string;
  affectedCitizens: number;
  evacuationRequired: boolean;
  responseTeam: string;
  title: string;
  reportedBy: string;
  verifiedBy?: string;
  affectedRadius: number;
  latitude?: number;
  longitude?: number;
  approved?: boolean;
}

import {
  SEVERITY_HEX as SEV_HEX,
  SEVERITY_PCODE as SEV_PCODE,
  getIncidentIcon,
} from "../../constants/constants";

// Interactive map component for showing incident location - logic preserved exactly
function InteractiveIncidentMap({
  lat,
  lng,
  location,
  title,
  severity,
  affectedRadius,
  stations,
}: {
  lat: number;
  lng: number;
  location: string;
  title: string;
  severity: string;
  affectedRadius: number;
  stations?: StationWithRole[];
}) {
  const [mounted, setMounted] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sevHex = SEV_HEX[severity] || "#FFD60A";

  if (!mounted || mapError) {
    return (
      <div
        className="relative w-full h-full min-h-[240px] rounded-2xl overflow-hidden"
        style={{ background: "var(--secondary)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full">
            <pattern
              id="grid-incident"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="white"
                strokeWidth="0.3"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid-incident)" />
          </svg>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: sevHex }}
          >
            <div className="w-2.5 h-2.5 bg-white rounded-full" />
          </div>
        </div>

        <div
          className="absolute top-3 left-3 right-3 backdrop-blur-sm p-3 rounded-xl text-white text-xs"
          style={{
            background: "rgba(10,10,10,0.9)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="font-semibold truncate">{title}</div>
          <div
            className="flex items-center gap-1 mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <MapPin className="w-3 h-3" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-mono"
          style={{
            background: "rgba(10,10,10,0.9)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          {lat.toFixed(6)}, {lng.toFixed(6)} · Radius: {affectedRadius}m
        </div>

        {!mapError && (
          <div
            className="absolute inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{ background: "rgba(10,10,10,0.7)" }}
          >
            <div className="text-center">
              <Loader
                className="w-8 h-8 animate-spin mx-auto mb-2"
                style={{ color: "#2563EB" }}
              />
              <p className="text-sm text-white">Loading map…</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const IncidentMapComponent = () => {
    try {
      const mapIncident = {
        id: "current-incident",
        type: title,
        severity,
        location,
        time: "Now",
        units: 0,
        status: "Active",
        lat,
        lng,
        icon: AlertTriangle,
        color:
          severity === "Critical"
            ? "red"
            : severity === "High"
              ? "orange"
              : "yellow",
      };

      return (
        <div className="relative w-full h-full min-h-[240px] rounded-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <MapWrapper incidents={[mapIncident]} onIncidentClick={() => { }} stations={stations} />
          </div>

          <div
            className="absolute top-3 left-3 right-3 backdrop-blur-md p-3 rounded-xl text-white text-xs z-[1000]"
            style={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="font-semibold truncate mb-1">{title}</div>
            <div
              className="flex items-center gap-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <MapPin className="w-3 h-3" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          <div
            className="absolute bottom-3 right-3 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs z-[1000] font-mono"
            style={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          <div
            className="absolute bottom-3 left-3 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs z-[1000]"
            style={{
              background: "rgba(10,10,10,0.92)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: sevHex }}
              />
              <span className="text-white font-medium">Active Incident</span>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error loading MapWrapper:", error);
      setMapError(true);
      return null;
    }
  };

  return <IncidentMapComponent />;
}

function LiveElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  const createdAtMs = new Date(createdAt).getTime();

  useEffect(() => {
    if (!createdAt || Number.isNaN(createdAtMs)) {
      setElapsed(0);
      return;
    }

    const update = () => {
      setElapsed(Math.floor((Date.now() - createdAtMs) / 1000));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt, createdAtMs]);

  if (!createdAt || Number.isNaN(createdAtMs)) return <span>Unknown</span>;
  const m = Math.floor(elapsed / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return <span>{h}h {m % 60}m ago</span>;
  if (m > 0) return <span>{m}m {elapsed % 60}s ago</span>;
  return <span>{elapsed}s ago</span>;
}

export function IncidentDetails({
  incidentId,
  onNavigate,
  onBack,
}: IncidentDetailsProps) {
  const navigate = useNavigate();
  const { mutate: createChannel, isPending: isCreatingChannel } = useCreateIncidentChannel();
  const [incident, setIncident] = useState<IncidentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecordingUpdate, setIsRecordingUpdate] = useState(false);
  const [recordStatus, setRecordStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    updateMessage: "",
    imageUrl: "",
    shouldAlert: false,
  });

  // Nearest stations
  const [nearestStations] = useState<StationWithRole[]>([]);

  // Dispatches for this incident
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);

  // Evacuations for this incident (used to guard close action)
  const [evacuations, setEvacuations] = useState<Evacuation[]>([]);

  // True while async geocoding is in progress (coords were 0/missing)
  const [isGeocodingInProgress, setIsGeocodingInProgress] = useState(false);

  const getSeverityLabel = (severity: string) => {
    const severityMap: Record<string, string> = {
      P0: "Catastrophic",
      P1: "Critical",
      P2: "Serious",
      P3: "High",
      P4: "Medium",
      P5: "Low",
      P6: "Advisory",
    };
    return severityMap[severity] || "Medium";
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const normalizeIncidentType = (type: string) => {
    const typeMap: Record<string, string> = {
      snow: "Snow Storm",
      string: "Emergency Alert",
      "Gas Leak": "Gas Leak",
      Fire: "Building Fire",
      Flood: "Flash Flood",
    };
    return typeMap[type] || capitalizeFirst(type);
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "Unknown time";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Unknown time";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "Unknown time";
    try {
      const now = new Date();
      const incidentTime = new Date(timestamp);
      const diffInMinutes = Math.floor(
        (now.getTime() - incidentTime.getTime()) / (1000 * 60),
      );
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24)
        return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    } catch {
      return "Unknown time";
    }
  };

  const fetchIncidentDetails = async () => {
    if (!incidentId) {
      setIncident(null);
      setError("Incident reference is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsGeocodingInProgress(false);
    try {
      const apiIncident = await getIncidentById(incidentId);
      const severity = getSeverityLabel(apiIncident.severity);
      const type = normalizeIncidentType(apiIncident.type);
      const location = apiIncident.location?.address || "Unknown Location";

      const latitude = apiIncident.location?.latitude || 0;
      const longitude = apiIncident.location?.longitude || 0;

      const transformed: IncidentData = {
        id: apiIncident.id,
        type,
        severity,
        location,
        time: formatTimeAgo(apiIncident.created_at),
        timestamp: formatTimestamp(apiIncident.created_at),
        createdAt: apiIncident.created_at || "",
        assignedUnits: [],
        status: capitalizeFirst(apiIncident.status) || "Reported",
        description: apiIncident.description || "No description available",
        // TODO: Backend should provide affected_citizens count on Incident
        affectedCitizens: 0,
        evacuationRequired: ["Critical", "High"].includes(severity),
        responseTeam: "Dispatched Units",
        title: apiIncident.title,
        reportedBy: apiIncident.reported_by || "System",
        verifiedBy: apiIncident.verified_by,
        affectedRadius: apiIncident.affected_radius || 50,
        latitude,
        longitude,
        approved: apiIncident.approved ?? false,
      };

      // Set incident state immediately — don't wait for geocoding
      setIncident(transformed);

      // Fetch dispatches and evacuations immediately (independent of coords)
      setDispatchesLoading(true);
      listDispatchesByIncident(apiIncident.id)
        .then(setDispatches)
        .catch(() => setDispatches([]))
        .finally(() => setDispatchesLoading(false));
      listEvacuationsByIncident(apiIncident.id)
        .then(setEvacuations)
        .catch(() => setEvacuations([]));
    } catch (err: any) {
      console.error("Failed to fetch incident details:", err);
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordUpdate = async () => {
    if (!incidentId) return;
    const updateMessage = recordForm.updateMessage.trim();
    if (!updateMessage) {
      setRecordError("Add a short status update before saving.");
      setRecordStatus("error");
      return;
    }

    setIsRecordingUpdate(true);
    setRecordStatus("idle");
    setRecordError(null);

    try {
      await recordIncidentUpdate(incidentId, {
        update_message: updateMessage,
        image_url: recordForm.imageUrl.trim() || undefined,
        should_alert: recordForm.shouldAlert,
      });

      setRecordStatus("success");
      setRecordForm({ updateMessage: "", imageUrl: "", shouldAlert: false });
      setTimeout(() => setRecordStatus("idle"), 3000);
    } catch {
      setRecordStatus("error");
      setRecordError("Failed to save update. Check your connection and try again.");
      setTimeout(() => setRecordStatus("idle"), 3000);
    } finally {
      setIsRecordingUpdate(false);
    }
  };


  useEffect(() => {
    fetchIncidentDetails();
  }, [incidentId]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader
            className="w-8 h-8 animate-spin mx-auto mb-4"
            style={{ color: "#2563EB" }}
          />
          <p style={{ color: "var(--muted-foreground)" }}>
            Loading incident details…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--foreground)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--muted-foreground)")
          }
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Incidents
        </button>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "#FF453A" }}
              aria-hidden="true"
            />
            <h3 className="text-white text-xl font-semibold mb-2">
              Error Loading Incident
            </h3>
            <p className="mb-6" style={{ color: "var(--muted-foreground)" }}>
              {error}
            </p>
            <button
              onClick={fetchIncidentDetails}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: "#2563EB" }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found state ────────────────────────────────────────────────────────
  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--border)" }}
            aria-hidden="true"
          />
          <p style={{ color: "var(--muted-foreground)" }}>Incident not found</p>
        </div>
      </div>
    );
  }

  const sevHex = SEV_HEX[incident.severity] || "#FFD60A";
  const sevPcode = SEV_PCODE[incident.severity] || "P2";
  const TypeIcon = getIncidentIcon(incident.type);

  // Active dispatch/evacuation flags — used to block closure and guard action buttons
  const hasActiveDispatches = dispatches.some(
    (d) => d.status === "pending_acceptance" || d.status === "in_progress",
  );
  const hasActiveEvacuations = evacuations.some(
    (e) => e.status === "planned" || e.status === "active",
  );

  const canRecordUpdate = recordForm.updateMessage.trim().length > 0;
  const recordStatusLabel = isRecordingUpdate
    ? "Saving…"
    : recordStatus === "success"
      ? "Saved"
      : recordStatus === "error"
        ? "Failed"
        : "Ready";
  const recordStatusStyle = isRecordingUpdate
    ? "bg-blue-500/10 text-blue-400"
    : recordStatus === "success"
      ? "bg-green-500/10 text-green-400"
      : recordStatus === "error"
        ? "bg-red-500/10 text-red-400"
        : "bg-gray-500/10 text-gray-400";

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      <div className="border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm w-full flex-shrink-0">
        <div className="px-4 md:px-6 py-2.5 flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-medium transition-colors flex-shrink-0"
            aria-label="Back to incidents"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back
          </button>
          <span className="w-px h-4 bg-gray-700 flex-shrink-0 mx-1" aria-hidden="true" />
          <span className="text-white font-semibold text-sm truncate min-w-0">
            {incident.title || incident.type}
          </span>
          <span
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: `${sevHex}20`,
              color: sevHex,
              border: `1px solid ${sevHex}40`,
            }}
          >
            {sevPcode}
          </span>
          <span
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: "var(--secondary)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {incident.status}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => incident.approved && onNavigate("dispatch")}
            disabled={!incident.approved}
            aria-label="Dispatch emergency units"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-500/40"
          >
            <Truck className="w-3.5 h-3.5" aria-hidden="true" />
            Dispatch
          </button>
          <button
            onClick={() => incident.approved && onNavigate("evacuation")}
            disabled={!incident.approved}
            aria-label="Open evacuation planning"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/40"
          >
            <Map className="w-3.5 h-3.5" aria-hidden="true" />
            Evacuation
          </button>
          <button
            onClick={() =>
              createChannel(
                { incidentId: incident.id, incidentTitle: incident.title || incident.type },
                { onSuccess: () => navigate(`/communication?channel=${incident.id}`) },
              )
            }
            disabled={isCreatingChannel}
            aria-label="Open communication channel for this incident"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-600/30"
          >
            {isCreatingChannel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isCreatingChannel ? "Opening..." : "Open Channel"}
          </button>
          <span className="text-gray-400 text-xs flex-shrink-0 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            <LiveElapsedTimer createdAt={incident.createdAt} />
          </span>
        </div>
        <div className="px-4 md:px-6 pb-2.5 -mt-0.5">
          <IncidentActionsPanel
            incidentId={incident.id}
            incidentStatus={incident.status}
            hasActiveDispatches={hasActiveDispatches}
            hasActiveEvacuations={hasActiveEvacuations}
            isApproved={incident.approved ?? false}
          />
        </div>
      </div>

      <motion.div
        className="flex-1 min-h-0 px-4 md:px-6 py-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <div className="h-full overflow-y-auto pr-1 space-y-4">
          {(incident.severity === "Catastrophic" || incident.severity === "Critical" || incident.severity === "Serious") && (
            <motion.div
              variants={fadeUp}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                incident.severity === "Catastrophic"
                  ? "bg-red-900/20 border border-red-900/50 text-red-200"
                  : incident.severity === "Critical"
                    ? "bg-red-500/10 border border-red-500/30 text-red-300"
                    : "bg-orange-500/10 border border-orange-500/30 text-orange-300",
              )}
              role="alert"
              aria-live="polite"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {incident.severity === "Catastrophic"
                  ? "CATASTROPHIC INCIDENT - Maximum response required immediately."
                  : incident.severity === "Critical"
                    ? "CRITICAL INCIDENT - Immediate escalation required."
                    : "SERIOUS INCIDENT - Significant coordinated response required."}
              </span>
            </motion.div>
          )}

          <motion.div
            className="rounded-2xl p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            variants={fadeUp}
          >
            <div className="flex items-start gap-5">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${sevHex}1A` }}
              >
                <TypeIcon
                  className="w-7 h-7"
                  style={{ color: sevHex }}
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl font-bold text-white">
                    {incident.title || incident.type}
                  </h1>
                  <span
                    className="px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0"
                    style={{
                      background: `${sevHex}1A`,
                      color: sevHex,
                      border: `1px solid ${sevHex}33`,
                    }}
                  >
                    {sevPcode} {incident.severity}
                  </span>
                </div>

                <div
                  className="flex items-center gap-5 flex-wrap text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: "rgba(37,99,235,0.12)",
                      color: "#93C5FD",
                      border: "1px solid rgba(59,130,246,0.35)",
                    }}
                  >
                    Category: {incident.type}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {incident.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <LiveElapsedTimer createdAt={incident.createdAt} />
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--muted-foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {incident.status}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            variants={staggerContainer}
          >
            <motion.div
              className="lg:col-span-2 rounded-2xl p-6"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
              variants={fadeUp}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Incident Timeline</h2>
                <div className="flex items-center gap-1.5">
                  <Activity
                    className="w-3.5 h-3.5"
                    style={{ color: "#32D74B" }}
                    aria-hidden="true"
                  />
                  <span
                    style={{ color: "#32D74B", fontSize: "12px", fontWeight: 500 }}
                  >
                    Live updates
                  </span>
                </div>
              </div>

              <IncidentTimeline incidentId={incident.id} />
            </motion.div>

            <motion.div
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                minHeight: "280px",
              }}
              variants={fadeUp}
            >
              {isGeocodingInProgress ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-3"
                  style={{ minHeight: "280px" }}
                  aria-busy="true"
                  aria-label="Locating incident"
                >
                  <Loader2
                    className="w-7 h-7 animate-spin"
                    style={{ color: "#60A5FA" }}
                    aria-hidden="true"
                  />
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    Locating incident...
                  </p>
                </div>
              ) : incident.latitude && incident.longitude && incident.latitude !== 0 && incident.longitude !== 0 ? (
                <InteractiveIncidentMap
                  lat={incident.latitude}
                  lng={incident.longitude}
                  location={incident.location}
                  title={incident.title}
                  severity={incident.severity}
                  affectedRadius={incident.affectedRadius}
                  stations={nearestStations}
                />
              ) : (
                <div
                  className="flex-1 relative overflow-hidden rounded-2xl"
                  style={{ background: "var(--secondary)", minHeight: "280px" }}
                >
                  <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full">
                      <pattern
                        id="grid-detail"
                        width="30"
                        height="30"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 30 0 L 0 0 0 30"
                          fill="none"
                          stroke="white"
                          strokeWidth="0.5"
                        />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#grid-detail)" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
                      style={{ background: sevHex }}
                    >
                      <AlertTriangle
                        className="w-7 h-7 text-white"
                        aria-hidden="true"
                      />
                      <div
                        className="absolute inset-0 rounded-full animate-ping opacity-20"
                        style={{ background: sevHex }}
                      />
                    </div>
                    <div
                      className="px-3 py-1.5 rounded-xl text-xs text-center max-w-[180px]"
                      style={{
                        background: "rgba(10,10,10,0.9)",
                        border: "1px solid var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <MapPin className="w-3 h-3 inline mr-1" aria-hidden="true" />
                      {incident.location}
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Coordinates unavailable
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4"
              variants={staggerContainer}
            >
              <motion.button
                onClick={() => incident.approved && onNavigate("dispatch")}
                disabled={!incident.approved}
                title={!incident.approved ? "Incident must be approved before dispatching units" : undefined}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl text-left group border transition-colors",
                  incident.approved
                    ? "bg-rose-900/30 border-rose-700/50 hover:bg-rose-900/40"
                    : "bg-gray-900/50 border-gray-800/50 opacity-50 cursor-not-allowed",
                )}
                variants={fadeUp}
                whileHover={incident.approved ? { y: -2, transition: { duration: 0.15 } } : {}}
                whileTap={incident.approved ? { scale: 0.97 } : {}}
              >
                <div className="w-11 h-11 rounded-lg bg-rose-800/40 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-rose-200" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <span className="text-white block text-sm font-semibold">Dispatch Units</span>
                  <span className="text-rose-200/80 text-xs">
                    {incident.approved ? "Deploy resources now" : "Requires incident approval"}
                  </span>
                </div>
                <ChevronRight
                  className="w-4 h-4 opacity-0 group-hover:opacity-80 transition-opacity shrink-0 text-rose-200"
                  aria-hidden="true"
                />
              </motion.button>

              <motion.button
                onClick={() => incident.approved && onNavigate("evacuation")}
                disabled={!incident.approved}
                title={!incident.approved ? "Incident must be approved before creating evacuation plans" : undefined}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl text-left group border transition-colors",
                  incident.approved
                    ? "bg-emerald-900/30 border-emerald-700/50 hover:bg-emerald-900/40"
                    : "bg-gray-900/50 border-gray-800/50 opacity-50 cursor-not-allowed",
                )}
                variants={fadeUp}
                whileHover={incident.approved ? { y: -2, transition: { duration: 0.15 } } : {}}
                whileTap={incident.approved ? { scale: 0.97 } : {}}
              >
                <div className="w-11 h-11 rounded-lg bg-emerald-800/40 flex items-center justify-center shrink-0">
                  <Map className="w-5 h-5 text-emerald-200" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <span className="text-white block text-sm font-semibold">Evacuation Plan</span>
                  <span className="text-emerald-200/80 text-xs">
                    {incident.approved ? "Activate routes and shelters" : "Requires incident approval"}
                  </span>
                </div>
                <ChevronRight
                  className="w-4 h-4 opacity-0 group-hover:opacity-80 transition-opacity shrink-0 text-emerald-200"
                  aria-hidden="true"
                />
              </motion.button>
            </motion.div>

            {(dispatches.length > 0 || dispatchesLoading) && (
              <motion.div
                className="lg:col-span-3 rounded-2xl p-6"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                variants={fadeUp}
              >
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Truck
                    className="w-4 h-4"
                    style={{ color: "#FF9F0A" }}
                    aria-hidden="true"
                  />
                  Dispatches
                  {dispatches.length > 0 && (
                    <span
                      className="text-xs px-2 py-1 rounded ml-1"
                      style={{
                        background: "var(--secondary)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {dispatches.length}
                    </span>
                  )}
                </h2>
                {dispatchesLoading ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Loading dispatches...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {dispatches.map((d) => (
                      <DispatchCard
                        key={d.id}
                        dispatch={d}
                        onActionComplete={fetchIncidentDetails}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <motion.div
              className="lg:col-span-3 rounded-2xl p-6"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
              variants={fadeUp}
            >
              <IncidentAttachments
                incidentId={incident.id}
                incidentTitle={incident.title || incident.type}
              />
            </motion.div>

            <motion.div
              className="lg:col-span-3 rounded-2xl p-6"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
              variants={fadeUp}
            >
              <IncidentAdvisoryPanel incidentId={incident.id} />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
