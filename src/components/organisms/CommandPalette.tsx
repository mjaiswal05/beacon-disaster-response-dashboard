import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Bus,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  MapPin,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCommandPalette } from "../../contexts/CommandPaletteContext";
import { useTheme } from "../../contexts/ThemeContext";
import { authService } from "../../services/auth";
import { getIncidentsPaginated } from "../../services/core.api";
import { startConversation } from "../../services/supportBot";
import type { Incident } from "../../types/core.types";
import { backdropVariants, modalVariants } from "../../utils/animations";
import { cn } from "../ui/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  onLogIncident?: () => void;
  onShowShortcuts?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  keywords: string;
}

// ── Severity colours ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  P0: "#EF4444",
  P1: "#F97316",
  P2: "#EAB308",
  P3: "#3B82F6",
};

const STATUS_COLORS: Record<string, string> = {
  reported: "text-orange-400",
  verified: "text-blue-400",
  active: "text-orange-400",
  resolved: "text-green-400",
  closed: "text-gray-500",
};

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />,
    keywords: "dashboard home overview ert",
  },
  {
    label: "Incidents",
    path: "/incidents",
    icon: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
    keywords: "incidents alerts emergencies all",
  },
  {
    label: "Communication",
    path: "/communication",
    icon: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
    keywords: "communication chat messages channels",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
    keywords: "analytics charts reports statistics data",
  },
  {
    label: "Transport",
    path: "/transport",
    icon: <Bus className="w-4 h-4" aria-hidden="true" />,
    keywords: "transport vehicles buses trains luas traffic",
  },
  {
    label: "ERT Management",
    path: "/ert-management",
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    keywords: "ert management team members responders",
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: <Bell className="w-4 h-4" aria-hidden="true" />,
    keywords: "notifications alerts badge",
  },
  {
    label: "Profile & Settings",
    path: "/profile",
    icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    keywords: "profile settings account user preferences",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette({ onLogIncident, onShowShortcuts }: CommandPaletteProps) {
  const { isOpen, close } = useCommandPalette();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [botResponse, setBotResponse] = useState<string | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  const [incidentResults, setIncidentResults] = useState<Incident[]>([]);
  const [incidentTotal, setIncidentTotal] = useState(0);
  const [incidentLoading, setIncidentLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Derived
  const trimmed = query.trim();
  const isBotQuery = trimmed.startsWith("@bot ");
  const botPrompt = isBotQuery ? trimmed.slice(5) : "";
  const hasQuery = trimmed.length > 0 && !isBotQuery;

  // Filter nav items by query
  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!query || isBotQuery) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q)
    );
  });

  // Reset state when palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setBotResponse(null);
      setBotError(null);
      setBotLoading(false);
      setIncidentResults([]);
      setIncidentTotal(0);
      setIncidentLoading(false);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Debounced incident search
  useEffect(() => {
    if (trimmed.length === 0 || isBotQuery) {
      setIncidentResults([]);
      setIncidentTotal(0);
      setIncidentLoading(false);
      return;
    }
    setIncidentLoading(true);
    const timerId = setTimeout(async () => {
      try {
        const result = await getIncidentsPaginated({
          search: trimmed,
          page_size: 5,
          status: "reported",
          sort_by: "created_at",
          sort_order: "desc",
        });
        setIncidentResults(result.incidents);
        setIncidentTotal(result.total_count);
      } catch {
        setIncidentResults([]);
        setIncidentTotal(0);
      } finally {
        setIncidentLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerId);
  }, [trimmed, isBotQuery]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  const handleAskBot = useCallback(async () => {
    if (!botPrompt.trim() || botLoading) return;
    setBotResponse(null);
    setBotError(null);
    setBotLoading(true);
    try {
      const userId = authService.getCurrentUser()?.id ?? "anonymous";
      const msg = await startConversation(userId, botPrompt.trim());
      const responseText = msg.requires_escalation
        ? `${msg.response}\n\n📋 Resources: ${msg.suggested_resources.join(" | ")}`
        : msg.response;
      setBotResponse(responseText);
    } catch {
      setBotError("Failed to get a response. Please try again.");
    } finally {
      setBotLoading(false);
    }
  }, [botPrompt, botLoading]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isBotQuery && e.key === "Enter" && botPrompt.trim()) {
        e.preventDefault();
        handleAskBot();
      }
    },
    [isBotQuery, botPrompt, handleAskBot],
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      close();
    },
    [navigate, close],
  );

  const handleIncidentSelect = useCallback(
    (id: string) => {
      navigate(`/incidents/${id}`);
      close();
    },
    [navigate, close],
  );

  const handleSeeAllIncidents = useCallback(() => {
    navigate(`/incidents?search=${encodeURIComponent(trimmed)}`);
    close();
  }, [navigate, close, trimmed]);

  const handleLogIncident = useCallback(() => {
    onLogIncident?.();
    close();
  }, [onLogIncident, close]);

  const handleShowShortcuts = useCallback(() => {
    onShowShortcuts?.();
    close();
  }, [onShowShortcuts, close]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    close();
  }, [toggleTheme, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[99999999] bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-[999999999] flex items-start justify-center pt-[15vh] pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <motion.div
              key="palette-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "w-[600px] max-h-[500px] pointer-events-auto",
                "bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl",
                "flex flex-col overflow-hidden",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Command
                className="flex flex-col h-full bg-transparent"
                shouldFilter={false}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 shrink-0">
                  <CommandInput
                    ref={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search incidents, jump to page… or type @bot …"
                    className={cn(
                      "flex-1 bg-transparent text-white placeholder:text-gray-500",
                      "text-sm outline-none border-none focus:ring-0 min-w-0",
                    )}
                    aria-label="Command search"
                  />
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700 select-none shrink-0">
                    ESC
                  </kbd>
                </div>

                {/* @bot panel */}
                {isBotQuery && (
                  <div className="px-4 py-3 border-b border-gray-800 shrink-0 overflow-y-auto max-h-[380px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-blue-400" aria-hidden="true" />
                      <span className="text-sm font-semibold text-white">Beacon AI</span>
                    </div>

                    {botPrompt && (
                      <p className="text-xs text-gray-400 mb-3 italic">
                        &ldquo;{botPrompt}&rdquo;
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleAskBot}
                      disabled={!botPrompt.trim() || botLoading}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                        "bg-blue-600 text-white transition-colors",
                        "hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
                      )}
                    >
                      {botLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      Ask Beacon AI
                    </button>

                    {botLoading && (
                      <div
                        className="flex items-center gap-1.5 mt-3"
                        role="status"
                        aria-live="polite"
                        aria-label="Loading response"
                      >
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    )}

                    {botResponse && !botLoading && (
                      <div
                        className="mt-3 pt-3 border-t border-gray-800"
                        role="status"
                        aria-live="polite"
                      >
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
                          Response
                        </p>
                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {botResponse}
                        </p>
                      </div>
                    )}

                    {botError && !botLoading && (
                      <div
                        className="mt-3 pt-3 border-t border-gray-800"
                        role="alert"
                        aria-live="assertive"
                      >
                        <p className="text-sm text-red-400">{botError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Command list - hidden in @bot mode */}
                {!isBotQuery && (
                  <CommandList className="overflow-y-auto flex-1 py-2">

                    {/* ── Incident search results ─────────────────────── */}
                    {hasQuery && (
                      <CommandGroup
                        heading="Incidents"
                        className={cn(
                          "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5",
                          "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                          "[&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
                        )}
                      >
                        {/* Loading */}
                        {incidentLoading && (
                          <div className="flex items-center gap-2.5 px-4 py-2.5 mx-1" role="status" aria-label="Searching incidents">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-gray-500">Searching incidents…</span>
                          </div>
                        )}

                        {/* Results */}
                        {!incidentLoading && incidentResults.map((incident) => (
                          <CommandItem
                            key={incident.id}
                            value={`incident-${incident.id}`}
                            onSelect={() => handleIncidentSelect(incident.id)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                              "text-gray-300 transition-colors outline-none",
                              "aria-selected:bg-gray-800 aria-selected:text-white",
                              "hover:bg-gray-800 hover:text-white",
                            )}
                          >
                            {/* Severity dot */}
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: SEVERITY_COLORS[incident.severity] ?? "#6B7280" }}
                              aria-label={incident.severity}
                            />
                            {/* Title */}
                            <span className="flex-1 text-sm truncate min-w-0">
                              {incident.title || incident.type}
                            </span>
                            {/* Location */}
                            {incident.location.address && (
                              <span className="hidden sm:flex items-center gap-1 text-xs text-gray-600 truncate max-w-[140px] shrink-0">
                                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{incident.location.address}</span>
                              </span>
                            )}
                            {/* Status */}
                            <span className={cn("text-xs capitalize shrink-0", STATUS_COLORS[incident.status] ?? "text-gray-500")}>
                              {incident.status}
                            </span>
                          </CommandItem>
                        ))}

                        {/* Empty */}
                        {!incidentLoading && incidentResults.length === 0 && (
                          <div className="px-4 py-2.5 mx-1 text-sm text-gray-500" role="status">
                            No incidents match &ldquo;{trimmed}&rdquo;
                          </div>
                        )}

                        {/* See all */}
                        {!incidentLoading && incidentTotal > 5 && (
                          <CommandItem
                            value="see-all-incidents"
                            onSelect={handleSeeAllIncidents}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                              "transition-colors outline-none",
                              "aria-selected:bg-gray-800",
                              "hover:bg-gray-800",
                            )}
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-blue-400">
                              See all {incidentTotal} results for &ldquo;{trimmed}&rdquo;
                            </span>
                          </CommandItem>
                        )}
                      </CommandGroup>
                    )}

                    {hasQuery && (incidentResults.length > 0 || filteredNav.length > 0) && (
                      <CommandSeparator className="my-1 h-px bg-gray-800 mx-3" />
                    )}

                    {/* ── Navigation ─────────────────────────────────── */}
                    {filteredNav.length > 0 && (
                      <CommandGroup
                        heading="Navigation"
                        className={cn(
                          "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5",
                          "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                          "[&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
                        )}
                      >
                        {filteredNav.map((item) => (
                          <CommandItem
                            key={item.path}
                            value={`nav-${item.path}`}
                            onSelect={() => handleNavigate(item.path)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                              "text-gray-300 transition-colors outline-none",
                              "aria-selected:bg-gray-800 aria-selected:text-white",
                              "hover:bg-gray-800 hover:text-white",
                            )}
                          >
                            <span className="text-gray-400 shrink-0">{item.icon}</span>
                            <span className="flex-1 text-sm">{item.label}</span>
                            <span className="text-xs text-gray-600 font-mono">{item.path}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {filteredNav.length > 0 && (
                      <CommandSeparator className="my-1 h-px bg-gray-800 mx-3" />
                    )}

                    {/* ── Quick Actions ───────────────────────────────── */}
                    <CommandGroup
                      heading="Quick Actions"
                      className={cn(
                        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5",
                        "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold",
                        "[&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
                      )}
                    >
                      <CommandItem
                        value="action-log-incident"
                        onSelect={handleLogIncident}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                          "text-gray-300 transition-colors outline-none",
                          "aria-selected:bg-gray-800 aria-selected:text-white",
                          "hover:bg-gray-800 hover:text-white",
                        )}
                      >
                        <span className="text-gray-400 shrink-0">
                          <Plus className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-sm">Log New Incident</span>
                        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-500 border border-gray-700 select-none">
                          N
                        </kbd>
                      </CommandItem>

                      <CommandItem
                        value="action-keyboard-shortcuts"
                        onSelect={handleShowShortcuts}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                          "text-gray-300 transition-colors outline-none",
                          "aria-selected:bg-gray-800 aria-selected:text-white",
                          "hover:bg-gray-800 hover:text-white",
                        )}
                      >
                        <span className="text-gray-400 shrink-0">
                          <HelpCircle className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="flex-1 text-sm">Show Keyboard Shortcuts</span>
                        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-500 border border-gray-700 select-none">
                          ?
                        </kbd>
                      </CommandItem>

                      <CommandItem
                        value="action-toggle-theme"
                        onSelect={handleToggleTheme}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer",
                          "text-gray-300 transition-colors outline-none",
                          "aria-selected:bg-gray-800 aria-selected:text-white",
                          "hover:bg-gray-800 hover:text-white",
                        )}
                      >
                        <span className="text-gray-400 shrink-0">
                          {theme === "dark" ? (
                            <Sun className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Moon className="w-4 h-4" aria-hidden="true" />
                          )}
                        </span>
                        <span className="flex-1 text-sm">
                          {theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                        </span>
                      </CommandItem>
                    </CommandGroup>

                    {/* Empty state — only when nothing at all matches */}
                    {filteredNav.length === 0 && incidentResults.length === 0 && !incidentLoading && query && (
                      <div className="py-8 text-center text-sm text-gray-500">
                        No results for &ldquo;{query}&rdquo;
                      </div>
                    )}
                  </CommandList>
                )}
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
