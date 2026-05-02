import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bus,
  ChevronDown,
  FileCog,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Rss,
  Search,
  Settings,
  Users
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCommandPalette } from "../../contexts/CommandPaletteContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useNewIncidentAlert } from "../../hooks/useNewIncidentAlert";
import { useNotificationSocket } from "../../hooks/useNotificationSocket";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import { useWebPush } from "../../hooks/useWebPush";
import { createIncident } from "../../services/core.api";
import type { AuthUser } from "../../types/auth.types";
import type { Incident } from "../../types/core.types";
import { spring, springGentle, springSnappy } from "../../utils/animations";
import { BeaconLogo } from "../atoms/BeaconLogo";
import { KeyboardShortcutBadge } from "../atoms/KeyboardShortcutBadge";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { OfflineBanner } from "../atoms/OfflineBanner";
import { MobileNavDrawer } from "../molecules/MobileNavDrawer";
import { AIChatWidget } from "../organisms/AIChatWidget";
import { CommandPalette } from "../organisms/CommandPalette";
import {
  CreateIncidentModal,
  type CreateIncidentData,
} from "../organisms/CreateIncidentModal";
import { IncidentAlertModal } from "../organisms/IncidentAlertModal";
import { KeyboardShortcutsDialog } from "../organisms/KeyboardShortcutsDialog";
import { SessionTimeoutWarning } from "../organisms/SessionTimeoutWarning";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", adminOnly: false },
  { to: "/incidents", icon: AlertTriangle, label: "Incidents", adminOnly: false },
  { to: "/communication", icon: MessageSquare, label: "Communication", adminOnly: false },
  { to: "/analytics", icon: BarChart3, label: "Analytics", adminOnly: false },
  { to: "/transport", icon: Bus, label: "Transport", adminOnly: false },
  { to: "/vault", icon: HardDrive, label: "Vault", adminOnly: false },
  { to: "/socials", icon: Rss, label: "Socials", adminOnly: false },
  { to: "/templates", icon: FileCog, label: "Templates", adminOnly: true },
];

function getUserInitials(user: AuthUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.username.slice(0, 2).toUpperCase();
}

export function DashboardLayout() {
  const [isLogIncidentModalOpen, setIsLogIncidentModalOpen] = useState(false);
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [alertQueue, setAlertQueue] = useState<Incident[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    user,
    isAuthenticated,
    isInitializing,
    logout,
    isSysAdmin,
    isERTMember,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open: openPalette } = useCommandPalette();
  const navigate = useNavigate();
  const location = useLocation();

  const isOnline = useOnlineStatus();

  // Session idle timeout - 30 min idle warning, 5 min then auto-logout
  const handleSessionLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const { showWarning: showSessionWarning, secondsRemaining, resetTimeout } =
    useSessionTimeout(handleSessionLogout);

  // New incident alerts - poll every 15s, alert on P0/P1
  const handleNewIncident = useCallback(
    (incident: Incident) => {
      setAlertQueue((q) => [...q, incident]);
      // Increment badge unless user is on notifications page
      if (!location.pathname.startsWith("/notifications")) {
        setUnreadCount((c) => c + 1);
      }
    },
    [location.pathname],
  );

  useNewIncidentAlert(handleNewIncident);

  // Real-time notification WebSocket + web push for authenticated users
  const activeChannelId =
    location.pathname.startsWith('/communication') && location.search.includes('channel=')
      ? new URLSearchParams(location.search).get('channel') ?? undefined
      : undefined;
  useNotificationSocket(user?.id, activeChannelId);
  useWebPush(user?.id);

  const handleDismissAlert = useCallback((id: string) => {
    setAlertQueue((q) => q.filter((a) => a.id !== id));
  }, []);

  // Clear badge when visiting notifications
  const effectiveUnread =
    location.pathname.startsWith("/notifications") ? 0 : unreadCount;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onOpenPalette: openPalette,
    onOpenLogIncident: () => setIsLogIncidentModalOpen(true),
    onOpenShortcutsDialog: () => setIsShortcutsDialogOpen(true),
    navigate,
  });

  const handleSubmitIncident = useCallback(async (data: CreateIncidentData): Promise<string> => {
    const payload = {
      title: data.title,
      type: data.type,
      severity: data.severity,
      description: data.description,
      affected_radius: 50,
      location: {
        address: data.location.address,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      },
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    const result = await createIncident(payload, controller.signal);
    clearTimeout(timeoutId);
    const raw = result?.success ? result.data : result;
    const incidentId = raw?.id ?? raw?.incident_id ?? "";
    if (incidentId) {
      navigate(`/incidents/${incidentId}`);
    }
    return incidentId;
  }, [navigate]);

  if (isInitializing) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <LoadingSpinner label="Initializing Beacon System…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials = user ? getUserInitials(user) : "??";

  // ── Nav item renderer ─────────────────────────────────────────────────────
  function NavItem({
    isActive,
    icon: Icon,
    label,
  }: {
    isActive: boolean;
    icon: typeof LayoutDashboard;
    label: string;
  }) {
    return (
      <div className="relative flex items-center">
        {/* Active indicator bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="nav-active-bar"
              className="absolute -left-4 w-[3px] h-7 rounded-r-full"
              style={{
                background: "linear-gradient(to bottom, #3b82f6, #2563EB)",
                boxShadow: "0 0 12px rgba(37,99,235,0.7), 0 0 4px rgba(37,99,235,0.4)",
              }}
              initial={{ opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.3 }}
              transition={spring}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <motion.div
          className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.90 }}
          transition={spring}
        >
          {/* Active bg */}
          {isActive && (
            <motion.div
              layoutId="nav-active-bg"
              className="absolute inset-0 rounded-xl"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.08))" }}
              transition={spring}
            />
          )}
          {/* Hover bg (only when not active) */}
          {!isActive && (
            <motion.div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          )}
          <Icon
            className="w-[18px] h-[18px] relative z-10 transition-all duration-200"
            style={{
              color: isActive ? "#4A90E2" : "rgba(255,255,255,0.35)",
              filter: isActive ? "drop-shadow(0 0 8px rgba(37,99,235,0.5))" : "none",
            }}
            strokeWidth={isActive ? 2 : 1.5}
            aria-hidden="true"
          />
        </motion.div>

        {/* Slide-in tooltip */}
        <div
          className="absolute left-14 px-3 py-1.5 rounded-lg text-xs pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
          style={{
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.85)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            transition: "opacity 150ms ease, transform 150ms ease",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
          role="tooltip"
        >
          {label}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ── Desktop Sidebar ───────────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-[72px] h-full flex-col items-center py-5 shrink-0 relative"
        style={{
          background: "linear-gradient(180deg, #0C0C0C 0%, #080808 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "1px 0 0 0 rgba(255,255,255,0.03), 4px 0 24px rgba(0,0,0,0.4)",
        }}
        aria-label="Application sidebar"
      >
        {/* Subtle inner highlight on left edge */}
        <div className="absolute left-0 top-16 bottom-16 w-px pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent)" }} />

        {/* Logo */}
        <motion.button
          onClick={() => navigate("/")}
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-8 shrink-0 relative"
          style={{ background: "transparent" }}
          whileHover={{
            scale: 1.12,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          whileTap={{ scale: 0.88 }}
          transition={springSnappy}
          aria-label="Go to dashboard"
        >
          <BeaconLogo />
        </motion.button>

        <nav
          className="flex-1 flex flex-col items-center gap-0.5"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.filter((item) => !item.adminOnly || isSysAdmin).map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="relative group"
            >
              {({ isActive }) => (
                <NavItem isActive={isActive} icon={icon} label={label} />
              )}
            </NavLink>
          ))}

          {(isSysAdmin || isERTMember) && (
            <NavLink to="/ert-management" className="relative group">
              {({ isActive }) => (
                <NavItem isActive={isActive} icon={Users} label="ERT Management" />
              )}
            </NavLink>
          )}
        </nav>

        {/* Separator */}
        <div className="w-8 h-px mb-2" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)" }} />

        <div className="flex flex-col items-center gap-0.5">
          <NavLink to="/profile" className="relative group">
            {({ isActive }) => (
              <NavItem isActive={isActive} icon={Settings} label="Settings" />
            )}
          </NavLink>

          <motion.button
            onClick={handleLogout}
            className="relative group w-10 h-10 rounded-xl flex items-center justify-center"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            aria-label="Log out"
            style={{ background: "transparent" }}
          >
            <motion.div
              className="absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              style={{ background: "rgba(255,69,58,0.08)" }}
            />
            <LogOut
              className="w-[18px] h-[18px] relative z-10 transition-colors duration-150"
              style={{ color: "var(--muted-foreground)" }}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div
              className="absolute left-14 px-2.5 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0"
              style={{
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--foreground)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                transitionDuration: "150ms",
              }}
              role="tooltip"
            >
              Log out
            </div>
          </motion.button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 lg:px-6 shrink-0"
          style={{
            background: "var(--topbar-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{ color: "var(--muted-foreground)" }}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div
              aria-hidden="true"
            >
              <BeaconLogo />
            </div>
          </div>

          {/* Search - opens command palette */}
          <button
            onClick={openPalette}
            className="hidden sm:flex items-center gap-2 h-9 px-3.5 rounded-full transition-colors"
            style={{
              background: "var(--background)",
              border: "1px solid var(--secondary)",
              minWidth: 220,
            }}
            aria-label="Open command palette"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "var(--muted-foreground)" }}
              aria-hidden="true"
            />
            <span
              className="text-[13px] flex-1 text-left"
              style={{ color: "var(--muted-foreground)" }}
            >
              Search incidents, jump to page…
            </span>
            <KeyboardShortcutBadge keys="⌘ K" />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Notification bell with unread badge */}
            <motion.button
              onClick={() => {
                setUnreadCount(0);
                navigate("/notifications");
              }}
              className="relative w-9 h-9 rounded-[10px] flex items-center justify-center"
              whileHover={{ scale: 1.08, backgroundColor: "var(--card)" }}
              whileTap={{ scale: 0.93 }}
              transition={spring}
              aria-label={
                effectiveUnread > 0
                  ? `View notifications - ${effectiveUnread} unread`
                  : "View notifications"
              }
            >
              <Bell
                className="w-[18px] h-[18px]"
                style={{ color: "var(--muted-foreground)" }}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {effectiveUnread > 0 ? (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {effectiveUnread > 9 ? "9+" : effectiveUnread}
                </span>
              ) : (
                <motion.span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{
                    background: "#FF453A",
                    boxShadow: "0 0 6px rgba(255, 69, 58, 0.5)",
                  }}
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{
                    repeat: Infinity,
                    repeatDelay: 4,
                    duration: 0.38,
                    ease: "easeInOut",
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.button>

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  className="flex items-center gap-2 px-2 py-1 rounded-[10px]"
                  whileHover={{ scale: 1.02, backgroundColor: "var(--card)" }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  aria-label="User menu"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #9333EA)",
                    }}
                  >
                    <span
                      className="text-white font-semibold"
                      style={{ fontSize: "11px" }}
                    >
                      {initials}
                    </span>
                  </div>
                  <ChevronDown
                    className="w-3 h-3 hidden sm:block"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-hidden="true"
                  />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-400 focus:text-red-400"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Log Incident CTA */}
            <motion.button
              onClick={() => setIsLogIncidentModalOpen(true)}
              className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-[10px] text-white text-[13px] font-semibold"
              style={{
                background: "#FF453A",
                boxShadow: "0 0 20px rgba(255, 69, 58, 0.2), 0 2px 8px rgba(0,0,0,0.3)",
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 32px rgba(255, 69, 58, 0.40), 0 2px 12px rgba(0,0,0,0.4)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Log Incident</span>
            </motion.button>
          </div>
        </header>

        {/* Offline banner */}
        {!isOnline && <OfflineBanner />}

        {/* Page content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={springGentle}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* AI Terminal */}
          <AIChatWidget />
        </main>
      </div>

      {/* ── Overlays & Modals ─────────────────────────────────────── */}

      {/* Command Palette */}
      <CommandPalette
        onLogIncident={() => setIsLogIncidentModalOpen(true)}
        onShowShortcuts={() => setIsShortcutsDialogOpen(true)}
      />

      {/* Mobile Nav Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isSysAdmin={isSysAdmin}
        isERTMember={isERTMember}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        onClose={() => setIsShortcutsDialogOpen(false)}
      />

      {/* New Incident Alert Queue */}
      <IncidentAlertModal queue={alertQueue} onDismiss={handleDismissAlert} />

      {/* Session Timeout Warning */}
      <AnimatePresence>
        {showSessionWarning && (
          <SessionTimeoutWarning
            secondsRemaining={secondsRemaining}
            onStayLoggedIn={resetTimeout}
            onLogout={handleSessionLogout}
          />
        )}
      </AnimatePresence>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isLogIncidentModalOpen}
        onClose={() => setIsLogIncidentModalOpen(false)}
        onSubmit={handleSubmitIncident}
      />
    </div>
  );
}
