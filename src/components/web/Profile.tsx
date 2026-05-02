import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { fadeUp, staggerContainer } from "../../utils/animations";
import {
  User,
  Mail,
  Phone,
  Lock,
  Activity,
  Eye,
  EyeOff,
  Save,
  Monitor,
  CheckCircle2,
  Globe,
  Trash2,
  Loader2,
  Smartphone,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  useMyProfile,
  useUpdateProfile,
  useChangePassword,
  useMySessions,
  useMyDevices,
  useRevokeSession,
  useMyActivity,
} from "../../hooks/useProfile";
import { formatTimeAgo, formatTimestamp } from "../../utils/date.utils";

interface ProfileProps {
  onBack: () => void;
}

type Tab = "profile" | "security" | "sessions" | "activity";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "sessions", label: "Sessions & Devices", icon: Monitor },
];

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ROLE_SYS_ADMIN: "Admin",
    admin: "Admin",
    ROLE_ERT_MEMBER: "ERT Member",
    ROLE_ERT_MEMBERS: "ERT Member",
    ert_member: "ERT Member",
  };
  return map[role] ?? role;
}

// ── Password field ───────────────────────────────────────────
function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-2"
        style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <div className="relative">
        <Lock
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--muted-foreground)" }}
          aria-hidden="true"
        />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 pl-11 pr-11 rounded-[12px] text-white focus:outline-none transition-all"
          style={{
            background: "var(--background)",
            border: "1px solid var(--secondary)",
            fontSize: "14px",
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <EyeOff
              className="w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
            />
          ) : (
            <Eye
              className="w-4 h-4"
              style={{ color: "var(--muted-foreground)" }}
            />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Parse user agent into short label ────────────────────────
function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown";
  const browser =
    ua.match(/Chrome\/[\d.]+/)?.[0] ??
    ua.match(/Firefox\/[\d.]+/)?.[0] ??
    ua.match(/Safari\/[\d.]+/)?.[0] ??
    "Browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac")
      ? "macOS"
      : ua.includes("Linux")
        ? "Linux"
        : ua.includes("Android")
          ? "Android"
          : ua.includes("iPhone")
            ? "iOS"
            : "OS";
  return `${browser} on ${os}`;
}

// ── Main component ───────────────────────────────────────────
export function Profile({ onBack: _onBack }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Profile data ───────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  // ── Form state (local edits before save) ───────────────
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [phoneEdit, setPhoneEdit] = useState<string | null>(null);

  const displayName = nameEdit ?? profile?.name ?? "";
  const displayPhone = phoneEdit ?? profile?.phone_number ?? "";

  // ── Security state ─────────────────────────────────────
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    newPw: "",
    confirm: "",
  });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const changePasswordMutation = useChangePassword();

  // ── Sessions & Devices ─────────────────────────────────
  const { data: sessions, isLoading: sessionsLoading } = useMySessions();
  const { data: devices, isLoading: devicesLoading } = useMyDevices();
  const revokeSessionMutation = useRevokeSession();

  // ── Activity ───────────────────────────────────────────
  const { data: activity, isLoading: activityLoading } = useMyActivity();

  // ── Derived display values ─────────────────────────────
  const nameParts = displayName.split(" ");
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase() || "??";

  // ── Handlers ───────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { name?: string; phone_number?: string } = {};
    if (nameEdit !== null) payload.name = nameEdit;
    if (phoneEdit !== null) payload.phone_number = phoneEdit;
    if (Object.keys(payload).length === 0) return;

    updateProfile.mutate(payload, {
      onSuccess: () => {
        setNameEdit(null);
        setPhoneEdit(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      },
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (passwords.newPw !== passwords.confirm) {
      setPwError("Passwords don't match");
      return;
    }
    if (passwords.newPw.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }

    changePasswordMutation.mutate(
      {
        current_password: passwords.current,
        new_password: passwords.newPw,
      },
      {
        onSuccess: () => {
          setPasswords({ current: "", newPw: "", confirm: "" });
          setPwSuccess(true);
          setTimeout(() => setPwSuccess(false), 5000);
        },
        onError: (err: any) => {
          setPwError(err?.message ?? "Failed to change password");
        },
      },
    );
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <motion.div
      className="p-6 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1
          className="text-white"
          style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2 }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--muted-foreground)",
            marginTop: "4px",
          }}
        >
          Manage your account settings and preferences
        </p>
      </motion.div>

      <div className="flex gap-6">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <div
          className="w-64 shrink-0 rounded-[16px] p-2"
          style={{
            background: "var(--card)",
            border: "1px solid var(--secondary)",
            height: "fit-content",
          }}
        >
          {/* User card */}
          <div className="p-4 mb-2">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #2563EB, #9333EA)",
                }}
                aria-hidden="true"
              >
                <span
                  className="text-white"
                  style={{ fontSize: "16px", fontWeight: 600 }}
                >
                  {initials}
                </span>
              </div>
              <div>
                <div
                  className="text-white"
                  style={{ fontSize: "15px", fontWeight: 600 }}
                >
                  {profileLoading ? "Loading..." : displayName || "User"}
                </div>
                <div
                  style={{ fontSize: "12px", color: "var(--muted-foreground)" }}
                >
                  {roleLabel(profile?.role ?? "")}
                </div>
              </div>
            </div>
            <div
              className="px-2.5 py-1.5 rounded-[8px] flex items-center justify-center gap-1.5"
              style={{
                background: "var(--background)",
                border: "1px solid var(--secondary)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#32D74B", boxShadow: "0 0 6px #32D74B" }}
                aria-hidden="true"
              />
              <span
                style={{ fontSize: "12px", color: "#32D74B", fontWeight: 500 }}
              >
                {profile?.status === "ACTIVE" ? "Active" : (profile?.status ?? "Active")}
              </span>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="space-y-0.5" aria-label="Settings sections">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all cursor-pointer"
                  style={{
                    background: isActive
                      ? "rgba(37,99,235,0.1)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(37,99,235,0.2)"
                      : "1px solid transparent",
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{
                      color: isActive ? "#2563EB" : "var(--muted-foreground)",
                    }}
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#2563EB" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* ─ Profile Tab ─────────────────────────────────── */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                className="rounded-[16px] p-6"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--secondary)",
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <h2
                  className="text-white mb-1"
                  style={{ fontSize: "20px", fontWeight: 600 }}
                >
                  Profile Information
                </h2>
                <p
                  className="mb-6"
                  style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                >
                  Update your personal information and contact details
                </p>

                {profileLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="prof_name"
                        className="block mb-2"
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-hidden="true"
                        />
                        <input
                          id="prof_name"
                          type="text"
                          value={displayName}
                          onChange={(e) => setNameEdit(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-[12px] text-white focus:outline-none placeholder-[#4a4a52] transition-all"
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--secondary)",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Email (read-only) */}
                    <div>
                      <label
                        htmlFor="prof_email"
                        className="block mb-2"
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-hidden="true"
                        />
                        <input
                          id="prof_email"
                          type="email"
                          value={profile?.email ?? ""}
                          readOnly
                          className="w-full h-11 pl-11 pr-4 rounded-[12px] text-gray-400 focus:outline-none cursor-not-allowed transition-all"
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--secondary)",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                        Email is managed by your identity provider
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="prof_phone"
                        className="block mb-2"
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-hidden="true"
                        />
                        <input
                          id="prof_phone"
                          type="tel"
                          value={displayPhone}
                          onChange={(e) => setPhoneEdit(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-[12px] text-white focus:outline-none placeholder-[#4a4a52] transition-all"
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--secondary)",
                            fontSize: "14px",
                          }}
                        />
                      </div>
                    </div>

                    {/* Save row */}
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={updateProfile.isPending}
                        className="flex items-center justify-center gap-2 h-11 px-6 rounded-[12px] text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{
                          background: "#2563EB",
                          fontSize: "14px",
                          fontWeight: 600,
                        }}
                      >
                        {updateProfile.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Save className="w-4 h-4" aria-hidden="true" />
                        )}
                        Save Changes
                      </button>
                      {saveSuccess && (
                        <div
                          className="flex items-center gap-2"
                          style={{ color: "#32D74B", fontSize: "13px" }}
                          role="status"
                          aria-live="polite"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          Saved successfully
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* ─ Security Tab ────────────────────────────────── */}
            {activeTab === "security" && (
              <motion.div
                key="security"
                className="space-y-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {/* Change Password */}
                <div
                  className="rounded-[16px] p-6"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--secondary)",
                  }}
                >
                  <h2
                    className="text-white mb-1"
                    style={{ fontSize: "20px", fontWeight: 600 }}
                  >
                    Change Password
                  </h2>
                  <p
                    className="mb-6"
                    style={{
                      fontSize: "13px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Ensure your account is using a strong password
                  </p>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <PasswordField
                      id="pw_current"
                      label="Current Password"
                      value={passwords.current}
                      onChange={(v) =>
                        setPasswords((p) => ({ ...p, current: v }))
                      }
                      show={showCurrentPw}
                      onToggleShow={() => setShowCurrentPw(!showCurrentPw)}
                    />
                    <PasswordField
                      id="pw_new"
                      label="New Password"
                      value={passwords.newPw}
                      onChange={(v) =>
                        setPasswords((p) => ({ ...p, newPw: v }))
                      }
                      show={showNewPw}
                      onToggleShow={() => setShowNewPw(!showNewPw)}
                    />
                    <PasswordField
                      id="pw_confirm"
                      label="Confirm New Password"
                      value={passwords.confirm}
                      onChange={(v) =>
                        setPasswords((p) => ({ ...p, confirm: v }))
                      }
                      show={showConfirmPw}
                      onToggleShow={() => setShowConfirmPw(!showConfirmPw)}
                    />

                    {pwError && (
                      <div
                        className="flex items-center gap-2 p-3 rounded-[10px]"
                        style={{
                          background: "rgba(255,59,48,0.1)",
                          border: "1px solid rgba(255,59,48,0.2)",
                          fontSize: "13px",
                          color: "#FF3B30",
                        }}
                        role="alert"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {pwError}
                      </div>
                    )}

                    {pwSuccess && (
                      <div
                        className="flex items-center gap-2 p-3 rounded-[10px]"
                        style={{
                          background: "rgba(50,215,75,0.1)",
                          border: "1px solid rgba(50,215,75,0.2)",
                          fontSize: "13px",
                          color: "#32D74B",
                        }}
                        role="status"
                        aria-live="polite"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Password changed successfully
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="flex items-center justify-center gap-2 h-11 px-6 rounded-[12px] text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{
                        background: "#2563EB",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      )}
                      Update Password
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ─ Sessions & Devices Tab ────────────────────────── */}
            {activeTab === "sessions" && (
              <motion.div
                key="sessions"
                className="space-y-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {/* Active Sessions */}
                <div
                  className="rounded-[16px] p-6"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--secondary)",
                  }}
                >
                  <h2
                    className="text-white mb-1"
                    style={{ fontSize: "20px", fontWeight: 600 }}
                  >
                    Active Sessions
                  </h2>
                  <p
                    className="mb-6"
                    style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                  >
                    Manage your active sessions across devices
                  </p>

                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : !sessions?.length ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Shield className="w-8 h-8 text-gray-600 mb-2" aria-hidden="true" />
                      <p className="text-gray-400 text-sm">No active sessions found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-4 rounded-[12px]"
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--secondary)",
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Globe
                              className="w-5 h-5 mt-0.5 shrink-0"
                              style={{ color: "var(--muted-foreground)" }}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="text-white text-sm font-medium truncate">
                                {parseUserAgent(s.user_agent)}
                              </div>
                              <div
                                className="text-xs mt-0.5 truncate"
                                style={{ color: "var(--muted-foreground)" }}
                              >
                                {s.ip_address} · Last active{" "}
                                {formatTimeAgo(s.last_activity_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Registered Devices */}
                <div
                  className="rounded-[16px] p-6"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--secondary)",
                  }}
                >
                  <h2
                    className="text-white mb-1"
                    style={{ fontSize: "20px", fontWeight: 600 }}
                  >
                    Registered Devices
                  </h2>
                  <p
                    className="mb-6"
                    style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                  >
                    Devices that have been used to access your account
                  </p>

                  {devicesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : !devices?.length ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Smartphone className="w-8 h-8 text-gray-600 mb-2" aria-hidden="true" />
                      <p className="text-gray-400 text-sm">No registered devices</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-4 rounded-[12px]"
                          style={{
                            background: "var(--background)",
                            border: "1px solid var(--secondary)",
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Smartphone
                              className="w-5 h-5 mt-0.5 shrink-0"
                              style={{ color: "var(--muted-foreground)" }}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="text-white text-sm font-medium truncate">
                                {d.device_name || `${d.browser} on ${d.os}`}
                              </div>
                              <div
                                className="text-xs mt-0.5 truncate"
                                style={{ color: "var(--muted-foreground)" }}
                              >
                                {d.ip_address} · Last seen{" "}
                                {formatTimeAgo(d.last_seen_at)}
                              </div>
                            </div>
                          </div>
                          <div
                            className="px-2.5 py-1 rounded-[6px] text-xs font-medium shrink-0 ml-3"
                            style={{
                              background: d.is_active
                                ? "rgba(50,215,75,0.15)"
                                : "rgba(142,142,147,0.15)",
                              color: d.is_active ? "#32D74B" : "#8E8E93",
                              border: `1px solid ${d.is_active ? "rgba(50,215,75,0.2)" : "rgba(142,142,147,0.2)"}`,
                            }}
                          >
                            {d.is_active ? "Active" : "Inactive"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─ Activity Tab ────────────────────────────────── */}
            {activeTab === "activity" && (
              <motion.div
                key="activity"
                className="rounded-[16px] p-6"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--secondary)",
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <h2
                  className="text-white mb-1"
                  style={{ fontSize: "20px", fontWeight: 600 }}
                >
                  Recent Activity
                </h2>
                <p
                  className="mb-6"
                  style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                >
                  Review your recent account activity and logins
                </p>

                {activityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : !activity?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="w-8 h-8 text-gray-600 mb-2" aria-hidden="true" />
                    <p className="text-gray-400 text-sm">No login activity recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activity.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-4 rounded-[12px]"
                        style={{
                          background: "var(--background)",
                          border: "1px solid var(--secondary)",
                        }}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: a.success
                                ? "rgba(50,215,75,0.15)"
                                : "rgba(255,59,48,0.15)",
                            }}
                            aria-hidden="true"
                          >
                            {a.success ? (
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#32D74B" }} />
                            ) : (
                              <AlertTriangle className="w-4 h-4" style={{ color: "#FF3B30" }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium">
                              {a.success ? "Successful login" : "Failed login attempt"}
                            </div>
                            <div
                              className="text-xs mt-0.5 truncate"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {a.ip_address} · {parseUserAgent(a.user_agent)}
                            </div>
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              {formatTimestamp(a.created_at)}
                            </div>
                          </div>
                        </div>
                        <div
                          className="px-2.5 py-1 rounded-[6px] text-xs font-medium shrink-0 ml-3"
                          style={{
                            background: a.success
                              ? "rgba(50,215,75,0.15)"
                              : "rgba(255,59,48,0.15)",
                            color: a.success ? "#32D74B" : "#FF3B30",
                            border: `1px solid ${a.success ? "rgba(50,215,75,0.2)" : "rgba(255,59,48,0.2)"}`,
                          }}
                        >
                          {a.success ? "Success" : "Failed"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
