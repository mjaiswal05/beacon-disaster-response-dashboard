import { AlertTriangle, Bell, CheckCircle2, History, Loader, Plus, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelEvacuation,
  getIncidentById,
  listEvacuationsByIncident,
  postIncidentAlert,
  updateEvacuation,
} from "../../services/core.api";
import {
  listFireStationLocations,
  listHospitalLocations,
  listShelterLocations,
} from "../../services/observability.api";
import type { Evacuation, EvacuationStatus, SafeZone } from "../../types/core.types";
import type {
  FireStationLocation,
  HospitalLocation,
  ShelterLocation,
} from "../../types/observability.types";
import { AdvisoryHistoryCard } from "../molecules/AdvisoryHistoryCard";
import { EvacuationZoneCard } from "../molecules/EvacuationZoneCard";
import { EvacuationMap } from "../organisms/EvacuationMap";
import { EvacuationWizard } from "../organisms/EvacuationWizard";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";

interface EvacuationPlanProps {
  incidentId: string | null;
  onBack: () => void;
  onNotify: () => void;
  onOpenEvacuation: (evacuationId: string) => void;
}

const IRELAND_COUNTRY_ID = 105;
const DEFAULT_LOCATION = { lat: 53.3478, lng: -6.2597 };

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function EvacuationPlan({ incidentId, onBack, onNotify, onOpenEvacuation }: EvacuationPlanProps) {
  const [evacuations, setEvacuations] = useState<Evacuation[]>([]);
  const [incidentData, setIncidentData] = useState<{
    title: string; severity: string; lat: number; lng: number; address: string; type: string;
  } | null>(null);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [safeZonesLoading, setSafeZonesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "success" | "error">("idle");
  const [view, setView] = useState<"list" | "create" | "history">("list");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const fetchData = useCallback(async () => {
    if (!incidentId) return;
    setError(null);
    try {
      const [evacuationList, rawIncident] = await Promise.all([
        listEvacuationsByIncident(incidentId),
        getIncidentById(incidentId),
      ]);
      setEvacuations(evacuationList);
      const lat = rawIncident.location?.latitude || 0;
      const lng = rawIncident.location?.longitude || 0;
      setIncidentData({
        title: rawIncident.title || rawIncident.type || "Incident",
        severity: rawIncident.severity || "P2",
        lat: lat !== 0 ? lat : DEFAULT_LOCATION.lat,
        lng: lng !== 0 ? lng : DEFAULT_LOCATION.lng,
        address: rawIncident.location?.address || "Unknown Location",
        type: rawIncident.type || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load evacuation data");
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    setSafeZonesLoading(true);
    Promise.all([
      listHospitalLocations(IRELAND_COUNTRY_ID),
      listFireStationLocations(IRELAND_COUNTRY_ID),
      listShelterLocations(IRELAND_COUNTRY_ID),
    ])
      .then(([hospitals, fireStations, shelters]: [HospitalLocation[], FireStationLocation[], ShelterLocation[]]) => {
        if (cancelled) return;
        setSafeZones([
          ...hospitals.slice(0, 5).map((h) => ({
            id: `hospital-${h.source_id}`, name: h.name, type: "hospital" as const,
            address: h.address || h.municipality || "", distance: "-",
            lat: h.latitude, lng: h.longitude, status: "Available",
          })),
          ...fireStations.slice(0, 5).map((f) => ({
            id: `fire-${f.source_id}`, name: f.name, type: "fire_station" as const,
            address: f.address || f.municipality || "", distance: "-",
            lat: f.latitude, lng: f.longitude, status: "Available",
          })),
          ...shelters.map((s) => ({
            id: `shelter-${s.source_id}`, name: s.name, type: "shelter" as const,
            shelterType: s.shelter_type, capacity: s.capacity,
            address: s.address || s.municipality || "", distance: "-",
            lat: s.latitude, lng: s.longitude, status: `Capacity: ${s.capacity.toLocaleString()}`,
          })),
        ]);
      })
      .catch(() => { if (!cancelled) setSafeZones([]); })
      .finally(() => { if (!cancelled) setSafeZonesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const nearbyShelters = useMemo(() => {
    const iLat = incidentData?.lat ?? DEFAULT_LOCATION.lat;
    const iLng = incidentData?.lng ?? DEFAULT_LOCATION.lng;
    return safeZones
      .filter((z) => z.type === "shelter")
      .map((z) => ({ ...z, distance: `${distanceKm(iLat, iLng, z.lat, z.lng).toFixed(1)} km` }))
      .filter((z) => parseFloat(z.distance) <= 15)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [safeZones, incidentData]);

  const stats = useMemo(() => ({
    activeZones: evacuations.filter((e) => e.status === "active").length,
    sentCount: evacuations.filter((e) => Boolean(e.notification_sent)).length,
  }), [evacuations]);

  const handleActivate = useCallback(async (evacuationId: string) => {
    if (!incidentId) return;
    setUpdatingId(evacuationId);
    try {
      await updateEvacuation(evacuationId, { status: "active" });
      setEvacuations(await listEvacuationsByIncident(incidentId));
    } catch (err: any) { setError(err.message || "Failed to activate evacuation"); }
    finally { setUpdatingId(null); }
  }, [incidentId]);

  const handleComplete = useCallback(async (evacuationId: string) => {
    if (!incidentId) return;
    setUpdatingId(evacuationId);
    try {
      await updateEvacuation(evacuationId, { status: "completed" });
      setEvacuations(await listEvacuationsByIncident(incidentId));
    } catch (err: any) { setError(err.message || "Failed to complete evacuation"); }
    finally { setUpdatingId(null); }
  }, [incidentId]);

  const handleCancel = useCallback(async (evacuationId: string) => {
    if (!incidentId) return;
    setUpdatingId(evacuationId);
    try {
      await cancelEvacuation(evacuationId);
      setEvacuations(await listEvacuationsByIncident(incidentId));
    } catch (err: any) { setError(err.message || "Failed to cancel evacuation"); }
    finally { setUpdatingId(null); }
  }, [incidentId]);

  const handleNotifyCitizens = useCallback(async () => {
    if (!incidentId) return;
    setIsNotifying(true);
    setNotifyStatus("idle");
    try {
      await postIncidentAlert(incidentId, {
        update_message: `Evacuation alert: ${stats.activeZones} active plan(s) — citizens should follow issued advisories.`,
      });
      setNotifyStatus("success");
      setShowConfirmation(false);
      onNotify();
      setTimeout(() => setNotifyStatus("idle"), 3000);
    } catch {
      setNotifyStatus("error");
      setTimeout(() => setNotifyStatus("idle"), 3000);
    } finally { setIsNotifying(false); }
  }, [incidentId, stats.activeZones, onNotify]);

  const mapLat = incidentData?.lat ?? DEFAULT_LOCATION.lat;
  const mapLng = incidentData?.lng ?? DEFAULT_LOCATION.lng;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        <div className="text-center">
          <Loader className="w-7 h-7 animate-spin mx-auto mb-3 text-blue-400" aria-hidden="true" />
          <p className="text-muted-foreground">Loading evacuation plan...</p>
        </div>
      </div>
    );
  }

  if (error && evacuations.length === 0 && !incidentData) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="hover:bg-secondary p-2 rounded-lg transition-colors" aria-label="Go back">←</button>
          <h2 className="text-foreground">Evacuation Plan</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" aria-hidden="true" />
          <h3 className="text-foreground text-xl mb-2">Failed to Load</h3>
          <p className="text-muted-foreground mb-5">{error}</p>
          <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="hover:bg-secondary p-2 rounded-lg transition-colors" aria-label="Go back">←</button>
          <div className="min-w-0">
            <h2 className="text-foreground truncate">Evacuation Plan</h2>
            <p className="text-muted-foreground text-xs truncate">{incidentData?.title || "Incident evacuation workflow"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.activeZones > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500" aria-hidden="true" />
              <span className="text-yellow-400 text-xs">{stats.activeZones} Active</span>
            </div>
          )}
          <button
            onClick={() => setView(view === "history" ? "list" : "history")}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === "history" ? "bg-blue-600/20 text-blue-400" : "hover:bg-secondary text-muted-foreground",
            )}
            aria-label="Toggle history view"
            title="Advisory history"
          >
            <History className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Inline error */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg" role="alert">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300" aria-label="Dismiss error">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 p-4 md:p-5 max-w-7xl w-full mx-auto flex flex-col gap-3">

        {/* ── HISTORY VIEW ──────────────────────────────────────────── */}
        {view === "history" && (
          <div className="h-full min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
            <div className="xl:col-span-4 min-h-0 flex flex-col gap-3">
              <Card className="bg-card border-border p-3">
                <h3 className="text-foreground mb-3">Advisory Summary</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Total sent", value: stats.sentCount },
                    { label: "Evacuate", value: evacuations.filter((e) => e.notification_sent && (e.advisory_type ?? "evacuate") === "evacuate").length },
                    { label: "Shelter in place", value: evacuations.filter((e) => e.notification_sent && e.advisory_type === "shelter_in_place").length },
                    { label: "All clear", value: evacuations.filter((e) => e.notification_sent && e.advisory_type === "all_clear").length },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="bg-card border-border p-3 flex-1 min-h-[200px] flex flex-col">
                <h4 className="text-foreground mb-2 text-sm">Area Snapshot</h4>
                <div className="flex-1 min-h-0">
                  <EvacuationMap lat={mapLat} lng={mapLng} safeZones={safeZones} evacuations={evacuations} />
                </div>
              </Card>
            </div>
            <Card className="xl:col-span-8 bg-card border-border p-3 min-h-0 flex flex-col">
              <div className="pb-2 border-b border-border mb-3">
                <h3 className="text-foreground">Advisory History</h3>
                <p className="text-muted-foreground text-xs">Sent advisories with full resource details.</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {stats.sentCount === 0 ? (
                  <div className="h-full border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center px-4">
                    <Bell className="w-8 h-8 text-gray-600 mb-2.5" aria-hidden="true" />
                    <p className="text-foreground font-medium mb-1">No advisories sent yet</p>
                    <p className="text-muted-foreground text-sm">Sent advisories will appear here once issued.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evacuations.filter((e) => e.notification_sent).map((evac) => (
                      <AdvisoryHistoryCard
                        key={evac.id}
                        advisoryType={evac.advisory_type}
                        advisoryTitle={evac.advisory_title ?? undefined}
                        advisoryBody={evac.advisory_body ?? undefined}
                        zoneName={evac.zone_name}
                        shelterName={evac.shelter_name}
                        shelterAddress={evac.shelter_address}
                        transportMode={evac.transport_mode}
                        resources={evac.resources}
                        sentAt={evac.updated_at}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── PLAN VIEW (list + create) ─────────────────────────────── */}
        {view !== "history" && (
          <div className="h-full min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Left: map + stats */}
            <div className="xl:col-span-7 min-h-0 flex flex-col gap-3">
              <Card className="bg-card border-border p-3 flex-1 min-h-[320px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-foreground">Evacuation Map</h3>
                  <span className="text-xs text-muted-foreground">{safeZones.length} safe zones · {evacuations.length} plans</span>
                </div>
                <div className="flex-1 min-h-0">
                  <EvacuationMap lat={mapLat} lng={mapLng} safeZones={safeZones} evacuations={evacuations} />
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gray-900 border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">Active Plans</p>
                  <p className="text-white text-xl font-semibold mt-0.5">{stats.activeZones > 0 ? stats.activeZones : "None"}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">Advisories Sent</p>
                  <p className="text-white text-xl font-semibold mt-0.5">{stats.sentCount > 0 ? stats.sentCount : "None"}</p>
                </Card>
              </div>

              {notifyStatus !== "idle" && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 ${notifyStatus === "success"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                >
                  {notifyStatus === "success"
                    ? <><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Alert sent successfully.</>
                    : <><XCircle className="w-4 h-4" aria-hidden="true" /> Failed to send notification.</>}
                </div>
              )}
            </div>

            {/* Right: zone list or wizard */}
            <Card className="xl:col-span-5 bg-card border-border p-3 min-h-0 flex flex-col">
              {view === "create" ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-foreground">Create Evacuation Plan</h3>
                    <button
                      onClick={() => setView("list")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close wizard"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {incidentId && (
                      <EvacuationWizard
                        incidentId={incidentId}
                        incidentData={incidentData}
                        nearbyShelters={nearbyShelters}
                        safeZonesLoading={safeZonesLoading}
                        onDone={(updated) => { setEvacuations(updated); setView("list"); }}
                        onCancel={() => setView("list")}
                      />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-foreground">Evacuation Zones</h3>
                      <p className="text-muted-foreground text-xs">Manage and activate zones for this incident.</p>
                    </div>
                    <Button
                      onClick={() => setView("create")}
                      className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      Create Zone
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {evacuations.length === 0 ? (
                      <div className="h-full border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center px-4">
                        <Bell className="w-9 h-9 text-gray-600 mb-2" aria-hidden="true" />
                        <h4 className="text-foreground mb-1">No Zones Yet</h4>
                        <p className="text-muted-foreground text-sm mb-3">Create a zone to begin planning evacuation for this incident.</p>
                        <Button onClick={() => setView("create")} className="bg-blue-600 hover:bg-blue-700 h-9 px-4">
                          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />Create First Zone
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {evacuations.map((ev) => (
                          <EvacuationZoneCard
                            key={ev.id}
                            id={ev.id}
                            zoneName={ev.zone_name}
                            status={ev.status as EvacuationStatus}
                            advisoryType={ev.advisory_type}
                            shelterName={ev.shelter_name}
                            notificationSent={ev.notification_sent}
                            isUpdating={updatingId === ev.id}
                            onActivate={handleActivate}
                            onComplete={handleComplete}
                            onCancel={handleCancel}
                            onViewDetails={onOpenEvacuation}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border">
                    <Button onClick={onBack} variant="outline" className="border-border text-muted-foreground">
                      Back
                    </Button>
                    <Button
                      onClick={() => setShowConfirmation(true)}
                      disabled={evacuations.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 h-10 px-5 disabled:opacity-50"
                    >
                      <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
                      Notify Citizens
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm evacuation alert"
        >
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-8 h-8 text-blue-500" aria-hidden="true" />
            </div>
            <h3 className="text-foreground mb-2 text-center">Send Evacuation Alert?</h3>
            <p className="text-muted-foreground text-sm text-center mb-5">
              This will send emergency notifications for {evacuations.length} evacuation plan{evacuations.length !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowConfirmation(false)} disabled={isNotifying} variant="outline" className="flex-1 border-border">
                Cancel
              </Button>
              <Button
                onClick={handleNotifyCitizens}
                disabled={isNotifying}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isNotifying ? <><Loader className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />Sending...</> : "Send Notification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
