import { AlertTriangle, CheckCircle2, Loader, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getEvacuation,
    listIncidentAttachments,
    updateEvacuation,
} from "../../services/core.api";
import type { Evacuation, ResourceItem } from "../../types/core.types";
import { formatTimestamp } from "../../utils/date.utils";
import { ResourcesEditor } from "../organisms/ResourcesEditor";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";

interface EvacuationDetailsProps {
    incidentId: string | null;
    evacuationId: string | null;
    onBack: () => void;
}

const STATUS_STYLES: Record<string, string> = {
    planned: "bg-blue-500/10 text-blue-400",
    active: "bg-yellow-500/10 text-yellow-400",
    completed: "bg-green-500/10 text-green-400",
    cancelled: "bg-gray-500/10 text-gray-400",
};

const ADVISORY_LABELS: Record<string, string> = {
    evacuate: "Evacuate",
    shelter_in_place: "Shelter in Place",
    all_clear: "All Clear",
};

function cloneResources(resources: ResourceItem[] | undefined): ResourceItem[] {
    return Array.isArray(resources) ? resources.map((r) => ({ ...r })) : [];
}

function asAttachmentName(id: string, fallbackName: string) {
    return { id, name: fallbackName };
}

export function EvacuationDetails({ incidentId, evacuationId, onBack }: EvacuationDetailsProps) {
    const [evacuation, setEvacuation] = useState<Evacuation | null>(null);
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [savedResources, setSavedResources] = useState<ResourceItem[]>([]);
    const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

    const fetchDetails = useCallback(async () => {
        if (!evacuationId) {
            setError("Missing evacuation id");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [evac, incidentAttachments] = await Promise.all([
                getEvacuation(evacuationId),
                incidentId ? listIncidentAttachments(incidentId) : Promise.resolve([]),
            ]);

            const nextResources = cloneResources(evac.resources);
            setEvacuation(evac);
            setResources(nextResources);
            setSavedResources(nextResources);
            setAttachments(
                incidentAttachments.map((a) =>
                    asAttachmentName(a.file_id, a.file?.filename || "Attachment"),
                ),
            );
        } catch (err: any) {
            setError(err.message || "Failed to load evacuation details");
        } finally {
            setIsLoading(false);
        }
    }, [incidentId, evacuationId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const isDirty = useMemo(() => {
        return JSON.stringify(resources) !== JSON.stringify(savedResources);
    }, [resources, savedResources]);

    const handleSave = async () => {
        if (!evacuationId || !isDirty) return;

        setIsSaving(true);
        setSaveStatus("idle");
        setError(null);

        try {
            const updated = await updateEvacuation(evacuationId, { resources });
            const nextResources = cloneResources(updated.resources);
            setEvacuation(updated);
            setResources(nextResources);
            setSavedResources(nextResources);
            setSaveStatus("success");
            setTimeout(() => setSaveStatus("idle"), 2500);
        } catch (err: any) {
            setSaveStatus("error");
            setError(err.message || "Failed to update evacuation resources");
            setTimeout(() => setSaveStatus("idle"), 2500);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
                <div className="text-center">
                    <Loader className="w-7 h-7 animate-spin mx-auto mb-3 text-blue-400" aria-hidden="true" />
                    <p className="text-muted-foreground">Loading evacuation details...</p>
                </div>
            </div>
        );
    }

    if (!evacuation || error) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
                    <button onClick={onBack} className="hover:bg-secondary p-2 rounded-lg transition-colors" aria-label="Go back">
                        ←
                    </button>
                    <h2 className="text-foreground">Evacuation Details</h2>
                </header>
                <div className="max-w-4xl mx-auto p-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                        <p className="text-red-400 text-sm">{error || "Evacuation not found"}</p>
                    </div>
                    <Button onClick={fetchDetails} className="mt-3 bg-blue-600 hover:bg-blue-700">Retry</Button>
                </div>
            </div>
        );
    }

    const advisoryLabel = evacuation.advisory_type ? ADVISORY_LABELS[evacuation.advisory_type] : "Not set";
    const statusClass = STATUS_STYLES[evacuation.status] || "bg-gray-500/10 text-gray-400";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="hover:bg-secondary p-2 rounded-lg transition-colors" aria-label="Go back">
                        ←
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-foreground truncate">Evacuation Details</h2>
                        <p className="text-muted-foreground text-xs truncate">{evacuation.zone_name || "Untitled zone"}</p>
                    </div>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusClass)}>{evacuation.status}</span>
            </header>

            <div className="max-w-5xl mx-auto p-4 md:p-5 space-y-3">
                {saveStatus !== "idle" && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={cn(
                            "p-3 rounded-lg text-sm flex items-center gap-2",
                            saveStatus === "success"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20",
                        )}
                    >
                        {saveStatus === "success" ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                Resources updated successfully.
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                Failed to update resources.
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <Card className="bg-card border-border p-4 space-y-2">
                    <h3 className="text-foreground">Plan Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs">Zone</p>
                            <p className="text-foreground">{evacuation.zone_name || "-"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Advisory Type</p>
                            <p className="text-foreground">{advisoryLabel}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Shelter</p>
                            <p className="text-foreground">{evacuation.shelter_name || "Not assigned"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Last Updated</p>
                            <p className="text-foreground">{evacuation.updated_at ? formatTimestamp(evacuation.updated_at) : "-"}</p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-card border-border p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <h3 className="text-foreground">Citizen Resources</h3>
                            <p className="text-muted-foreground text-xs">Update links, phone numbers, checklists, and attached files shown in the mobile app.</p>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? <Loader className="w-4 h-4 animate-spin mr-2" aria-hidden="true" /> : <Save className="w-4 h-4 mr-2" aria-hidden="true" />}
                            Save Resources
                        </Button>
                    </div>

                    <ResourcesEditor
                        resources={resources}
                        onChange={setResources}
                        incidentAttachments={attachments}
                    />

                    {isDirty && (
                        <div className="pt-3">
                            <Button
                                onClick={() => setResources(cloneResources(savedResources))}
                                variant="outline"
                                className="border-border text-muted-foreground"
                            >
                                Reset Changes
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
