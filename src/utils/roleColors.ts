const ROLE_COLORS: Record<string, string> = {
  admin:        "text-amber-400",
  sysadmin:     "text-amber-400",
  ert_member:   "text-red-400",
  ground_staff: "text-blue-400",
  citizen:      "text-gray-400",
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role?.toLowerCase()] ?? "text-gray-400";
}

export function getRoleBadge(role: string): string {
  const labels: Record<string, string> = {
    admin: "Admin", sysadmin: "Admin",
    ert_member: "ERT", ground_staff: "Staff", citizen: "Citizen",
  };
  return labels[role?.toLowerCase()] ?? role;
}
