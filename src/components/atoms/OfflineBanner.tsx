import { WifiOff } from "lucide-react";

/**
 * Non-dismissible full-width banner shown when the browser is offline.
 * Sticky below the topbar (z-30, top-16 to clear the 64px topbar).
 */
export function OfflineBanner() {
  return (
    <div
      className="sticky top-16 z-30 w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
      style={{ background: "#B45309", color: "#FEF3C7" }}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        No internet connection - data may be stale. Reconnecting…
      </span>
    </div>
  );
}
