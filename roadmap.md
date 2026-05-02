# Beacon 3.0 - Production Roadmap

> Emergency response platform roadmap to reach 911-grade production quality.
> Phases are ordered by dependency and impact. Each phase is independently deployable.

---

## Context

Beacon is an emergency coordination dashboard used by ERT members under high stress.
Current gaps: toast notifications not wired, no incident alert popup, search is a visual
placeholder, keyboard shortcuts missing, errors surface raw backend strings, light/dark
theme undocumented, no session security, no offline handling. The goal is a platform
where a responder can act within 3 seconds of loading any screen.

---

## Phase 1 - Core Infrastructure
> Foundation systems every other phase depends on. Must ship first.

### 1A · Global Toast System

**Problem:** `sonner` v2.0.7 is installed but never mounted. All mutation feedback is
component-local state (3.5s timeout divs). There's no unified visual language for
success/error/warning across the app.

**Files:**
| Action | Path | Change |
|--------|------|--------|
| MODIFY | `src/components/ui/sonner.tsx` | Replace `useTheme` from `next-themes` (wrong provider) with `useTheme` from `../../contexts/ThemeContext` |
| MODIFY | `src/App.tsx` | Add `<Toaster position="top-right" richColors closeButton />` inside `AuthProvider`, before `RouterProvider` |
| CREATE | `src/utils/toast.ts` | Typed wrapper over sonner: `toast.success()`, `.error()`, `.warning()`, `.info()`, `.loading(id)`, `.dismiss(id)` |

**`toast.ts` interface:**
```typescript
import { toast as sonnerToast } from "sonner";
export const toast = {
  success: (msg: string) => sonnerToast.success(msg),
  error:   (msg: string) => sonnerToast.error(msg),
  warning: (msg: string) => sonnerToast.warning(msg),
  info:    (msg: string) => sonnerToast.info(msg),
  loading: (msg: string, id: string) => sonnerToast.loading(msg, { id }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
```

**Migrate these components** to use `toast` instead of local `feedback` state:
- `src/components/organisms/IncidentActionsPanel.tsx` - remove `showFeedback()` + `feedback` state
- `src/components/molecules/DispatchCard.tsx` - remove local `error` state
- Any other component catch block currently using `(e as Error).message`

---

### 1B · Error Message Sanitization

**Problem:** `request.ts` throws raw backend strings like `"POST /api/... failed: 403"` or
internal database messages. Users see stack-trace-level information.

**CREATE `src/utils/error.utils.ts`:**
```typescript
const STATUS_MAP: Record<number, string> = {
  400: "Invalid request. Check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource no longer exists.",
  409: "This conflicts with current state. Refresh and try again.",
  422: "The data provided is invalid.",
  429: "Too many requests. Please wait a moment.",
  500: "Server error. Our team has been notified.",
  502: "Service temporarily unavailable.",
  503: "System maintenance in progress. Try again shortly.",
};

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "An unexpected error occurred.";
  const statusMatch = error.message.match(/failed:\s*(\d{3})$/);
  if (statusMatch) return STATUS_MAP[+statusMatch[1]] ?? "An unexpected error occurred.";
  if (/network|fetch|failed to fetch/i.test(error.message))
    return "Connection lost. Check your network and try again.";
  if (/timeout/i.test(error.message))
    return "The request timed out. Please try again.";
  // Only forward message if it looks user-safe (no stack/code paths)
  if (error.message.length < 180 && !error.message.includes(" at "))
    return error.message;
  return "An unexpected error occurred. Please try again.";
}
```

**Usage everywhere:**
```typescript
catch (e) { toast.error(getErrorMessage(e)); }
```

---

### 1C · CLAUDE.md Updates

**Add these sections to `CLAUDE.md`:**

**§ Light / Dark Mode** (after Tailwind CSS section):
- Document `ThemeContext.tsx` - `useTheme()`, `toggleTheme()`, localStorage key `beacon-theme`
- Document CSS variable semantic tokens (`:root` for light, `.dark` for dark):
  ```
  bg-background    → page bg       bg-card    → panels    bg-muted    → inputs
  text-foreground  → body text     text-muted-foreground → labels
  border-border    → all borders   text-primary → accent
  ```
- Rule: New components that must render in both themes MUST use semantic token classes.
  Legacy dark-only components (bg-gray-900, bg-gray-950) remain valid for dark-only contexts.
- Rule: Never hardcode `#0f172a` or `#1e293b` - always use CSS variables

**§ Toast Notifications** (after Error section):
- Always use `toast.ts` wrapper - never import `toast` from `"sonner"` directly
- `toast.success()` for mutations, `toast.error(getErrorMessage(e))` in catch blocks
- `toast.loading("...", id)` + `toast.dismiss(id)` for async sequences
- Never use component-local feedback state for mutation outcomes

**§ Error Handling** (add to API & HTTP Rules):
- Always wrap error display with `getErrorMessage()` from `src/utils/error.utils.ts`
- Never interpolate `error.message` directly into JSX

**§ Keyboard Shortcuts & Command Palette** (new section):
- Global shortcuts registered in `useKeyboardShortcuts.ts` mounted in `DashboardLayout`
- Command palette via `CommandPaletteContext` + `⌘K`
- All new navigation-triggering features MUST add a shortcut and document it in `KeyboardShortcutsDialog`

---

### 1D · IMPROVEMENTS.md (project root)

**CREATE `IMPROVEMENTS.md` at `F:\Trinity\Beacon\beacon-dashboard\IMPROVEMENTS.md`**

Sections:
1. **Active Code TODOs** (5 items with file:line)
   - `useInfiniteIncidents.ts:76` - text search not forwarded to API
   - `ERTDashboard.tsx:910` - Personnel Active shows incident count, not ERT availability
   - `IncidentDetails.tsx:427` - Affected citizens count missing from Incident type
   - `Profile.tsx:976` - Activity log awaiting `/api/iam/v1/users/{id}/activity`
   - `Notifications.tsx:96` - Entire page awaiting `/api/notifications/v1`

2. **Hardcoded Values** (11 items)
   - Dublin coords in ERTDashboard.tsx:164, 367
   - Response time target 4.5m in Analytics.tsx:383
   - Unit utilization array Analytics.tsx:73
   - TomTom API key in EvacuationPlan.tsx:62
   - WebSocket URL in CommunicationCenter.tsx:41
   - Default location in Profile.tsx:591

3. **UX Gaps by Screen** (all 11 screens)
4. **Security Issues** (role fallback to admin, no idle timeout, etc.)
5. **Missing 911 Features** (panic button, shift handoff, resource capacity, etc.)

---

## Phase 2 - Global Search Modal & Command Palette
> Replaces the non-functional topbar search with a centered modal, adds @bot querying and keyboard navigation.

### 2A · CommandPaletteContext

**CREATE `src/contexts/CommandPaletteContext.tsx`**
```typescript
interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
// Context + Provider + useCommandPalette hook
// Add <CommandPaletteProvider> wrapping in App.tsx inside AuthProvider
```

---

### 2B · Global Search Modal

**Goal:** Replace the topbar's non-functional inline search with a **centered full-screen modal**
triggered by clicking the search bar, pressing `⌘K`, or pressing `Ctrl+K`.

**CREATE `src/components/organisms/CommandPalette.tsx`** (~190 lines)

**Visual design:**
```
┌─────────────────────────────────────────────────────────┐
│  🔍  Search incidents, pages, ERT…  or type @bot …  [Esc]│
│ ─────────────────────────────────────────────────────── │
│  NAVIGATION                                             │
│  ◉ Dashboard          /                                 │
│  ◉ Incidents          /incidents                        │
│  ◉ Communication      /communication           ↩ enter  │
│  ◉ Analytics          /analytics                        │
│  ─────────────────────────────────────────────────────  │
│  RECENT INCIDENTS                                       │
│  🔴 Fire @ O'Connell St    P0 · Active    32s ago       │
│  🟠 Flood @ Canal Rd        P1 · Reported  4m ago       │
│  ─────────────────────────────────────────────────────  │
│  QUICK ACTIONS                                          │
│  ＋ Log New Incident                         N          │
│  ? Show keyboard shortcuts                  ?           │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- Uses `cmdk` (v1.1.1, already installed)
- `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem` from `cmdk`
- Overlay: `motion.div` with `backdropVariants` + `modalVariants` from `animations.ts`
- Width: 600px centered, max-height 500px, scrollable results
- Renders inside a `Portal` (Radix Dialog or custom)

**Result groups:**
1. **Navigation** - all 11 routes (icon + label + path), always shown, filtered by query
2. **Recent Incidents** - from `queryClient.getQueryData(["incidents"])` cache (max 5), shows `SeverityBadge` + status + time ago. Navigate to `/incidents/:id` on select.
3. **ERT Members** - from `queryClient.getQueryData(["ert-members"])` cache (max 3), shows name + role
4. **Quick Actions** - Log Incident, View Notifications, Toggle Theme, Show Shortcuts

**Fuzzy matching:** case-insensitive `.includes()` - no library needed.

---

### 2C · @bot Integration in Search Modal

**Goal:** Typing `@bot <question>` in the search input routes directly to the support bot
instead of showing navigation results.

**Detection:**
```typescript
const isBotQuery = query.trim().startsWith("@bot ");
const botPrompt = query.trim().slice(5); // strip "@bot "
```

**When `isBotQuery` is true:**
- Hide navigation/incident results
- Show a bot response panel below the input:
  ```
  ┌─────────────────────────────────────────────────┐
  │  🤖 @bot                                        │
  │  ─────────────────────────────────────────────  │
  │  "How many P0 incidents this week?"             │
  │  ─────────────────────────────────────────────  │
  │  [▶ Ask]    Powered by Beacon AI                │
  │                                                 │
  │  ── Response ────────────────────────────────   │
  │  There are 3 active P0 incidents this week...   │
  └─────────────────────────────────────────────────┘
  ```
- On Enter or "Ask" click: call `sendMessage(botPrompt)` from `supportBot.ts`
- Show loading state (pulsing dots), then render response
- Response is non-navigable - user can copy text
- Link: "Open AI Assistant →" opens the existing `AIChatWidget`

**Add to `DashboardLayout.tsx`:** Wire `@bot` deeplink - clicking AI chat icon opens
`AIChatWidget` pre-populated with the question if coming from search palette.

---

### 2D · Keyboard Shortcuts

**CREATE `src/hooks/useKeyboardShortcuts.ts`**

```typescript
type Options = {
  onOpenPalette: () => void;
  onOpenLogIncident: () => void;
  navigate: (path: string) => void;
};

export function useKeyboardShortcuts(opts: Options) {
  useEffect(() => {
    let chord: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;

      // ⌘K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); opts.onOpenPalette(); return;
      }
      // G chord → navigation
      if (!e.metaKey && !e.ctrlKey && e.key === "g") {
        chord = "g";
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { chord = null; }, 500);
        return;
      }
      if (chord === "g") {
        const ROUTES: Record<string, string> = {
          d: "/", i: "/incidents", c: "/communication",
          a: "/analytics", t: "/transport", e: "/ert-management",
          n: "/notifications",
        };
        if (ROUTES[e.key]) { opts.navigate(ROUTES[e.key]); chord = null; }
        return;
      }
      // N → Log Incident modal
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        opts.onOpenLogIncident(); return;
      }
      // ? → Keyboard shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        opts.onOpenShortcutsDialog(); return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opts]);
}
```

**Shortcut table:**
| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `G then D` | Go to Dashboard |
| `G then I` | Go to Incidents |
| `G then C` | Go to Communication |
| `G then A` | Go to Analytics |
| `G then T` | Go to Transport |
| `G then E` | Go to ERT Management |
| `G then N` | Go to Notifications |
| `N` | Open Log Incident modal |
| `?` | Show keyboard shortcuts reference |
| `Esc` | Close any open modal/palette |

**CREATE `src/components/organisms/KeyboardShortcutsDialog.tsx`** (~80 lines)
- Modal triggered by `?` key or from command palette
- Grid of shortcut categories (Navigation, Actions, Modals)
- Each row: `<KeyboardShortcutBadge>` + label

**CREATE `src/components/atoms/KeyboardShortcutBadge.tsx`** (atom)
```tsx
// Renders ⌘K, G+I, etc. as <kbd> elements
export function KeyboardShortcutBadge({ keys }: { keys: string }) {
  return (
    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700 rounded text-gray-400 leading-none">
      {keys}
    </kbd>
  );
}
```

**MODIFY `src/components/layouts/DashboardLayout.tsx`:**
- Replace non-functional search input `<input>` with a button that `onClick → openPalette()`
- Show `⌘K` badge using `KeyboardShortcutBadge`
- Mount `<CommandPalette />` component
- Call `useKeyboardShortcuts({ onOpenPalette, onOpenLogIncident, navigate })`

---

## Phase 3 - Real-Time Incident Alerting
> The most critical UX gap: ERT members have no way to know a new P0 has just arrived.

### 3A · New Incident Detector Hook

**Problem:** The app polls incidents every 30s but never compares counts to detect new ones.
There is no WebSocket feed for incident creation events - we use polling diff.

**CREATE `src/hooks/useNewIncidentAlert.ts`**
```typescript
// Polls metrics every 15s. Compares active_incidents count to previous snapshot.
// When count increases AND new incident is P0 or P1, emits alert.
export function useNewIncidentAlert(onNewIncident: (incident: Incident) => void) {
  // 1. Poll useMetrics every 15s
  // 2. On count increase: fetch latest incident (page_size=1, sort_by=created_at desc)
  // 3. If severity === "P0" or "P1" and age < 90s → call onNewIncident(incident)
  // 4. Track alerted IDs in a Set to prevent re-alerting on re-render
}
```

---

### 3B · Incident Alert Modal

**CREATE `src/components/organisms/IncidentAlertModal.tsx`** (~160 lines)

**What it shows when P0/P1 incident is detected:**
```
╔══════════════════════════════════════════════════════════╗
║  ⚠ CRITICAL INCIDENT                         [✕ Dismiss]║
║  ─────────────────────────────────────────────────────  ║
║                                                         ║
║  FIRE                     ● P0  REPORTED  00:47s ago    ║
║                                                         ║
║  📍 123 O'Connell Street, Dublin 1                      ║
║                                                         ║
║  ─── Nearest Resources ─────────────────────────────    ║
║  🚒 Tara St Fire Station         0.8 km                 ║
║  🏥 Mater Hospital               1.3 km                 ║
║  🚓 Store St Garda Station       0.5 km                 ║
║                                                         ║
╠═════════════════════════════════════════════════════════╣
║  [Open Incident →]   [Dispatch Now →]   [Dismiss]       ║
╚═════════════════════════════════════════════════════════╝
```

**Behavior:**
- Triggered by `useNewIncidentAlert` in `DashboardLayout` (always mounted)
- Animated entrance: slides down from top with spring physics (`modalVariants`)
- Pulsing red border for P0 (CSS `animate-pulse` on border)
- Countdown timer (elapsed seconds since `created_at`)
- **Resources section:** calls `useNearbyResources` lazily with incident lat/lng (hospitals, fire stations, police stations within range)
- **Actions:**
  - "Open Incident →" → navigate to `/incidents/:id`
  - "Dispatch Now →" → navigate to `/incidents/:id/dispatch`
  - "Dismiss" → removes alert (logs dismissal to console, future: audit trail)
- **Queue:** If multiple critical incidents arrive, they stack (show count badge, cycle through)
- **P1 incidents:** Same modal, amber border instead of red
- Positioned: top-center, `fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[520px]`
- Auto-dismiss after 60s if no action taken (with countdown progress bar)

**MODIFY `src/components/layouts/DashboardLayout.tsx`:**
- Mount `useNewIncidentAlert(handleNewIncident)` at top level
- `handleNewIncident` adds to alert queue state
- Render `<IncidentAlertModal>` queue

---

### 3C · Notification Badge

**Problem:** Bell icon in topbar has no unread count badge - users don't know about pending notifications.

**MODIFY `src/components/layouts/DashboardLayout.tsx`:**
- Add unread count state (local for now, can connect to notifications API later)
- Increment badge on each new incident alert (when not on notifications page)
- Show count badge on bell icon: `<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{count}</span>`
- Clear count when user visits `/notifications`

---

## Phase 4 - Security & Resilience
> Production-grade stability: no silent failures, no security holes.

### 4A · Session Idle Timeout

**Problem:** Abandoned auth sessions persist forever - critical security gap for emergency terminals.

**CREATE `src/hooks/useSessionTimeout.ts`**
- Tracks last user interaction (mousemove, keydown, click)
- After 30 minutes of inactivity: show `SessionTimeoutWarning` dialog
- Warning shows: "Your session expires in 5 minutes. Continue working?"
- After 5 more minutes: auto-logout (`authService.logout()`)
- Reset timer on any interaction

**CREATE `src/components/organisms/SessionTimeoutWarning.tsx`** (~60 lines)
- Modal: "Session expiring" + countdown + "Stay Logged In" / "Logout" buttons
- `motion.div` with `modalVariants`

**MODIFY `src/components/layouts/DashboardLayout.tsx`:** Mount `useSessionTimeout()`

---

### 4B · Rate Limit & Retry Handling

**Problem:** `request.ts` immediately throws on 429 - no backoff, no user feedback.

**MODIFY `src/utils/request.ts`:**
- On 429 response: read `Retry-After` header (default 5s), wait, retry once automatically
- If retry also fails: throw with `getErrorMessage` friendly message
- On 5xx: retry once after 2s
- Add request timeout: 15s default for all requests (AbortController)

```typescript
// Retry logic to add:
if (res.status === 429) {
  const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5") * 1000;
  await sleep(retryAfter);
  return executeRequest(); // retry once
}
if (res.status >= 500) {
  await sleep(2000);
  return executeRequest(); // retry once
}
```

---

### 4C · Offline Detection

**Problem:** HTTP requests fail silently when the network drops. Users see no indication.

**CREATE `src/hooks/useOnlineStatus.ts`**
```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return isOnline;
}
```

**CREATE `src/components/atoms/OfflineBanner.tsx`**
```tsx
// Non-dismissible banner that appears when offline:
// ⚠ No internet connection - data may be stale. Reconnecting...
// Yellow background, full-width, sticky below topbar
```

**MODIFY `src/components/layouts/DashboardLayout.tsx`:** Mount `useOnlineStatus()` + render `<OfflineBanner>` conditionally

---

### 4D · Auth Security Fix

**Problem:** `auth.ts:183` falls back to ADMIN role if JWT parsing fails - users get full access on parse error.

**MODIFY `src/services/auth.ts`:**
- Change fallback from admin role to `null` / no role → redirect to login
- Add validation: if no recognized role found, treat as unauthenticated
- Add audit log call on login/logout (to be connected to backend endpoint)

---

## Phase 5 - UX Completeness
> Fill gaps in existing screens to make them usable under stress.

### 5A · Incident Page - Stress-Optimised Layout

**Problem:** `IncidentDetails.tsx` is a 1000+ line component. Actions are buried. Under P0 stress, finding "Escalate" takes too long.

**Improvements:**
- **Sticky action bar:** Pin Close/Escalate/Dispatch buttons to top of incident details page (always visible on scroll)
- **"Command strip":** Single row of the 4 most critical actions at top, below severity header
- **Severity visual prominence:** P0 incidents show red banner header; P1 amber; P2 yellow
- **Countdown timer:** Show elapsed time since incident was reported (visual urgency)
- **Resource summary at-a-glance:** Nearest 3 resources shown inline (not just in the map)
- **Affected citizens TODO:** When `IncidentDetails.tsx:427` is resolved (backend provides count), display prominently

---

### 5B · Notification Backend Connection

**When `/api/notifications/v1` becomes available:**
- CREATE `src/hooks/useNotifications.ts` - React Query + 15s polling
- UPDATE `Notifications.tsx` - remove empty state, render real data
- UPDATE `DashboardLayout.tsx` - connect badge count to `useNotifications` unread count

**Structure already in place** (filter tabs, grouping by day, mark-read UI) - just needs data.

---

### 5C · ERT Availability Dashboard

**Problem:** "Personnel Active" on dashboard shows incident count, not available ERT members.

**When availability endpoint exists:**
- UPDATE `ERTDashboard.tsx:910` - replace incident count with ERT member count by status
- Extend `ERTManagementPage` with availability column: On Duty / Off Duty / Standby
- Add `useERTAvailability()` hook when endpoint available

---

### 5D · Analytics - Real Unit Utilization

**Problem:** Unit utilization bars in Analytics.tsx:73-80 are static representative data.

**Interim fix:**
- Replace static array with derived data from `useDispatches` result:
  dispatch statuses → compute utilization per station
- Add comment explaining methodology
- When API exposes `/api/core/v1/stations/utilization`, wire to that endpoint

---

### 5E · Mobile Navigation Drawer

**Problem:** DashboardLayout sidebar requires desktop. Mobile users see broken layout.

**CREATE `src/components/molecules/MobileNavDrawer.tsx`**
- Slide-in drawer triggered by hamburger icon in topbar (only visible on `<lg` screens)
- Same nav items as sidebar, but full-width slide-in from left
- Uses Radix `Sheet` (already installed via shadcn) or Vaul drawer (already installed)
- Close on nav item click

---

### 5F · Profile Activity Log

**When `/api/iam/v1/users/{id}/activity` becomes available:**
- CREATE `src/hooks/useActivityLog.ts`
- UPDATE `Profile.tsx:976` - render activity entries with timestamp, action, entity

---

## Phase 6 - Advanced Features
> Differentiating capabilities for a world-class emergency platform.

### 6A · Real-Time Incident WebSocket Feed

**Current gap:** Incidents are polled every 30s. A P0 could sit undetected for up to 29s.

**If `/api/core/v1/incidents/stream` or similar endpoint becomes available:**
- Extend `useWebSocket.ts` to support incident event feeds (separate from chat WebSocket)
- Replace polling-diff in `useNewIncidentAlert` with real WebSocket subscription
- Emit `incident.created`, `incident.escalated`, `incident.closed` events
- Zero latency alerts for all ERT members simultaneously

---

### 6B · @bot in Communication Center

**Enhance existing `CommunicationCenter.tsx`:**
- If a message starts with `@bot `, intercept it (don't send to room)
- Call `sendMessage(text)` from `supportBot.ts`
- Inject bot response as a message in the chat thread with `role: "assistant"` styling
- Add "AI" badge to bot messages

---

### 6C · Incident Data Export

**For compliance and post-incident reporting:**
- CREATE `src/utils/export.utils.ts` - `exportIncidentCSV(incidents[])` and `exportIncidentPDF(incident)`
- PDF: uses `window.print()` with `@media print` CSS (no library needed)
- CSV: comma-separated ID, type, severity, location, timestamps, status
- Add "Export" button in `AllIncidents` page header and `IncidentDetails` page

---

### 6D · Shift Handoff Workflow

**When backend supports shift/handoff:**
- "End Shift" button in user avatar menu
- Opens `ShiftHandoffModal`: summary of incidents worked, notes field, "Hand Off to [Member]"
- Generates a handoff report entry logged to the incident events API

---

### 6E · Panic / Emergency Escalation Button

**For ERT members in field:**
- Floating action button (bottom-right, visible on all incident screens)
- Single tap → `postIncidentAlert(incidentId, { update_message: "REQUESTING IMMEDIATE BACKUP" })`
- Sends alert to all connected ERT members via support bot broadcast
- Guard: confirm dialog ("Send emergency alert to all units?")
- Visual: Pulsing red circle, `⚠` icon, `aria-label="Request emergency backup"`

---

## Deliverable Summary

| Phase | Deliverable | Files |
|-------|------------|-------|
| **1A** | Sonner toast wired globally | `sonner.tsx`, `App.tsx`, `toast.ts` |
| **1B** | Error sanitization | `error.utils.ts`, `IncidentActionsPanel.tsx`, `DispatchCard.tsx` |
| **1C** | CLAUDE.md updated | `CLAUDE.md` |
| **1D** | Improvements tracker | `IMPROVEMENTS.md` |
| **2A** | CommandPaletteContext | `CommandPaletteContext.tsx` |
| **2B** | Center search modal | `CommandPalette.tsx` |
| **2C** | @bot in search | within `CommandPalette.tsx` + `supportBot.ts` |
| **2D** | Keyboard shortcuts | `useKeyboardShortcuts.ts`, `KeyboardShortcutsDialog.tsx`, `KeyboardShortcutBadge.tsx` |
| **2E** | Topbar wired | `DashboardLayout.tsx` |
| **3A** | Incident detector | `useNewIncidentAlert.ts` |
| **3B** | Alert popup modal | `IncidentAlertModal.tsx` |
| **3C** | Notification badge | `DashboardLayout.tsx` |
| **4A** | Session timeout | `useSessionTimeout.ts`, `SessionTimeoutWarning.tsx` |
| **4B** | Retry + 429 handling | `request.ts` |
| **4C** | Offline banner | `useOnlineStatus.ts`, `OfflineBanner.tsx` |
| **4D** | Auth security fix | `auth.ts` |
| **5A** | Incident UX improvements | `IncidentDetails.tsx` |
| **5B** | Notifications backend | `useNotifications.ts`, `Notifications.tsx` |
| **5C** | ERT availability | `ERTDashboard.tsx` |
| **5D** | Analytics real data | `Analytics.tsx`, `useAnalytics.ts` |
| **5E** | Mobile nav drawer | `MobileNavDrawer.tsx`, `DashboardLayout.tsx` |
| **6A** | Real-time WS incidents | `useWebSocket.ts` extension |
| **6B** | @bot in chat | `CommunicationCenter.tsx` |
| **6C** | Data export | `export.utils.ts` |
| **6D** | Shift handoff | `ShiftHandoffModal.tsx` |
| **6E** | Panic button | `PanicButton.tsx` |

---

## Parallel Execution Plan (Phases 1 & 2 simultaneously)

**Sprint 1 - 4 agents in parallel:**
- Agent 1: Phase 1A + 1B (toast, error utils, Sonner fix, migrate IncidentActionsPanel + DispatchCard)
- Agent 2: Phase 2B + 2C (CommandPalette.tsx with @bot logic)
- Agent 3: Phase 2A + 2D (CommandPaletteContext + useKeyboardShortcuts + KeyboardShortcutsDialog + KeyboardShortcutBadge)
- Agent 4: Phase 1C + 1D (CLAUDE.md + IMPROVEMENTS.md)

**Sprint 2 - after sprint 1:**
- Agent 5: Phase 2E - DashboardLayout integration (wire everything sprint 1 built)
- Agent 6: Phase 3A + 3B + 3C (incident alert hook + modal + badge)

**Sprint 3 - after sprint 2:**
- Agent 7: Phase 4A + 4C (session timeout + offline banner)
- Agent 8: Phase 4B + 4D (request.ts retry + auth fix)

---

## Verification Checklist

- [ ] `npm run build:check` - no new errors (only pre-existing `calendar.tsx`)
- [ ] Click topbar search → centered modal opens
- [ ] Press `⌘K` → modal opens; press `Esc` → modal closes
- [ ] Type `@bot How many active incidents?` → bot response appears
- [ ] Press `G then I` → navigate to /incidents
- [ ] Press `?` → keyboard shortcuts dialog opens
- [ ] Trigger incident close → Sonner toast top-right (not inline feedback div)
- [ ] Simulate network error → human-readable toast, not "POST /api/... failed: 500"
- [ ] Toggle theme (Sun/Moon) → all UI adapts (toast, modal, palette)
- [ ] Simulate new P0 incident (increase active count) → alert modal appears top-center
- [ ] `npm run lint` - no new warnings
