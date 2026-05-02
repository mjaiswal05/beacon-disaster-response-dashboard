import {
    AlertTriangle,
    ArrowLeft,
    Bot,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Download,
    Filter,
    LayoutGrid,
    List,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { STATUS_CONFIG, getIncidentIcon } from "../../constants/constants";
import { useCounties } from "../../hooks/useCounties";
import { useInfiniteIncidents } from "../../hooks/useInfiniteIncidents";
import type { Incident } from "../../types/core.types";
import { exportIncidentCSV } from "../../utils/export.utils";
import { SeverityBadge } from "../atoms/SeverityBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../ui/utils";

interface AllIncidentsProps {
    onBack: () => void;
    onNavigate: (screen: string, incidentId?: string) => void;
    initialSearch?: string;
}

type ViewMode = "table" | "cards";
type SortMode = "priority" | "time-desc" | "time-asc";
type SourceFilter = "all" | "user" | "system";
type IncidentTab = "pending" | "user" | "system";

interface IncidentViewModel {
    incident: Incident;
    isSystem: boolean;
    normalizedStatus: string;
    severityPriority: number;
    statusPriority: number;
    priorityScore: number;
    createdAtMs: number;
}

const SEVERITY_OPTIONS = ["P0", "P1", "P2", "P3", "P4", "P5", "P6"] as const;

const STATUS_OPTIONS = [
    { value: "reported", label: "Reported" },
    { value: "verified", label: "Verified" },
    { value: "responding", label: "Responding" },
    { value: "active", label: "Active" },
    { value: "contained", label: "Contained" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
] as const;

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
    { value: "priority", label: "Priority" },
    { value: "time-desc", label: "Newest" },
    { value: "time-asc", label: "Oldest" },
];

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; icon: typeof List }> = [
    { value: "table", label: "Table", icon: List },
    { value: "cards", label: "Cards", icon: LayoutGrid },
];

const SEVERITY_PRIORITY: Record<string, number> = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
    P5: 5,
    P6: 6,
};

const STATUS_PRIORITY: Record<string, number> = {
    reported: 0,
    verified: 0,
    active: 1,
    responding: 1,
    in_progress: 1,
    contained: 1,
    resolved: 2,
    closed: 2,
};

const PRIORITY_LABEL: Record<number, string> = {
    0: "Immediate",
    1: "Active",
    2: "Resolved",
    3: "Other",
};

const PRIORITY_BADGE_CLASS: Record<number, string> = {
    0: "border-red-500/40 bg-red-500/10 text-red-300",
    1: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    2: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    3: "border-border bg-muted text-muted-foreground",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
    reported: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    verified: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    responding: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    active: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    contained: "border-violet-500/40 bg-violet-500/10 text-violet-300",
    resolved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    closed: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

const COUNTY_BOUNDING_BOXES: Record<string, string> = {
    Dublin: "53.23,-6.45,53.55,-6.0",
    Cork: "51.65,-9.0,52.2,-7.9",
    Galway: "53.1,-9.5,53.45,-8.6",
    Limerick: "52.45,-8.8,52.75,-8.3",
    Waterford: "52.05,-7.5,52.3,-7.0",
    Kerry: "51.8,-10.5,52.35,-9.3",
    Wexford: "52.15,-6.9,52.5,-6.2",
    Kilkenny: "52.35,-7.55,52.75,-6.85",
    Tipperary: "52.2,-8.35,52.8,-7.4",
    Clare: "52.6,-9.55,53.2,-8.35",
    Mayo: "53.4,-10.15,54.2,-8.8",
    Sligo: "53.85,-8.9,54.35,-8.1",
    Donegal: "54.2,-8.75,55.35,-7.1",
    Meath: "53.45,-7.0,53.85,-6.3",
    Kildare: "53.0,-7.0,53.4,-6.45",
    Wicklow: "52.9,-6.5,53.25,-5.95",
    Louth: "53.8,-6.6,54.15,-6.05",
    Westmeath: "53.3,-7.9,53.7,-7.1",
    Offaly: "52.9,-8.05,53.35,-7.15",
    Laois: "52.75,-7.6,53.1,-6.95",
    Carlow: "52.45,-7.0,52.75,-6.6",
    Longford: "53.55,-8.0,53.85,-7.4",
    Cavan: "53.75,-7.9,54.1,-6.95",
    Monaghan: "53.95,-7.5,54.35,-6.65",
    Roscommon: "53.4,-8.7,53.9,-7.85",
    Leitrim: "53.9,-8.3,54.35,-7.65",
};

function normalizeStatus(status: string): string {
    return status === "in_progress" ? "responding" : status;
}

function toViewModel(incident: Incident): IncidentViewModel {
    const normalizedStatus = normalizeStatus(incident.status || "reported");
    const statusPriority = STATUS_PRIORITY[normalizedStatus] ?? 3;
    const severityPriority = SEVERITY_PRIORITY[incident.severity] ?? 7;
    const createdAtMs = new Date(incident.created_at || 0).getTime();

    return {
        incident,
        isSystem: incident.is_internal,
        normalizedStatus,
        statusPriority,
        severityPriority,
        priorityScore: statusPriority * 10 + severityPriority,
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
    };
}

function formatTimeAgo(timestamp: string): string {
    if (!timestamp) return "-";
    const diffMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (!Number.isFinite(diffMinutes)) return "-";
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatDateTime(timestamp: string): string {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleString();
}

function getStatusLabel(status: string): string {
    if (status === "active") return "Active";
    if (status === "contained") return "Contained";
    if (status === "closed") return "Closed";
    return STATUS_CONFIG[status]?.label ?? status.replace(/_/g, " ");
}

function sortIncidents(items: IncidentViewModel[], sortMode: SortMode): IncidentViewModel[] {
    const sorted = [...items];

    if (sortMode === "priority") {
        sorted.sort(
            (a, b) =>
                a.priorityScore - b.priorityScore ||
                b.createdAtMs - a.createdAtMs ||
                a.incident.id.localeCompare(b.incident.id),
        );
        return sorted;
    }

    if (sortMode === "time-desc") {
        sorted.sort(
            (a, b) =>
                b.createdAtMs - a.createdAtMs ||
                a.priorityScore - b.priorityScore ||
                a.incident.id.localeCompare(b.incident.id),
        );
        return sorted;
    }

    sorted.sort(
        (a, b) =>
            a.createdAtMs - b.createdAtMs ||
            a.priorityScore - b.priorityScore ||
            a.incident.id.localeCompare(b.incident.id),
    );
    return sorted;
}

function toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value];
}

export function AllIncidents({ onBack, onNavigate, initialSearch = "" }: AllIncidentsProps) {
    const { counties } = useCounties();

    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [sortMode, setSortMode] = useState<SortMode>("priority");
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<IncidentTab>("pending");

    const [searchInput, setSearchInput] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
    const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [selectedCountyName, setSelectedCountyName] = useState("All Counties");

    const [pendingSourceFilter, setPendingSourceFilter] = useState<SourceFilter>("all");

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (!counties.some((county) => county.name === selectedCountyName)) {
            setSelectedCountyName(counties[0]?.name ?? "All Counties");
        }
    }, [counties, selectedCountyName]);

    const countyBBox =
        selectedCountyName !== "All Counties"
            ? COUNTY_BOUNDING_BOXES[selectedCountyName]
            : undefined;

    const {
        incidents: rawIncidents,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        totalCount,
        loadMore,
        refetch,
    } = useInfiniteIncidents({
        severity: selectedSeverity.length === 1 ? selectedSeverity[0] : undefined,
        status: selectedStatus.length === 1 ? selectedStatus[0] : "reported",
        pageSize: 500,
        pollInterval: 30_000,
        search: debouncedSearch || undefined,
        bbox: countyBBox,
    });

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            {
                root: null,
                rootMargin: "600px 0px 800px 0px",
                threshold: 0,
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, loadMore]);

    useEffect(() => {
        if (!hasMore || isLoading || isLoadingMore) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const top = sentinel.getBoundingClientRect().top;
        if (top <= window.innerHeight + 120) {
            loadMore();
        }
    }, [
        hasMore,
        isLoading,
        isLoadingMore,
        loadMore,
        rawIncidents.length,
        viewMode,
        sortMode,
    ]);

    const incidentModels = useMemo(
        () => rawIncidents.map(toViewModel),
        [rawIncidents],
    );

    const filteredIncidents = useMemo(() => {
        let list = incidentModels;

        if (selectedSeverity.length > 0) {
            list = list.filter((item) => selectedSeverity.includes(item.incident.severity));
        }

        if (selectedStatus.length > 0) {
            list = list.filter((item) => selectedStatus.includes(item.normalizedStatus));
        }

        return sortIncidents(list, sortMode);
    }, [incidentModels, selectedSeverity, selectedStatus, sortMode]);

    const pendingIncidents = useMemo(
        () => filteredIncidents.filter((item) => !item.incident.approved),
        [filteredIncidents],
    );

    const pendingUserCount = useMemo(
        () => pendingIncidents.filter((item) => !item.isSystem).length,
        [pendingIncidents],
    );

    const pendingSystemCount = useMemo(
        () => pendingIncidents.filter((item) => item.isSystem).length,
        [pendingIncidents],
    );

    const visiblePendingIncidents = useMemo(() => {
        if (pendingSourceFilter === "user") {
            return pendingIncidents.filter((item) => !item.isSystem);
        }
        if (pendingSourceFilter === "system") {
            return pendingIncidents.filter((item) => item.isSystem);
        }
        return pendingIncidents;
    }, [pendingIncidents, pendingSourceFilter]);

    const approvedIncidents = useMemo(
        () => filteredIncidents.filter((item) => item.incident.approved),
        [filteredIncidents],
    );

    const userIncidents = useMemo(
        () => approvedIncidents.filter((item) => !item.isSystem),
        [approvedIncidents],
    );

    const systemIncidents = useMemo(
        () => approvedIncidents.filter((item) => item.isSystem),
        [approvedIncidents],
    );

    const activeFilterCount =
        selectedSeverity.length +
        selectedStatus.length +
        (selectedCountyName !== "All Counties" ? 1 : 0) +
        (searchInput.trim() ? 1 : 0);

    const clearFilters = () => {
        setSearchInput("");
        setSelectedSeverity([]);
        setSelectedStatus([]);
        setSelectedCountyName("All Counties");
    };

    const exportFiltered = () => {
        exportIncidentCSV(filteredIncidents.map((item) => item.incident));
    };

    return (
        <div className="flex flex-col gap-4 p-4 pb-8 sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-semibold text-foreground">Incident Center</h1>
                    <p className="text-sm text-muted-foreground">
                        Sort by operational priority or chronology, then triage user and system streams independently.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={refetch}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Refresh
                    </button>
                    <button
                        onClick={exportFiltered}
                        disabled={filteredIncidents.length === 0}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Export CSV
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                    title="Loaded"
                    value={String(rawIncidents.length)}
                    subtitle="Fetched incidents"
                    icon={CalendarClock}
                />
                <MetricCard
                    title="User Stream"
                    value={String(userIncidents.length)}
                    subtitle="Approved incidents"
                    icon={ShieldAlert}
                />
                <MetricCard
                    title="System Alerts"
                    value={String(systemIncidents.length)}
                    subtitle="Automated/internal"
                    icon={Bot}
                />
                <MetricCard
                    title="Pending"
                    value={String(pendingIncidents.length)}
                    subtitle="Awaiting approval"
                    icon={AlertTriangle}
                />
            </section>

            <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search by title, type, or location"
                            aria-label="Search incidents"
                            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>

                    <div
                        className="inline-flex h-10 items-center rounded-lg border border-border bg-secondary p-1"
                        role="group"
                        aria-label="Sort incidents"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSortMode(option.value)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                                    sortMode === option.value
                                        ? "bg-blue-600 text-white"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div
                        className="inline-flex h-10 items-center rounded-lg border border-border bg-secondary p-1"
                        role="group"
                        aria-label="Select view mode"
                    >
                        {VIEW_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setViewMode(option.value)}
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                                        viewMode === option.value
                                            ? "bg-blue-600 text-white"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setShowFilters((open) => !open)}
                        aria-expanded={showFilters}
                        className={cn(
                            "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                            showFilters || activeFilterCount > 0
                                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <Filter className="h-4 w-4" aria-hidden="true" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Severity
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {SEVERITY_OPTIONS.map((severity) => {
                                    const active = selectedSeverity.includes(severity);
                                    return (
                                        <button
                                            key={severity}
                                            onClick={() => setSelectedSeverity((prev) => toggleValue(prev, severity))}
                                            className={cn(
                                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                                active
                                                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {severity}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Status
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((status) => {
                                    const active = selectedStatus.includes(status.value);
                                    return (
                                        <button
                                            key={status.value}
                                            onClick={() => setSelectedStatus((prev) => toggleValue(prev, status.value))}
                                            className={cn(
                                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                                active
                                                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {status.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="county-filter"
                                className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                                County
                            </label>
                            <select
                                id="county-filter"
                                value={selectedCountyName}
                                onChange={(event) => setSelectedCountyName(event.target.value)}
                                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                {counties.map((county) => (
                                    <option key={county.name} value={county.name}>
                                        {county.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </section>

            {error && rawIncidents.length > 0 && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {error && rawIncidents.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 py-16"
                    role="alert"
                    aria-live="assertive"
                >
                    <AlertTriangle className="mb-3 h-8 w-8 text-red-300" aria-hidden="true" />
                    <p className="text-sm text-red-200">{error}</p>
                    <button
                        onClick={refetch}
                        className="mt-4 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-200 transition-colors hover:bg-red-500/30"
                    >
                        Retry
                    </button>
                </div>
            ) : isLoading && rawIncidents.length === 0 ? (
                <LoadingState viewMode={viewMode} />
            ) : filteredIncidents.length === 0 ? (
                <EmptyResult hasFilters={activeFilterCount > 0} onClear={clearFilters} />
            ) : (
                <>
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as IncidentTab)}
                        className="gap-3"
                    >
                        <TabsList className="h-auto w-full flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5">
                            <TabsTrigger
                                value="pending"
                                className="justify-between rounded-lg px-3 py-1.5 text-sm"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Pending Alerts
                                </span>
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                    {pendingIncidents.length}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="user"
                                className="justify-between rounded-lg px-3 py-1.5 text-sm"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                                    User Generated
                                </span>
                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-200">
                                    {userIncidents.length}
                                </span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="system"
                                className="justify-between rounded-lg px-3 py-1.5 text-sm"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                                    System Alerts
                                </span>
                                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                                    {systemIncidents.length}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            <IncidentSection
                                title="Pending Alerts"
                                subtitle="Review and approve before these incidents enter operational streams"
                                icon={Clock3}
                                accent="warning"
                                count={pendingIncidents.length}
                                actions={
                                    <div className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-1">
                                        {(
                                            [
                                                { key: "all", label: `All ${pendingIncidents.length}` },
                                                { key: "user", label: `User ${pendingUserCount}` },
                                                { key: "system", label: `System ${pendingSystemCount}` },
                                            ] as const
                                        ).map((option) => (
                                            <button
                                                key={option.key}
                                                onClick={() => setPendingSourceFilter(option.key)}
                                                className={cn(
                                                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                                                    pendingSourceFilter === option.key
                                                        ? "bg-amber-500/25 text-amber-200"
                                                        : "text-amber-300/80 hover:text-amber-200",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                }
                            >
                                <IncidentDataView
                                    incidents={visiblePendingIncidents}
                                    viewMode={viewMode}
                                    emptyMessage="No pending incidents for this source filter."
                                    onSelect={(id) => onNavigate("incident", id)}
                                />
                            </IncidentSection>
                        </TabsContent>

                        <TabsContent value="user">
                            <IncidentSection
                                title="User Generated Incidents"
                                subtitle="Primary operational queue for approved field reports"
                                icon={ShieldAlert}
                                accent="primary"
                                count={userIncidents.length}
                            >
                                <IncidentDataView
                                    incidents={userIncidents}
                                    viewMode={viewMode}
                                    emptyMessage="No approved user-reported incidents match the current filters."
                                    onSelect={(id) => onNavigate("incident", id)}
                                />
                            </IncidentSection>
                        </TabsContent>

                        <TabsContent value="system">
                            <IncidentSection
                                title="System Alerts"
                                subtitle="Automated detections and internal-service alerts"
                                icon={Bot}
                                accent="neutral"
                                count={systemIncidents.length}
                            >
                                <IncidentDataView
                                    incidents={systemIncidents}
                                    viewMode={viewMode}
                                    emptyMessage="No system alerts match the current filters."
                                    onSelect={(id) => onNavigate("incident", id)}
                                />
                            </IncidentSection>
                        </TabsContent>
                    </Tabs>

                    <div ref={sentinelRef} className="h-2 w-full" />

                    <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                            Loaded {rawIncidents.length} incidents
                            {hasMore ? " - fetching continues while you scroll" : " - all available incidents loaded"}
                        </p>
                        <div className="flex items-center gap-2">
                            {isLoadingMore && (
                                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Loading more...
                                </span>
                            )}
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={isLoadingMore}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Load more
                                </button>
                            )}
                        </div>
                    </footer>
                </>
            )}
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: typeof CalendarClock;
}

function MetricCard({ title, value, subtitle, icon: Icon }: MetricCardProps) {
    return (
        <article className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </article>
    );
}

interface IncidentSectionProps {
    title: string;
    subtitle: string;
    icon: typeof ShieldAlert;
    accent: "primary" | "warning" | "neutral";
    count: number;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

function IncidentSection({
    title,
    subtitle,
    icon: Icon,
    accent,
    count,
    children,
    actions,
}: IncidentSectionProps) {
    const sectionTone =
        accent === "primary"
            ? {
                container: "border-blue-500/30 bg-blue-500/5",
                iconWrap: "bg-blue-500/15 text-blue-300",
                count: "bg-blue-500/20 text-blue-200",
            }
            : accent === "warning"
                ? {
                    container: "border-amber-500/30 bg-amber-500/5",
                    iconWrap: "bg-amber-500/15 text-amber-300",
                    count: "bg-amber-500/20 text-amber-200",
                }
                : {
                    container: "border-slate-500/30 bg-slate-500/5",
                    iconWrap: "bg-slate-500/15 text-slate-300",
                    count: "bg-slate-500/20 text-slate-200",
                };

    return (
        <section className={cn("rounded-2xl border", sectionTone.container)}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="flex items-start gap-3">
                    <span
                        className={cn(
                            "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg",
                            sectionTone.iconWrap,
                        )}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {actions}
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", sectionTone.count)}>
                        {count}
                    </span>
                </div>
            </header>

            <div className="p-4">{children}</div>
        </section>
    );
}

interface IncidentDataViewProps {
    incidents: IncidentViewModel[];
    viewMode: ViewMode;
    onSelect: (id: string) => void;
    emptyMessage: string;
}

function IncidentDataView({ incidents, viewMode, onSelect, emptyMessage }: IncidentDataViewProps) {
    if (incidents.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {emptyMessage}
            </div>
        );
    }

    if (viewMode === "cards") {
        return <IncidentCards incidents={incidents} onSelect={onSelect} />;
    }

    return <IncidentTable incidents={incidents} onSelect={onSelect} />;
}

interface IncidentTableProps {
    incidents: IncidentViewModel[];
    onSelect: (id: string) => void;
}

function IncidentTable({ incidents, onSelect }: IncidentTableProps) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[980px]">
                <thead>
                    <tr className="border-b border-border bg-secondary/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Incident</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Reported</th>
                    </tr>
                </thead>
                <tbody>
                    {incidents.map((item) => {
                        const Icon = getIncidentIcon(item.incident.type);
                        const priorityLabel = PRIORITY_LABEL[item.statusPriority] ?? PRIORITY_LABEL[3];
                        const statusLabel = getStatusLabel(item.normalizedStatus);

                        return (
                            <tr
                                key={item.incident.id}
                                tabIndex={0}
                                role="button"
                                onClick={() => onSelect(item.incident.id)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onSelect(item.incident.id);
                                    }
                                }}
                                className="cursor-pointer border-b border-border transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                <td className="px-4 py-3 align-top">
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                            PRIORITY_BADGE_CLASS[item.statusPriority] ?? PRIORITY_BADGE_CLASS[3],
                                        )}
                                    >
                                        {priorityLabel}
                                    </span>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <div className="flex items-start gap-2.5">
                                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-foreground">
                                                {item.incident.title || item.incident.type}
                                            </p>
                                            <p className="truncate font-mono-terminal text-[11px] text-muted-foreground">
                                                {item.incident.id}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <SeverityBadge severity={item.incident.severity} />
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                            STATUS_BADGE_CLASS[item.normalizedStatus] ??
                                            "border-border bg-muted text-muted-foreground",
                                        )}
                                    >
                                        {statusLabel}
                                    </span>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <span
                                        className={cn(
                                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                            item.isSystem
                                                ? "bg-slate-500/20 text-slate-300"
                                                : "bg-blue-500/20 text-blue-300",
                                        )}
                                    >
                                        {item.isSystem ? "System" : "User"}
                                    </span>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" aria-hidden="true" />
                                        <span className="max-w-[240px] truncate">
                                            {item.incident.location?.address || "Unknown location"}
                                        </span>
                                    </span>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-foreground">{formatTimeAgo(item.incident.created_at)}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatDateTime(item.incident.created_at)}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

interface IncidentCardsProps {
    incidents: IncidentViewModel[];
    onSelect: (id: string) => void;
}

function IncidentCards({ incidents, onSelect }: IncidentCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {incidents.map((item) => {
                const Icon = getIncidentIcon(item.incident.type);
                const priorityLabel = PRIORITY_LABEL[item.statusPriority] ?? PRIORITY_LABEL[3];
                const statusLabel = getStatusLabel(item.normalizedStatus);

                return (
                    <button
                        key={item.incident.id}
                        onClick={() => onSelect(item.incident.id)}
                        className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/60"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {item.incident.title || item.incident.type}
                                    </p>
                                    <p className="truncate font-mono-terminal text-[11px] text-muted-foreground">
                                        {item.incident.id}
                                    </p>
                                </div>
                            </div>

                            <span
                                className={cn(
                                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                    PRIORITY_BADGE_CLASS[item.statusPriority] ?? PRIORITY_BADGE_CLASS[3],
                                )}
                            >
                                {priorityLabel}
                            </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={item.incident.severity} />
                            <span
                                className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                    STATUS_BADGE_CLASS[item.normalizedStatus] ??
                                    "border-border bg-muted text-muted-foreground",
                                )}
                            >
                                {statusLabel}
                            </span>
                            <span
                                className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                    item.isSystem
                                        ? "bg-slate-500/20 text-slate-300"
                                        : "bg-blue-500/20 text-blue-300",
                                )}
                            >
                                {item.isSystem ? "System" : "User"}
                            </span>
                        </div>

                        {item.incident.description && (
                            <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                                {item.incident.description}
                            </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" aria-hidden="true" />
                                <span className="max-w-[190px] truncate">
                                    {item.incident.location?.address || "Unknown location"}
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3 w-3" aria-hidden="true" />
                                {formatTimeAgo(item.incident.created_at)}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function LoadingState({ viewMode }: { viewMode: ViewMode }) {
    if (viewMode === "cards") {
        return (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                        key={item}
                        className="h-44 animate-pulse rounded-xl border border-border bg-card"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                <div
                    key={item}
                    className="h-12 animate-pulse rounded-lg border border-border bg-secondary"
                />
            ))}
        </div>
    );
}

function EmptyResult({
    hasFilters,
    onClear,
}: {
    hasFilters: boolean;
    onClear: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
                {hasFilters
                    ? "No incidents match your active filters."
                    : "No incidents available right now."}
            </p>
            {hasFilters && (
                <button
                    onClick={onClear}
                    className="mt-4 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary/70"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}