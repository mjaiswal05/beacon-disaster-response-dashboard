import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Users,
  FileCog,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface AppSidebarProps {
  isOpen: boolean;
}

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  requiredRoles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Incidents", icon: AlertTriangle, to: "/incidents" },
  { label: "Communication", icon: MessageSquare, to: "/communication" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  {
    label: "ERT Management",
    icon: Users,
    to: "/ert-management",
    requiredRoles: ["admin", "ert"],
  },
  {
    label: "Templates",
    icon: FileCog,
    to: "/templates",
    requiredRoles: ["admin"],
  },
];

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const { isSysAdmin, isERTMember } = useAuth();

  const hasRole = (item: NavItem) => {
    if (!item.requiredRoles) return true;
    if (item.requiredRoles.includes("admin") && isSysAdmin) return true;
    if (item.requiredRoles.includes("ert") && isERTMember) return true;
    return false;
  };

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-0"
      } bg-card border-r border-border transition-all duration-300 overflow-hidden flex-shrink-0`}
    >
      <div className="p-6 border-b border-border">
        <h2 className="text-blue-400 flex items-center gap-2 text-lg font-semibold">
          <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
          Beacon ERT
        </h2>
      </div>

      <nav className="p-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.filter(hasRole).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
