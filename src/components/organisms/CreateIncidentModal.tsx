import {
  AlertTriangle,
  Building2,
  Car,
  ChevronDown,
  Droplets,
  File,
  Flame,
  FlaskConical,
  HeartPulse,
  HelpCircle,
  Loader,
  MapPin,
  Mountain,
  Paperclip,
  PowerOff,
  Radiation,
  Shield,
  UploadCloud,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCounties } from "../../hooks/useCounties";
import {
  useLocationSearch,
  type LocationSuggestion,
} from "../../hooks/useLocationSearch";
import {
  confirmUpload,
  createVaultFolder,
  initiateUpload,
  linkIncidentAttachment,
} from "../../services/core.api";

export interface CreateIncidentData {
  title: string;
  type: string;
  severity: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    county: string;
  };
}

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Must return the newly created incident's ID so attachments can be linked. */
  onSubmit: (data: CreateIncidentData) => Promise<string>;
}

const SEVERITY_OPTIONS = [
  {
    value: "P0",
    label: "Catastrophic",
    description: "Widespread immediate threat",
    color: "#991B1B",
  },
  {
    value: "P1",
    label: "Critical",
    description: "Life-threatening emergency",
    color: "#DC2626",
  },
  {
    value: "P2",
    label: "Serious",
    description: "Urgent coordinated response",
    color: "#EA580C",
  },
  {
    value: "P3",
    label: "High",
    description: "Elevated response required",
    color: "#F97316",
  },
  {
    value: "P4",
    label: "Medium",
    description: "Standard response",
    color: "#FACC15",
  },
  {
    value: "P5",
    label: "Low",
    description: "Routine response",
    color: "#60A5FA",
  },
  {
    value: "P6",
    label: "Advisory",
    description: "Monitor and inform",
    color: "#9CA3AF",
  },
];

const INCIDENT_TYPES = [
  { value: "fire", label: "Fire", icon: Flame, color: "#FF453A" },
  { value: "flood", label: "Flood", icon: Droplets, color: "#64D2FF" },
  { value: "earthquake", label: "Earthquake", icon: Mountain, color: "#FF9F0A" },
  { value: "accident", label: "Accident", icon: Car, color: "#2563EB" },
  { value: "tsunami", label: "Tsunami", icon: Waves, color: "#64D2FF" },
  { value: "landslide", label: "Landslide", icon: AlertTriangle, color: "#FF9F0A" },
  { value: "explosion", label: "Explosion", icon: Zap, color: "#FF453A" },
  { value: "gas_leak", label: "Gas Leak", icon: FlaskConical, color: "#9333EA" },
  { value: "power_outage", label: "Power Outage", icon: PowerOff, color: "#8A8F98" },
  { value: "structural_failure", label: "Structural", icon: Building2, color: "#FF9F0A" },
  { value: "terror_attack", label: "Terror Attack", icon: Shield, color: "#FF453A" },
  { value: "chemical_spill", label: "Chemical Spill", icon: Radiation, color: "#9333EA" },
  { value: "wildfire", label: "Wildfire", icon: Flame, color: "#FF6B00" },
  { value: "cyclone", label: "Cyclone", icon: Wind, color: "#64D2FF" },
  { value: "medical_emergency", label: "Medical", icon: HeartPulse, color: "#32D74B" },
  { value: "other", label: "Other", icon: HelpCircle, color: "#8A8F98" },
];

function normalizeCountyName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcounty\b/g, "")
    .replace(/\bco\.?\b/g, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

function resolveCountyFromSuggestion(
  suggestion: LocationSuggestion,
  counties: Array<{ name: string; value: string }>,
): string | null {
  const available = counties.filter((c) => c.value !== "all");
  if (!available.length) return null;

  const address = suggestion.address as Record<string, string | undefined>;
  const candidateParts = [
    address["county"],
    address["state_district"],
    address["state"],
    address["region"],
    address["city"],
    address["town"],
    address["municipality"],
    ...suggestion.display_name.split(","),
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  for (const part of candidateParts) {
    const normalizedPart = normalizeCountyName(part);
    if (!normalizedPart) continue;

    const exact = available.find(
      (county) => normalizeCountyName(county.name) === normalizedPart,
    );
    if (exact) return exact.name;
  }

  for (const part of candidateParts) {
    const normalizedPart = normalizeCountyName(part);
    if (!normalizedPart) continue;

    const fuzzy = available.find((county) => {
      const normalizedCounty = normalizeCountyName(county.name);
      return (
        normalizedCounty.includes(normalizedPart) ||
        normalizedPart.includes(normalizedCounty)
      );
    });
    if (fuzzy) return fuzzy.name;
  }

  return null;
}

/** Inline location field - mirrors LocationSearchInput logic but uses our design tokens */
function LocationField({
  value,
  onSelect,
  disabled,
}: {
  value: string;
  onSelect: (s: LocationSuggestion, raw: string) => void;
  disabled: boolean;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState("");
  const { suggestions, isSearching, showSuggestions, hideSuggestions } =
    useLocationSearch(searchQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setSearchQuery(v);
  };

  const handleSelect = (s: LocationSuggestion) => {
    setInputValue(s.display_name);
    setSearchQuery("");
    hideSuggestions();
    onSelect(s, s.display_name);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--muted-foreground)" }}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        {isSearching && (
          <Loader
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin pointer-events-none"
            style={{ color: "var(--muted-foreground)" }}
            aria-hidden="true"
          />
        )}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search address or coordinates…"
          className="w-full h-9 pl-10 pr-10 rounded-[10px] text-white placeholder-[#4a4a52] focus:outline-none transition-all"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
            fontSize: "13px",
          }}
          disabled={disabled}
          aria-label="Search location"
          autoComplete="off"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-[200] w-full mt-1 rounded-[12px] overflow-hidden shadow-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
          role="listbox"
          aria-label="Location suggestions"
        >
          {suggestions.map((s) => (
            <li key={s.place_id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-secondary transition-colors"
              >
                <MapPin
                  className="w-3.5 h-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span
                  className="text-white leading-snug"
                  style={{ fontSize: "13px" }}
                >
                  {s.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CreateIncidentModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateIncidentModalProps) {
  const { counties } = useCounties();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("fire");
  const [severity, setSeverity] = useState("P1");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [pendingCountySuggestion, setPendingCountySuggestion] =
    useState<LocationSuggestion | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [isDroppingFiles, setIsDroppingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingCountySuggestion) return;
    const matchedCounty = resolveCountyFromSuggestion(
      pendingCountySuggestion,
      counties,
    );
    if (!matchedCounty) return;

    setCounty(matchedCounty);
    setPendingCountySuggestion(null);
  }, [counties, pendingCountySuggestion]);

  if (!isOpen) return null;

  const selectedSeverity = SEVERITY_OPTIONS.find((s) => s.value === severity)!;
  const selectedType = INCIDENT_TYPES.find((t) => t.value === type)!;
  const TypeIcon = selectedType.icon;

  const reset = () => {
    setTitle("");
    setType("fire");
    setSeverity("P1");
    setDescription("");
    setCounty("");
    setPendingCountySuggestion(null);
    setLocation(null);
    setError(null);
    setAttachedFiles([]);
    setUploadStage(null);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setAttachedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const next = Array.from(incoming).filter((f) => !names.has(f.name));
      return [...prev, ...next];
    });
  };

  const removeFile = (index: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      setError("Please select a location from the suggestions");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const incidentId = await onSubmit({
        title,
        type,
        severity,
        description,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          county,
        },
      });

      // Upload attachments if any were selected.
      if (attachedFiles.length > 0 && incidentId) {
        setUploadStage("Creating vault folder…");
        const folderName = title.trim() || "Incident Documents";
        const folder = await createVaultFolder(folderName);

        for (let i = 0; i < attachedFiles.length; i++) {
          const f = attachedFiles[i];
          setUploadStage(`Uploading ${f.name} (${i + 1}/${attachedFiles.length})…`);

          const { file_id, signed_url } = await initiateUpload({
            folder_id: folder.id,
            filename: f.name,
            content_type: f.type || "application/octet-stream",
            size_bytes: f.size,
          });

          await fetch(signed_url, {
            method: "PUT",
            body: f,
            headers: { "Content-Type": f.type || "application/octet-stream" },
          });

          await confirmUpload(file_id);
          await linkIncidentAttachment(incidentId, file_id);
        }
      }

      reset();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to create incident");
    } finally {
      setIsSubmitting(false);
      setUploadStage(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-incident-title"
    >
      <div
        className="w-full max-w-4xl rounded-[20px] overflow-hidden flex flex-col"
        style={{
          background: "var(--background)",
          border: "1px solid var(--secondary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{
            background: "linear-gradient(180deg, var(--card) 0%, var(--background) 100%)",
            borderBottom: "1px solid var(--secondary)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: "rgba(255,69,58,0.15)",
                border: "1px solid rgba(255,69,58,0.2)",
              }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "#FF453A" }} strokeWidth={2} aria-hidden="true" />
            </div>
            <h2
              id="create-incident-title"
              className="text-white"
              style={{ fontSize: "16px", fontWeight: 600 }}
            >
              Log New Incident
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center hover:bg-card transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-[10px]"
              style={{ background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)" }}
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#FF453A" }} aria-hidden="true" />
              <span style={{ color: "#FF453A", fontSize: "13px" }}>{error}</span>
            </div>
          )}

          {/* Main 2-column grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-3">
              {/* Title */}
              <div>
                <label
                  htmlFor="incident-title"
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  Incident Title *
                </label>
                <input
                  id="incident-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Structure Fire - Main Street"
                  className="w-full h-9 px-3 rounded-[10px] text-white placeholder-[#4a4a52] focus:outline-none transition-all"
                  style={{ background: "var(--card)", border: "1px solid var(--secondary)", fontSize: "13px" }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Location */}
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  Location *
                </label>
                <LocationField
                  value=""
                  onSelect={(s) => {
                    setLocation({ lat: s.lat, lng: s.lng, address: s.display_name });
                    setCounty("");
                    setPendingCountySuggestion(s);
                    const matchedCounty = resolveCountyFromSuggestion(s, counties);
                    if (matchedCounty) {
                      setCounty(matchedCounty);
                      setPendingCountySuggestion(null);
                    }
                  }}
                  disabled={isSubmitting}
                />
                {location && (
                  <p className="mt-1 flex items-center gap-1" style={{ fontSize: "11px", color: "#32D74B" }}>
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{location.address}</span>
                  </p>
                )}
              </div>

              {/* County */}
              <div>
                <label
                  htmlFor="incident-county"
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  County
                </label>
                <div className="relative">
                  <select
                    id="incident-county"
                    value={county}
                    onChange={(e) => {
                      setCounty(e.target.value);
                      setPendingCountySuggestion(null);
                    }}
                    className="w-full h-9 px-3 rounded-[10px] text-white focus:outline-none transition-all appearance-none"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--secondary)",
                      fontSize: "13px",
                      color: county ? "#fff" : "#4a4a52",
                    }}
                    disabled={isSubmitting}
                  >
                    <option value="">Select county…</option>
                    {counties.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="incident-description"
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  Description *
                </label>
                <textarea
                  id="incident-description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed information about the incident…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-[10px] text-white placeholder-[#4a4a52] focus:outline-none resize-none transition-all"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--secondary)",
                    fontSize: "13px",
                    lineHeight: 1.4,
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              {/* Severity */}
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  Severity Level *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITY_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value)}
                      className="p-2 rounded-[10px] text-center transition-all"
                      style={{
                        background: severity === s.value ? `${s.color}15` : "var(--card)",
                        border: `1px solid ${severity === s.value ? `${s.color}50` : "var(--secondary)"}`,
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 700, color: severity === s.value ? s.color : "#CCCCCC", marginBottom: 1 }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                        {s.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label
                  className="block mb-1"
                  style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
                >
                  Incident Type *
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {INCIDENT_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className="p-1.5 rounded-[8px] flex flex-col items-center gap-0.5 transition-all"
                        style={{
                          background: active ? `${t.color}15` : "var(--card)",
                          border: `1px solid ${active ? `${t.color}50` : "var(--secondary)"}`,
                        }}
                        title={t.label}
                      >
                        <Icon
                          className="w-3.5 h-3.5"
                          style={{ color: active ? t.color : "var(--muted-foreground)" }}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        <span style={{ fontSize: "9px", fontWeight: 500, color: active ? t.color : "var(--muted-foreground)", lineHeight: 1 }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div
              className="p-3 rounded-[12px] flex items-start gap-3"
              style={{
                background: `${selectedSeverity.color}08`,
                border: `1px solid ${selectedSeverity.color}25`,
              }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{
                  background: `${selectedType.color}20`,
                  border: `1px solid ${selectedType.color}40`,
                }}
              >
                <TypeIcon
                  className="w-4 h-4"
                  style={{ color: selectedType.color }}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded-[6px]"
                    style={{
                      background: `${selectedSeverity.color}20`,
                      border: `1px solid ${selectedSeverity.color}40`,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: selectedSeverity.color,
                    }}
                  >
                    {severity}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    Preview
                  </span>
                </div>
                <div className="text-white truncate" style={{ fontSize: "13px", fontWeight: 500 }}>
                  {title || "Incident title…"}
                </div>
                <div className="truncate" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {location?.address ?? "Location not set"}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label
              className="block mb-1"
              style={{ fontSize: "12px", color: "#CCCCCC", fontWeight: 500 }}
            >
              Attachments{" "}
              <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDroppingFiles(true); }}
              onDragLeave={() => setIsDroppingFiles(false)}
              onDrop={(e) => { e.preventDefault(); setIsDroppingFiles(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-[10px] cursor-pointer transition-all"
              style={{
                border: `1px dashed ${isDroppingFiles ? "#2563EB" : "var(--secondary)"}`,
                background: isDroppingFiles ? "rgba(37,99,235,0.06)" : "var(--card)",
                padding: "8px 12px",
              }}
              role="button"
              aria-label="Drop files or click to browse"
            >
              <UploadCloud className="w-4 h-4 shrink-0" style={{ color: isDroppingFiles ? "#2563EB" : "var(--muted-foreground)" }} aria-hidden="true" />
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                Drop files or <span style={{ color: "#2563EB" }}>browse</span>
              </span>
              {attachedFiles.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-white" style={{ background: "#2563EB", fontSize: "11px" }}>
                  {attachedFiles.length}
                </span>
              )}
              <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} aria-hidden="true" />
            </div>
            {attachedFiles.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {attachedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-1 rounded-[8px]" style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}>
                    <File className="w-3 h-3 shrink-0" style={{ color: "var(--muted-foreground)" }} aria-hidden="true" />
                    <span className="flex-1 truncate text-white" style={{ fontSize: "12px" }} title={f.name}>{f.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="shrink-0 rounded transition-opacity hover:opacity-60" aria-label={`Remove ${f.name}`}>
                      <X className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upload progress */}
          {uploadStage && (
            <div className="flex items-center gap-2 p-3 rounded-[10px]" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}>
              <Loader className="w-4 h-4 shrink-0 animate-spin" style={{ color: "#2563EB" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", color: "#CCCCCC" }}>{uploadStage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-9 px-4 rounded-[10px] hover:bg-secondary transition-colors"
              style={{ border: "1px solid var(--secondary)", fontSize: "13px", fontWeight: 600, color: "#CCCCCC" }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 px-4 rounded-[10px] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #FF453A, #FF6B00)", boxShadow: "0 0 20px rgba(255,69,58,0.2)", fontSize: "13px", fontWeight: 600 }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" aria-hidden="true" />
                  {uploadStage ? "Uploading…" : "Creating…"}
                </>
              ) : (
                <>
                  {attachedFiles.length > 0 && <Paperclip className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  Log Incident
                  {attachedFiles.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-white/80" style={{ background: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
                      {attachedFiles.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
