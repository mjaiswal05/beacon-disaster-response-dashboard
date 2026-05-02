import {
  AlertTriangle,
  Bus,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Loader,
  MapPin,
  Search,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocationSearch } from "../../hooks/useLocationSearch";
import {
  createEvacuation,
  listEvacuationsByIncident,
  sendEvacuationAdvisory,
} from "../../services/core.api";
import type { AdvisoryType, Evacuation, ResourceItem, SafeZone, TransportMode } from "../../types/core.types";
import { getDefaultAdvisoryText, getDefaultResources } from "../../utils/evacuation.defaults";
import { NearestTransitPreview } from "../atoms/NearestTransitPreview";
import { ShelterPickerCard } from "../molecules/ShelterPickerCard";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";
import { ResourcesEditor } from "./ResourcesEditor";

// ── helpers ──────────────────────────────────────────────────────────────────

function bboxFromCenter(lat: number, lng: number, radiusKm: number) {
  const latDeg = radiusKm / 111;
  const lngDeg = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    sw: { lat: lat - latDeg, lng: lng - lngDeg },
    ne: { lat: lat + latDeg, lng: lng + lngDeg },
  };
}

function formatRadiusLabel(radiusKm: number) {
  if (radiusKm < 1) {
    return `${Math.round(radiusKm * 1000)} m`;
  }
  return `${radiusKm} km`;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface IncidentSummary {
  title: string;
  severity: string;
  lat: number;
  lng: number;
  address: string;
  type: string;
}

export interface EvacuationWizardProps {
  incidentId: string;
  incidentData: IncidentSummary | null;
  nearbyShelters: SafeZone[];
  safeZonesLoading: boolean;
  onDone: (updated: Evacuation[]) => void;
  onCancel: () => void;
}

const ADVISORY_LABELS: Record<AdvisoryType, { label: string; description: string }> = {
  evacuate: { label: "Evacuate", description: "Citizens must leave the affected area immediately" },
  shelter_in_place: { label: "Shelter in Place", description: "Citizens should stay indoors and await further instructions" },
  all_clear: { label: "All Clear", description: "Situation resolved — citizens may return" },
};

const TRANSPORT_OPTIONS: { mode: TransportMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    mode: "car",
    label: "Car / Taxi",
    description: "Citizens should travel by private vehicle or taxi",
    icon: <Car className="w-6 h-6" aria-hidden="true" />,
  },
  {
    mode: "pedestrian",
    label: "On Foot",
    description: "Citizens should walk to the designated shelter",
    icon: <Footprints className="w-6 h-6" aria-hidden="true" />,
  },
  {
    mode: "public_transport",
    label: "Public Transport",
    description: "Citizens will be guided to the nearest bus / Luas / train stop in the app",
    icon: <Bus className="w-6 h-6" aria-hidden="true" />,
  },
];

const STEP_LABELS = ["Zone & Shelter", "How to Travel", "Advisory"];

// ── step sub-components ───────────────────────────────────────────────────────

interface StepZoneProps {
  advisoryType: AdvisoryType;
  onAdvisoryTypeChange: (t: AdvisoryType) => void;
  shelters: SafeZone[];
  safeZonesLoading: boolean;
  selectedShelterId: string | null;
  onShelterSelect: (id: string) => void;
  zoneName: string;
  onZoneNameChange: (v: string) => void;
  showBbox: boolean;
  onToggleBbox: () => void;
  bbLocationQuery: string;
  onBbLocationQueryChange: (v: string) => void;
  bbRadius: number;
  onBbRadiusChange: (v: number) => void;
  bbCenter: { lat: number; lng: number } | null;
  onBbCenterSelect: (lat: number, lng: number) => void;
}

function StepZone({
  advisoryType,
  onAdvisoryTypeChange,
  shelters,
  safeZonesLoading,
  selectedShelterId,
  onShelterSelect,
  zoneName,
  onZoneNameChange,
  showBbox,
  onToggleBbox,
  bbLocationQuery,
  onBbLocationQueryChange,
  bbRadius,
  onBbRadiusChange,
  bbCenter,
  onBbCenterSelect,
}: StepZoneProps) {
  const { suggestions: bbSugg, showSuggestions: bbShow, hideSuggestions: bbHide, isSearching: bbSearching } =
    useLocationSearch(bbLocationQuery);

  return (
    <div className="space-y-5">
      {/* Advisory type */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Advisory Type</p>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(ADVISORY_LABELS) as [AdvisoryType, typeof ADVISORY_LABELS[AdvisoryType]][]).map(([type, meta]) => (
            <button
              key={type}
              type="button"
              onClick={() => onAdvisoryTypeChange(type)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                advisoryType === type
                  ? "border-blue-500 bg-blue-600/10 text-blue-300"
                  : "border-border bg-secondary text-muted-foreground hover:border-blue-500/40 hover:text-foreground",
              )}
            >
              <span className="font-medium">{meta.label}</span>
              <span className="block text-xs opacity-70 mt-0.5">{meta.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone name */}
      <div>
        <label htmlFor="zone-name" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">
          Zone Name
        </label>
        <Input
          id="zone-name"
          value={zoneName}
          onChange={(e) => onZoneNameChange(e.target.value)}
          placeholder="e.g. Northside — Zone A"
          className="bg-secondary border-border text-foreground"
        />
      </div>

      {/* Shelter picker — shown for evacuate */}
      {advisoryType === "evacuate" && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
            Designated Shelter
          </p>
          {safeZonesLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
              Loading nearby shelters...
            </div>
          ) : shelters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No shelters found within 15 km of this incident.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {shelters.map((s) => (
                <ShelterPickerCard
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  address={s.address}
                  distance={s.distance}
                  capacity={s.capacity}
                  shelterType={s.shelterType}
                  isSelected={selectedShelterId === s.id}
                  onSelect={onShelterSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bounding box — optional, evacuate only */}
      {advisoryType === "evacuate" && (
        <div>
          <button
            type="button"
            onClick={onToggleBbox}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            {showBbox ? "Hide" : "Set"} evacuation boundary (optional)
          </button>

          {showBbox && (
            <div className="mt-3 space-y-3 p-3 rounded-lg bg-secondary border border-border">
              <p className="text-xs text-muted-foreground">
                Search a location and set a radius. The boundary helps the mobile app show the affected area on the map.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  value={bbLocationQuery}
                  onChange={(e) => onBbLocationQueryChange(e.target.value)}
                  placeholder="Search centre of affected area..."
                  aria-label="Search evacuation boundary centre"
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {bbSearching && (
                  <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-blue-400" aria-hidden="true" />
                )}
              </div>
              {bbShow && bbSugg.length > 0 && (
                <ul className="mt-1 bg-background border border-border rounded-lg overflow-hidden shadow-lg">
                  {bbSugg.map((s) => (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onClick={() => { onBbCenterSelect(s.lat, s.lng); onBbLocationQueryChange(s.display_name); bbHide(); }}
                        className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-gray-700 hover:text-foreground transition-colors"
                      >
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {bbCenter && (
                <div className="space-y-1">
                  <label htmlFor="bbox-radius" className="text-xs text-muted-foreground flex justify-between">
                    <span>Radius</span>
                    <span className="text-foreground font-medium">{formatRadiusLabel(bbRadius)}</span>
                  </label>
                  <div className="flex items-center gap-1.5 pb-1">
                    {[0.05, 0.1, 0.2, 1, 5, 10, 15, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onBbRadiusChange(preset)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] border transition-colors",
                          bbRadius === preset
                            ? "bg-blue-600/20 border-blue-500 text-blue-300"
                            : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-blue-500/40",
                        )}
                      >
                        {formatRadiusLabel(preset)}
                      </button>
                    ))}
                  </div>
                  <input
                    id="bbox-radius"
                    type="range"
                    min={0.05}
                    max={25}
                    step={0.05}
                    value={bbRadius}
                    onChange={(e) => onBbRadiusChange(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Transport ─────────────────────────────────────────────────────────

interface StepTransportProps {
  transportMode: TransportMode;
  onTransportModeChange: (m: TransportMode) => void;
  selectedShelter: SafeZone | null;
}

function StepTransport({ transportMode, onTransportModeChange, selectedShelter }: StepTransportProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
        Recommended Travel Method
      </p>
      <div className="space-y-3">
        {TRANSPORT_OPTIONS.map(({ mode, label, description, icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onTransportModeChange(mode)}
            className={cn(
              "w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3",
              transportMode === mode
                ? "border-blue-500 bg-blue-600/10"
                : "border-border bg-secondary hover:border-blue-500/40",
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              transportMode === mode ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-muted-foreground",
            )}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", transportMode === mode ? "text-blue-300" : "text-foreground")}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
          </button>
        ))}
      </div>

      {transportMode === "public_transport" && (
        <NearestTransitPreview transportMode={transportMode} />
      )}

      {selectedShelter && (
        <div className="p-3 rounded-lg bg-secondary border border-border text-sm">
          <p className="text-xs text-muted-foreground mb-1">Destination</p>
          <p className="text-foreground font-medium">{selectedShelter.name}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{selectedShelter.address}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Advisory & Resources ──────────────────────────────────────────────

interface StepAdvisoryProps {
  advisoryTitle: string;
  onTitleChange: (v: string) => void;
  advisoryBody: string;
  onBodyChange: (v: string) => void;
  resources: ResourceItem[];
  onResourcesChange: (r: ResourceItem[]) => void;
}

function StepAdvisory({
  advisoryTitle,
  onTitleChange,
  advisoryBody,
  onBodyChange,
  resources,
  onResourcesChange,
}: StepAdvisoryProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="adv-title" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">
          Advisory Title
        </label>
        <Input
          id="adv-title"
          value={advisoryTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Evacuation Order — Fire"
          className="bg-secondary border-border text-foreground"
        />
      </div>

      <div>
        <label htmlFor="adv-body" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">
          Advisory Message
        </label>
        <textarea
          id="adv-body"
          value={advisoryBody}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={4}
          placeholder="Describe what citizens should do, where to go, and what to expect..."
          className="w-full rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          This message will be sent to citizens. Be clear, calm, and specific.
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          Resources for Citizens
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Pre-filled based on incident type. Edit, remove, or add items — these appear in the mobile app as a safety guide.
        </p>
        <ResourcesEditor resources={resources} onChange={onResourcesChange} />
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export function EvacuationWizard({
  incidentId,
  incidentData,
  nearbyShelters,
  safeZonesLoading,
  onDone,
  onCancel,
}: EvacuationWizardProps) {
  // Step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [advisoryType, setAdvisoryType] = useState<AdvisoryType>("evacuate");
  const [zoneName, setZoneName] = useState("");
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [showBbox, setShowBbox] = useState(false);
  const [bbLocationQuery, setBbLocationQuery] = useState("");
  const [bbCenter, setBbCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [bbRadius, setBbRadius] = useState(0.2);

  // Step 2 state
  const [transportMode, setTransportMode] = useState<TransportMode>("car");

  // Step 3 state — pre-filled when advisory type or incident type changes
  const [advisoryTitle, setAdvisoryTitle] = useState("");
  const [advisoryBody, setAdvisoryBody] = useState("");
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-generate zone name from incident
  useEffect(() => {
    if (!zoneName && incidentData?.address) {
      const parts = incidentData.address.split(",");
      setZoneName(parts[0].trim());
    }
  }, [incidentData?.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill advisory text + resources when advisory type changes
  useEffect(() => {
    const defaults = getDefaultAdvisoryText(incidentData?.type ?? "", advisoryType);
    setAdvisoryTitle(defaults.title);
    setAdvisoryBody(defaults.body);
    setResources(getDefaultResources(incidentData?.type ?? "", advisoryType));
  }, [advisoryType, incidentData?.type]);

  const selectedShelter = useMemo(
    () => nearbyShelters.find((s) => s.id === selectedShelterId) ?? null,
    [nearbyShelters, selectedShelterId],
  );

  const bbox = useMemo(() => {
    if (!bbCenter) return null;
    return bboxFromCenter(bbCenter.lat, bbCenter.lng, bbRadius);
  }, [bbCenter, bbRadius]);

  const totalSteps = advisoryType === "evacuate" ? 3 : 2;

  const handleNext = () => {
    if (advisoryType === "evacuate" && step === 1) {
      setStep(2);
    } else if (step < 3) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3 && advisoryType !== "evacuate") {
      setStep(1);
    } else if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async (sendAdvisory: boolean) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createEvacuation({
        incident_id: incidentId,
        zone_name: zoneName.trim() || `Zone — ${advisoryType}`,
        advisory_type: advisoryType,
        advisory_title: advisoryTitle.trim() || undefined,
        advisory_body: advisoryBody.trim() || undefined,
        bounding_box_ne_lat: bbox?.ne.lat,
        bounding_box_ne_lon: bbox?.ne.lng,
        bounding_box_sw_lat: bbox?.sw.lat,
        bounding_box_sw_lon: bbox?.sw.lng,
        shelter_id: selectedShelter?.id,
        shelter_name: selectedShelter?.name,
        shelter_address: selectedShelter?.address,
        shelter_lat: selectedShelter?.lat,
        shelter_lon: selectedShelter?.lng,
        transport_mode: advisoryType === "evacuate" ? transportMode : undefined,
        resources,
      });
      if (sendAdvisory && created?.id) {
        await sendEvacuationAdvisory(created.id);
      }
      const updated = await listEvacuationsByIncident(incidentId);
      onDone(updated);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create evacuation plan");
      setIsSubmitting(false);
    }
  };

  const stepIndex = step === 3 || (step === 2 && advisoryType !== "evacuate") ? totalSteps - 1 : step - 1;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          {(advisoryType === "evacuate" ? STEP_LABELS : [STEP_LABELS[0], STEP_LABELS[2]]).map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium",
                i < stepIndex ? "bg-green-600 text-white" :
                  i === stepIndex ? "bg-blue-600 text-white" :
                    "bg-secondary border border-border text-muted-foreground",
              )}>
                {i < stepIndex ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === stepIndex ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
              {i < totalSteps - 1 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-0">
        {step === 1 && (
          <StepZone
            advisoryType={advisoryType}
            onAdvisoryTypeChange={(t) => { setAdvisoryType(t); setSelectedShelterId(null); }}
            shelters={nearbyShelters}
            safeZonesLoading={safeZonesLoading}
            selectedShelterId={selectedShelterId}
            onShelterSelect={setSelectedShelterId}
            zoneName={zoneName}
            onZoneNameChange={setZoneName}
            showBbox={showBbox}
            onToggleBbox={() => setShowBbox((v) => !v)}
            bbLocationQuery={bbLocationQuery}
            onBbLocationQueryChange={setBbLocationQuery}
            bbRadius={bbRadius}
            onBbRadiusChange={setBbRadius}
            bbCenter={bbCenter}
            onBbCenterSelect={(lat, lng) => setBbCenter({ lat, lng })}
          />
        )}

        {step === 2 && advisoryType === "evacuate" && (
          <StepTransport
            transportMode={transportMode}
            onTransportModeChange={setTransportMode}
            selectedShelter={selectedShelter}
          />
        )}

        {(step === 3 || (step === 2 && advisoryType !== "evacuate")) && (
          <StepAdvisory
            advisoryTitle={advisoryTitle}
            onTitleChange={setAdvisoryTitle}
            advisoryBody={advisoryBody}
            onBodyChange={setAdvisoryBody}
            resources={resources}
            onResourcesChange={setResources}
          />
        )}
      </div>

      {/* Error */}
      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="border-border text-muted-foreground"
          onClick={step === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />Back</>}
        </Button>

        {/* Last step: two submit buttons */}
        {(step === 3 || (step === 2 && advisoryType !== "evacuate")) ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border text-muted-foreground"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin mr-1" aria-hidden="true" /> : null}
              Save as Draft
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader className="w-4 h-4 animate-spin mr-1" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" aria-hidden="true" />
              )}
              Save & Send Advisory
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
