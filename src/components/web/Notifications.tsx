import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Filter,
  Flame,
  Loader2,
  MessageSquare,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "../../hooks/useNotifications";
import type { NotifCategory, Notification } from "../../types/notifications.types";
import {
  fadeUp,
  listItem,
  spring,
  springGentle,
  staggerContainer,
} from "../../utils/animations";

type NotifFilter = "all" | NotifCategory;

import { SEV_HEX as SEVERITY_COLOR } from "../../constants/constants";

const CATEGORY_CONFIG: Record<
  NotifCategory,
  { icon: React.ElementType; color: string; bg: string }
> = {
  incident: {
    icon: AlertTriangle,
    color: "#FF453A",
    bg: "rgba(255,69,58,0.12)",
  },
  message: {
    icon: MessageSquare,
    color: "#2563EB",
    bg: "rgba(37,99,235,0.12)",
  },
  system: { icon: Zap, color: "#FFD60A", bg: "rgba(255,214,10,0.12)" },
  ert: { icon: Users, color: "#32D74B", bg: "rgba(50,215,75,0.12)" },
};

const FILTER_TABS: { value: NotifFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "incident", label: "Incidents" },
  { value: "message", label: "Messages" },
  { value: "system", label: "System" },
  { value: "ert", label: "ERT" },
];

function groupByDay(
  items: Notification[],
): { label: string; items: Notification[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = {};

  for (const n of items) {
    const d = new Date(n.timestampMs);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = "Earlier";
    (groups[label] ??= []).push(n);
  }

  const ORDER = ["Today", "Yesterday", "Earlier"];
  return ORDER.filter((l) => groups[l]).map((l) => ({
    label: l,
    items: groups[l],
  }));
}

export function Notifications() {
  const { notifications, isLoading, error } = useNotifications();
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NotifFilter>("all");

  const visible = useMemo(
    () => notifications.filter((n) => !dismissed.has(n.id)),
    [notifications, dismissed],
  );

  const unreadCount = visible.filter((n) => !n.read).length;

  const filtered = useMemo(
    () =>
      filter === "all"
        ? visible
        : visible.filter((n) => n.category === filter),
    [visible, filter],
  );

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const markAllRead = () => markAllReadMutation.mutate();

  const markRead = (id: string) => markReadMutation.mutate(id);

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set(prev).add(id));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Failed to load notifications: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Page header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-6 py-5"
        style={{
          background: "rgba(10,10,10,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--card)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="flex items-center justify-between mb-5"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springGentle}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center relative"
                style={{
                  background: "rgba(37,99,235,0.12)",
                  border: "1px solid rgba(37,99,235,0.2)",
                }}
              >
                <Bell
                  className="w-4.5 h-4.5"
                  style={{ color: "#2563EB" }}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                      style={{
                        background: "#FF453A",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#fff",
                        boxShadow: "0 0 8px rgba(255,69,58,0.5)",
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 600,
                        damping: 28,
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <h1
                  className="text-white"
                  style={{ fontSize: "20px", fontWeight: 700 }}
                >
                  Notifications
                </h1>
                <p
                  style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
                >
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.button
                  key="mark-all"
                  onClick={markAllRead}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] hover:bg-card transition-colors"
                  style={{
                    border: "1px solid var(--secondary)",
                    fontSize: "13px",
                    color: "var(--muted-foreground)",
                    fontWeight: 500,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark all read
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Filter tabs - animated active pill via layoutId */}
          <motion.div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Notification filters"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.2 }}
          >
            {FILTER_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? visible.filter((n) => !n.read).length
                  : visible.filter(
                    (n) => n.category === tab.value && !n.read,
                  ).length;
              const active = filter === tab.value;
              return (
                <motion.button
                  key={tab.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.value)}
                  className="relative flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-sm font-medium"
                  style={{
                    color: active ? "#2563EB" : "var(--muted-foreground)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                >
                  {/* Sliding pill background */}
                  {active && (
                    <motion.div
                      layoutId="notif-filter-bg"
                      className="absolute inset-0 rounded-[8px]"
                      style={{
                        background: "rgba(37,99,235,0.12)",
                        border: "1px solid rgba(37,99,235,0.25)",
                      }}
                      transition={spring}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  {count > 0 && (
                    <motion.span
                      className="relative z-10 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                      style={{
                        background: active ? "#2563EB" : "var(--border)",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: active ? "#fff" : "var(--muted-foreground)",
                      }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      {count}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── Notification list ─────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {grouped.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={springGentle}
            >
              <EmptyState filter={filter} />
            </motion.div>
          ) : (
            <motion.div
              key={filter}
              className="space-y-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {grouped.map(({ label, items }) => (
                <motion.section
                  key={label}
                  variants={fadeUp}
                  aria-label={label}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#555" }}
                    >
                      {label}
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ background: "var(--card)" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {items.map((n) => (
                        <NotificationRow
                          key={n.id}
                          notification={n}
                          onMarkRead={markRead}
                          onDismiss={dismiss}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();
  const cfg = CATEGORY_CONFIG[n.category];
  const Icon = cfg.icon;
  const severityColor = n.severity ? SEVERITY_COLOR[n.severity] : cfg.color;

  function handleRowClick() {
    if (!n.read) onMarkRead(n.id);
    if (n.actionPath) navigate(n.actionPath);
  }

  return (
    <motion.article
      layout
      variants={listItem}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={springGentle}
      className="relative flex items-start gap-4 p-4 rounded-[14px] group cursor-pointer"
      style={{
        background: n.read ? "#0d0d0d" : "#111",
        border: `1px solid ${n.read ? "var(--card)" : "var(--secondary)"}`,
      }}
      onClick={handleRowClick}
      aria-label={n.title}
      whileHover={{
        backgroundColor: "#131313",
        transition: { duration: 0.15 },
      }}
    >
      {/* Unread indicator bar */}
      {!n.read && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full"
          style={{
            background: severityColor,
            boxShadow: `0 0 8px ${severityColor}60`,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ ...springGentle, delay: 0.1 }}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
      >
        {n.category === "incident" && n.severity ? (
          <Flame
            className="w-4.5 h-4.5"
            style={{ color: severityColor }}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ) : (
          <Icon
            className="w-4.5 h-4.5"
            style={{ color: cfg.color }}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {n.severity && (
              <span
                className="shrink-0 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold"
                style={{
                  background: `${severityColor}20`,
                  color: severityColor,
                  border: `1px solid ${severityColor}40`,
                }}
              >
                {n.severity}
              </span>
            )}
            <span
              className="truncate"
              style={{
                fontSize: "14px",
                fontWeight: n.read ? 500 : 600,
                color: n.read ? "#CCCCCC" : "var(--foreground)",
              }}
            >
              {n.title}
            </span>
          </div>
          <span
            className="shrink-0 text-right"
            style={{ fontSize: "11px", color: "#555" }}
          >
            {n.timeLabel}
          </span>
        </div>

        <p
          className="line-clamp-2 mb-2.5"
          style={{
            fontSize: "13px",
            color: "var(--muted-foreground)",
            lineHeight: 1.5,
          }}
        >
          {n.description}
        </p>

        {n.actionLabel && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium hover:underline transition-colors"
            style={{ color: "#2563EB" }}
            onClick={(e) => {
              e.stopPropagation();
              if (!n.read) onMarkRead(n.id);
              if (n.actionPath) navigate(n.actionPath);
            }}
          >
            {n.actionLabel}
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!n.read && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(n.id);
            }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-secondary transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={spring}
            aria-label="Mark as read"
            title="Mark as read"
          >
            <CheckCircle2
              className="w-3.5 h-3.5"
              style={{ color: "#32D74B" }}
              aria-hidden="true"
            />
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(n.id);
          }}
          className="w-7 h-7 rounded-[7px] flex items-center justify-center hover:bg-secondary transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={spring}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X
            className="w-3.5 h-3.5"
            style={{ color: "var(--muted-foreground)" }}
            aria-hidden="true"
          />
        </motion.button>
      </div>
    </motion.article>
  );
}

function EmptyState({ filter }: { filter: NotifFilter }) {
  const labels: Record<NotifFilter, string> = {
    all: "No notifications yet",
    incident: "No incident notifications",
    message: "No message notifications",
    system: "No system alerts",
    ert: "No ERT notifications",
  };

  const descriptions: Record<NotifFilter, string> = {
    all: "You're all caught up - new notifications will appear here automatically.",
    incident: "No incident notifications in this category.",
    message: "No message notifications in this category.",
    system: "No system alerts in this category.",
    ert: "No ERT notifications in this category.",
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-24 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springGentle}
    >
      <motion.div
        className="w-16 h-16 rounded-[18px] flex items-center justify-center mb-5"
        style={{
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(37,99,235,0.15)",
        }}
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <Filter
          className="w-7 h-7"
          style={{ color: "#2563EB" }}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </motion.div>
      <h3
        className="text-white mb-2"
        style={{ fontSize: "16px", fontWeight: 600 }}
      >
        {labels[filter]}
      </h3>
      <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
        {descriptions[filter]}
      </p>
    </motion.div>
  );
}
