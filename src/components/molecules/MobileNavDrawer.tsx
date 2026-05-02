import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bus,
  FileCog,
  HardDrive,
  LayoutDashboard,
  MessageSquare,
  Rss,
  Settings,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { backdropVariants } from "../../utils/animations";
import { BeaconLogo } from "../atoms/BeaconLogo";
import { cn } from "../ui/utils";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isSysAdmin: boolean;
  isERTMember: boolean;
}

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, adminOnly: false },
  { to: "/incidents", icon: AlertTriangle, label: "Incidents", end: false, adminOnly: false },
  { to: "/communication", icon: MessageSquare, label: "Communication", end: false, adminOnly: false },
  { to: "/analytics", icon: BarChart3, label: "Analytics", end: false, adminOnly: false },
  { to: "/transport", icon: Bus, label: "Transport", end: false, adminOnly: false },
  { to: "/vault", icon: HardDrive, label: "Vault", end: false, adminOnly: false },
  { to: "/socials", icon: Rss, label: "Socials", end: false, adminOnly: false },
  { to: "/templates", icon: FileCog, label: "Templates", end: false, adminOnly: true },
  { to: "/notifications", icon: Bell, label: "Notifications", end: false, adminOnly: false },
  { to: "/profile", icon: Settings, label: "Settings", end: false, adminOnly: false },
];

export function MobileNavDrawer({
  isOpen,
  onClose,
  isSysAdmin,
  isERTMember,
}: MobileNavDrawerProps) {
  const showERT = isSysAdmin || isERTMember;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mobile-nav-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            key="mobile-nav-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col lg:hidden"
            style={{
              background: "var(--sidebar)",
              borderRight: "1px solid var(--sidebar-border)",
            }}
            aria-label="Mobile navigation"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--sidebar-border)" }}
            >
              <div className="flex items-center gap-3">
                <BeaconLogo />
                <span className="text-foreground font-semibold text-sm">Beacon</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-800"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Main navigation">
              {NAV_ITEMS.filter((item) => !item.adminOnly || isSysAdmin).map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white",
                    )
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}

              {showERT && (
                <NavLink
                  to="/ert-management"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white",
                    )
                  }
                >
                  <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
                  ERT Management
                </NavLink>
              )}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
