# Beacon Dashboard - Engineering Guidelines

> Read this entire document before writing any code. These are not suggestions -
> they are the rules of this codebase. If you produce code that violates these
> guidelines you are introducing technical debt that the team will have to clean up.
> A senior engineer wrote this so a junior engineer (or AI) does not make common mistakes.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [File & Folder Naming Conventions](#file--folder-naming-conventions)
3. [Directory Structure](#directory-structure)
4. [Atomic Design - Component Hierarchy](#atomic-design--component-hierarchy)
5. [Page Architecture & Routing](#page-architecture--routing)
6. [API & HTTP Rules](#api--http-rules)
7. [Service Files](#service-files)
8. [Types](#types)
9. [Authentication](#authentication)
10. [React - Component Architecture](#react--component-architecture)
11. [React - Hooks](#react--hooks)
12. [React - State Management](#react--state-management)
13. [Tailwind CSS](#tailwind-css)
14. [Responsive Design & Screens](#responsive-design--screens)
15. [Accessibility](#accessibility)
16. [Polling & Real-time Data](#polling--real-time-data)
17. [TypeScript](#typescript)
18. [Adding a New Feature - Checklist](#adding-a-new-feature--checklist)
19. [Running the Project](#running-the-project)

---

## Project Overview

Beacon is an emergency response coordination dashboard. Users are either
**SysAdmins** (manage ERT members, view all incidents) or **ERT Members**
(respond to incidents, use communication channels).

**Tech stack:**

- React 18 + TypeScript 5 + Vite
- Tailwind CSS for styling
- shadcn/ui (Radix UI) for accessible UI primitives
- Lucide React for icons
- TomTom Maps SDK for maps
- WebSockets for live chat
- JWT authentication with auto-refresh

Backend at `https://beacon-tcd.tech`, proxied in development via Vite.

---

## File & Folder Naming Conventions

Consistent naming tells you what a file does before you open it.
Every file in this project follows a `<domain>.<role>.<ext>` pattern.

### Services - `<domain>.api.ts`

Service files are named after the API domain they own, with the `.api.ts` suffix.

```
src/services/
├── auth.ts          # Exception - auth is special, no suffix needed
├── api.ts           # Aggregator and re-exporter (IAM + communication)
├── core.api.ts      # Owns /api/core/v1  →  core domain
└── supportBot.api.ts  # Owns /api/support-bot/v1  (rename if adding new ones)
```

When adding a new service:

- New domain `/api/notifications/v1` → `notifications.api.ts`
- New domain `/api/analytics/v1` → `analytics.api.ts`

### Types - `<domain>.types.ts`

Type files mirror the service they describe.

```
src/types/
├── chat.types.ts      # Types for communication/chat domain
├── core.types.ts      # Types for core/incidents domain
└── auth.types.ts      # Types for authentication domain (if split out)
```

When adding types for a new domain, create `src/types/<domain>.types.ts`.
**Never** define shared interfaces inside a service file - they belong in `types/`.

### Hooks - `use<Feature>.ts`

Custom hooks are camelCase with the `use` prefix.

```
src/hooks/
├── useIncidents.ts    # Data fetching + polling logic for incidents
├── useAuth.ts         # Auth state helpers
└── useWeather.ts      # Weather data fetching
```

When adding a hook: `use<WhatItDoes>.ts` - e.g. `useERTMembers.ts`, `useWebSocket.ts`.

### Components - `<FeatureName>.tsx`

- Atoms, molecules, organisms all use **PascalCase** matching the export name
- One component per file: `SeverityBadge.tsx` exports only `SeverityBadge`
- Page-level components get a `Page` suffix: `IncidentDetailsPage.tsx`

```
src/components/
├── atoms/
│   ├── SeverityBadge.tsx
│   └── StatusDot.tsx
├── molecules/
│   ├── IncidentCard.tsx
│   └── SearchInput.tsx
├── organisms/
│   ├── IncidentTable.tsx
│   └── ChannelList.tsx
├── pages/
│   ├── ERTDashboardPage.tsx
│   └── IncidentDetailsPage.tsx
└── ui/                # shadcn - DO NOT MODIFY
```

### Utils - `<concern>.utils.ts`

Utility files are named after what they do.

```
src/utils/
├── request.ts         # HTTP utility - core utility, no suffix needed
├── date.utils.ts      # Date formatting helpers (formatTimeAgo, formatTimestamp)
└── incident.utils.ts  # Incident-specific helpers (getColorFromSeverity, etc.)
```

### Summary table

| What             | Pattern              | Example                |
| ---------------- | -------------------- | ---------------------- |
| API service      | `<domain>.api.ts`    | `core.api.ts`          |
| Type definitions | `<domain>.types.ts`  | `core.types.ts`        |
| Custom hook      | `use<Feature>.ts`    | `useIncidents.ts`      |
| Atom component   | `<Name>.tsx`         | `SeverityBadge.tsx`    |
| Page component   | `<Name>Page.tsx`     | `ERTDashboardPage.tsx` |
| Utility helpers  | `<concern>.utils.ts` | `date.utils.ts`        |

---

## Directory Structure

```
src/
├── components/
│   ├── atoms/             # Smallest reusable units - no business logic
│   │   ├── SeverityBadge.tsx
│   │   ├── StatusDot.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   ├── molecules/         # Compositions of atoms - single responsibility
│   │   ├── IncidentCard.tsx
│   │   ├── SearchInput.tsx
│   │   └── UserRow.tsx
│   ├── organisms/         # Complex sections - may have local state
│   │   ├── IncidentTable.tsx
│   │   ├── ChannelList.tsx
│   │   └── CreateIncidentModal.tsx
│   ├── pages/             # Screen-level components - own their data fetching
│   │   ├── ERTDashboardPage.tsx
│   │   ├── AllIncidentsPage.tsx
│   │   ├── CommunicationCenterPage.tsx
│   │   └── IncidentDetailsPage.tsx
│   └── ui/                # shadcn/ui primitives - DO NOT MODIFY
├── hooks/                 # Custom hooks - use<Feature>.ts
│   ├── useIncidents.ts
│   └── useAuth.ts
├── services/              # One file per API domain - <domain>.api.ts
│   ├── auth.ts
│   ├── api.ts
│   ├── core.api.ts
│   └── supportBot.ts
├── types/                 # Shared interfaces - <domain>.types.ts
│   ├── chat.types.ts
│   └── core.types.ts
└── utils/                 # Pure helper functions
    ├── request.ts
    ├── date.utils.ts
    └── incident.utils.ts
```

**Rule: if you cannot immediately say which folder a new file belongs in, stop
and re-read this section before creating it.**

---

## Atomic Design - Component Hierarchy

Atomic design is a way of thinking about UI components from the smallest unit
upward. It prevents the "one giant component" problem.

```
Atoms → Molecules → Organisms → Pages
  ↑          ↑           ↑          ↑
smallest  composed   complex    screen
building  of atoms   sections   with data
blocks
```

### Atoms - `src/components/atoms/`

The smallest possible UI unit. An atom has **no business logic, no API calls,
no state beyond UI interactions** (hover, focus). It renders what it receives.

```typescript
// ✅ SeverityBadge.tsx - atom
// Inputs: a severity string. Output: a styled badge. Nothing else.
interface SeverityBadgeProps {
  severity: 'P0' | 'P1' | 'P2' | 'P3';
}

const label = { P0: 'Critical', P1: 'High', P2: 'Medium', P3: 'Low' } as const;
const style = {
  P0: 'bg-red-500/20 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  P2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  P3: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
} as const;

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full border', style[severity])}>
      {label[severity]}
    </span>
  );
}
```

Other atoms in this project: `StatusDot`, `LoadingSpinner`, `EmptyState`,
`ErrorMessage`, `TimeAgo`, `Avatar`.

**Rules for atoms:**

- Props are primitive values or simple typed values - never a full `Incident` object
- No `useEffect`, no API calls, no `useState` for data (UI state like `isHovered` is OK)
- Fully reusable across the entire app with no modification

### Molecules - `src/components/molecules/`

A molecule combines 2–4 atoms into a meaningful, self-contained UI unit. A molecule
still has **no API calls** - it receives data as props.

```typescript
// ✅ IncidentCard.tsx - molecule
// Composes: SeverityBadge (atom) + icon + text + TimeAgo (atom)
// Receives individual fields - NOT the whole Incident object (see Page Architecture)

interface IncidentCardProps {
  id: string;
  title: string;
  type: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  locationAddress: string;
  createdAt: string;
  status: string;
  onClick: (id: string) => void;
}

export function IncidentCard({ id, title, type, severity, locationAddress, createdAt, status, onClick }: IncidentCardProps) {
  return (
    <button onClick={() => onClick(id)} className="w-full text-left p-4 ...">
      <SeverityBadge severity={severity} />
      <span>{title || type}</span>
      <TimeAgo timestamp={createdAt} />
      {/* ... */}
    </button>
  );
}
```

**Rules for molecules:**

- Accept individual props, not whole domain objects - `title: string` not `incident: Incident`
- No `useEffect` or API calls
- May have simple interaction state (e.g. `isExpanded` for an accordion card)

### Organisms - `src/components/organisms/`

An organism is a complex, standalone section of the UI. It may have its own
state (local UI state like selected item, open modal), and it accepts data
from its parent via props. Organisms do **not** fetch data themselves.

```typescript
// ✅ IncidentTable.tsx - organism
// Renders a full filterable list of incident cards.
// Data comes from the parent page via props.

interface IncidentTableProps {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  onSelectIncident: (id: string) => void;
  onRetry: () => void;
}

export function IncidentTable({ incidents, isLoading, error, onSelectIncident, onRetry }: IncidentTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filtered = useMemo(
    () => incidents.filter(i =>
      (severityFilter === 'all' || i.severity === severityFilter) &&
      (i.title.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [incidents, searchQuery, severityFilter]
  );

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  return (
    <div>
      <SearchInput value={searchQuery} onChange={setSearchQuery} aria-label="Search incidents" />
      {/* severity filter buttons */}
      {filtered.map(i => (
        <IncidentCard key={i.id} {...i} onClick={onSelectIncident} />
      ))}
    </div>
  );
}
```

**Rules for organisms:**

- May have local UI state (filters, open/closed, selected)
- Receive `isLoading`, `error`, and data as props - the page handles fetching
- Emit events upward via callbacks: `onSelectIncident`, `onRetry`, `onCreate`

### Pages - `src/components/pages/`

A page owns data fetching, composes organisms, and manages navigation.
It reads its required inputs from **URL params, localStorage, or auth state -
never from props passed by a parent component.**

```typescript
// ✅ IncidentDetailsPage.tsx - page
// Reads the incidentId from URL param. Fetches its own data. Renders organisms.

export function IncidentDetailsPage() {
  const incidentId = new URLSearchParams(window.location.search).get('id');
  const { incident, isLoading, error } = useIncidentById(incidentId);

  return (
    <div className="min-h-screen bg-gray-950">
      <PageHeader title="Incident Details" onBack={() => navigate(-1)} />
      <IncidentDetailPanel incident={incident} isLoading={isLoading} error={error} />
      <IncidentMapPanel lat={incident?.location.latitude} lng={incident?.location.longitude} />
    </div>
  );
}
```

**Rules for pages:**

- Fetch data using hooks (`useIncidents`, `useIncidentById`)
- Compose organisms - do not render low-level markup directly
- Read navigation parameters from URL or localStorage - never accept an `incident` object as a prop
- Each page must be independently loadable (navigating directly to the URL works)

---

## Page Architecture & Routing

This is one of the most violated patterns in this codebase. Read it carefully.

### Each page is independent - it fetches its own data

A page must **never** depend on data passed through navigation.
When you navigate to a page, you pass an **ID** - the page looks it up itself.

```typescript
// ❌ WRONG - page receives the whole object via prop/navigation state
// If the user refreshes, or opens the URL directly, incident is undefined
function navigate(screen: string, incident: Incident) {
  setCurrentScreen(screen);
  setCurrentIncident(incident); // passing whole object - fragile
}

function IncidentDetailsPage({ incident }: { incident: Incident }) {
  // If incident is undefined (direct link, refresh), this crashes
  return <h1>{incident.title}</h1>;
}

// ✅ CORRECT - pass only the ID, page fetches fresh data
function navigate(screen: string, incidentId: string) {
  setCurrentScreen(screen);
  setCurrentIncidentId(incidentId); // only the ID
}

function IncidentDetailsPage({ incidentId }: { incidentId: string }) {
  const { incident, isLoading, error } = useIncidentById(incidentId);
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  return <h1>{incident.title}</h1>;
}
```

### What to pass between pages

| ✅ Pass this                | ❌ Never pass this              |
| --------------------------- | ------------------------------- |
| `incidentId: string`        | `incident: Incident`            |
| `userId: string`            | `user: AuthUser`                |
| `roomId: string`            | `messages: Message[]`           |
| `severity: string` (filter) | `filteredIncidents: Incident[]` |

### Where pages get their data

Pages read their required context from exactly **one** of these sources:

**1. URL / navigation params (preferred for identifiers)**

```typescript
// Current app uses a custom navigation function - pass only the ID
onNavigate("incident-details", incidentId);

// Future: with react-router
const { id } = useParams<{ id: string }>();
```

**2. localStorage (for persisted user preferences)**

```typescript
// ✅ Persisted state the user expects to survive a refresh
const savedFilter = localStorage.getItem("incidents_severity_filter") ?? "all";
```

**3. Auth state (for current user)**

```typescript
// ✅ Current user context
const user = authService.getCurrentUser();
```

**4. Fresh API fetch by the page itself**

```typescript
// ✅ Page fetches what it needs
const { incident } = useIncidentById(incidentId);
```

### Adding navigation to a new page

```typescript
// Define the navigation call - pass only primitive identifiers
onNavigate("incident-details", incident.id); // ✅ string ID
onNavigate("user-profile", userId); // ✅ string ID
onNavigate("all-incidents"); // ✅ no param needed

// In the page, derive everything from the ID
function IncidentDetailsPage({ incidentId }: { incidentId: string }) {
  const { incident, isLoading, error } = useIncidentById(incidentId);
  // ...
}
```

---

## API & HTTP Rules

### Never call fetch() directly for Beacon APIs

```typescript
// ❌ WRONG - bypasses auth, error handling, base URL resolution, token refresh
const res = await fetch("/api/core/v1/incidents");
const res = await authService.authenticatedFetch("/api/core/v1/incidents", {});

// ✅ CORRECT
import { request } from "../utils/request";
const data = await request.get<IncidentsResponse>("/api/core/v1/incidents");
```

### `request` utility - `src/utils/request.ts`

```typescript
// GET with query params
const data = await request.get<MyType>("/api/core/v1/incidents", {
  params: { sort_by: "created_at", page_size: 50 },
});

// POST
const result = await request.post<ResponseType>(
  "/api/iam/v1/ert-members",
  payload,
);

// PUT / PATCH
await request.put("/api/iam/v1/users/123", updatedUser);
await request.patch("/api/iam/v1/users/123", { status: "active" });

// DELETE
await request.del("/api/iam/v1/users/123");

// Public endpoint - auth: false
await request.post("/api/iam/v1/auth/login", creds, { auth: false });

// Cancellable request
const controller = new AbortController();
setTimeout(() => controller.abort(), 15_000);
await request.post("/api/core/v1/incidents", payload, {
  signal: controller.signal,
});
```

`auth` defaults to `true`. Only `auth: false` for login, refresh, and public endpoints.

**Exception - external third-party APIs** use raw `fetch()` because they have their own
full URLs and `request.ts` would prefix them with the Beacon base URL:

- `nominatim.openstreetmap.org` - geocoding
- `api.open-meteo.com` - weather
- TomTom SDK calls

---

## Service Files

Each service file owns one API domain, named `<domain>.api.ts`.

| File            | Domain                  | Base path                              |
| --------------- | ----------------------- | -------------------------------------- |
| `auth.ts`       | Authentication          | `/api/iam/v1/auth`                     |
| `api.ts`        | IAM + chat (aggregator) | `/api/iam/v1`, `/api/communication/v1` |
| `core.api.ts`   | Incidents               | `/api/core/v1`                         |
| `supportBot.ts` | Support bot             | `/api/support-bot/v1`                  |

**Rules:**

- Export plain `async function`s - no classes, no singletons in service files
- Declare a path constant at the top: `const CORE = '/api/core/v1'`
- Never put API logic inside a component - always call a service function
- Never duplicate the same call across two service files

---

## Types

All shared interfaces live in `src/types/`, named `<domain>.types.ts`.

```
src/types/
├── chat.types.ts    # Message, WSMessagePayload, Reaction, ReactionUpdateEvent
└── core.types.ts    # Incident, IncidentLocation, IncidentAlertPayload
```

**Rules:**

- Never define an interface inline inside a service or component file
- Service files re-export their own types: `export type { Incident } from '../types/core.types'`
- `api.ts` re-exports all domain types for backward compatibility
- Use `any` only when mapping raw API responses, and immediately cast to a typed interface

---

## Authentication

`authService` (singleton in `src/services/auth.ts`) owns all auth state.

```typescript
authService.isAuthenticated(); // boolean
authService.getCurrentUser(); // AuthUser | null
authService.getToken(); // string | null - rarely needed
```

- Never read `localStorage` keys directly for auth state - use `authService`
- `request.ts` calls `authService.authenticatedFetch()` automatically when `auth: true`
- 401 → token refresh → retry happens inside `authenticatedFetch`, transparent to callers
- 403 → throws `'Insufficient permissions...'`, handle in the UI

---

## React - Component Architecture

### The Single Responsibility Principle

Every component does **one thing**. A component that fetches data, transforms it,
handles form state, renders a table, AND manages a modal is doing five things.
Break it up.

```
❌ BigMonolithicDashboard.tsx (600 lines, does everything)

✅
ERTDashboardPage.tsx       - fetches data, composes organisms
  IncidentTable.tsx         - organism: renders the list + filters
    IncidentCard.tsx        - molecule: renders one card
      SeverityBadge.tsx     - atom: styled badge
  CreateIncidentModal.tsx   - organism: modal + form
```

### Container / Presenter pattern

**Page/Container** (smart): fetches data, holds state, passes props down.
**Organism/Molecule** (presenter): receives props and renders UI - no API calls.

```typescript
// ✅ Page - knows about data
function IncidentListPage() {
  const { incidents, isLoading, error, refetch } = useIncidents();
  return <IncidentTable incidents={incidents} isLoading={isLoading} error={error} onRetry={refetch} />;
}

// ✅ Organism - only knows about display
function IncidentTable({ incidents, isLoading, error, onRetry }: IncidentTableProps) {
  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  return incidents.map(i => <IncidentCard key={i.id} {...spreadOnlyPrimitives(i)} />);
}
```

### When to split a component out

Split when ANY of these are true:

- The component file exceeds ~200 lines
- A piece of UI is used in more than one place
- A section has its own distinct state (e.g. a form inside a page)
- You find yourself writing a comment like `{/* --- Filters Section --- */}`
  - that comment is telling you it should be its own component
- The JSX nesting depth exceeds ~4 levels

### Props design

- Pass individual fields, not whole objects, into molecules and atoms
- Keep prop interfaces lean - if a component needs 10+ props, it is probably doing too much
- Use `children` for content slots, not a `content` prop
- Boolean props use `is`/`has` prefix: `isLoading`, `hasError`, `isOpen`

```typescript
// ❌ Passing the whole Incident object into a card
<IncidentCard incident={incident} />

// ✅ Only the fields the card actually uses
<IncidentCard
  id={incident.id}
  title={incident.title}
  severity={incident.severity}
  locationAddress={incident.location.address}
  createdAt={incident.created_at}
  onClick={handleSelect}
/>
```

### Extract reusable UI into atoms

If you write the same pattern of Tailwind classes and markup twice, extract an atom.

```typescript
// ❌ Copy-pasted badge markup in 6 places
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
  Critical
</span>

// ✅ SeverityBadge atom - change once, fixed everywhere
<SeverityBadge severity="P0" />
```

---

## React - Hooks

### Rules of hooks (non-negotiable)

1. Only call hooks at the **top level** of a component - never inside loops, conditions, or callbacks
2. Only call hooks inside React function components or custom hooks

```typescript
// ❌ Hook inside a condition
if (isAdmin) {
  const [data, setData] = useState([]); // NEVER
}
```

### useState - when to split vs combine

Split state when values change independently. Combine when they always change together.

```typescript
// ✅ Even better - extract to a custom hook
const { incidents, isLoading, error, refetch } = useIncidents();
```

### useEffect - the most misused hook

**Every `useEffect` must answer two questions:**

1. What triggers this effect? (the dependency array)
2. What cleanup is needed when this effect stops?

```typescript
// ❌ Missing dependency - stale closure bug
useEffect(() => {
  fetchData(userId); // userId will always be the initial value
}, []); // should be [userId]

// ❌ Missing cleanup - memory leak
useEffect(() => {
  const id = setInterval(fetchData, 30_000);
  // forgot: return () => clearInterval(id)
}, []);

// ✅ Correct
useEffect(() => {
  fetchData(userId);
  const id = setInterval(() => fetchData(userId), 30_000);
  return () => clearInterval(id);
}, [userId, fetchData]);
```

**Do not put async functions directly in useEffect:**

```typescript
// ❌ useEffect cannot be async
useEffect(async () => {
  const data = await fetchData();
}, []);

// ✅ Use useCallback + call in effect
const fetchData = useCallback(async () => {
  setIncidents(await getIncidents());
}, []);

useEffect(() => {
  fetchData();
  const id = setInterval(fetchData, 30_000);
  return () => clearInterval(id);
}, [fetchData]);
```

### useCallback and useMemo - use them deliberately

`useCallback` memoizes a **function reference**. `useMemo` memoizes a **computed value**.

Use them when:

- A function is a `useEffect` dependency
- A computation is genuinely expensive (sorting/filtering large arrays)

Do NOT use them on every function "just in case" - it adds overhead and obscures code.

```typescript
// ❌ Pointless
const title = useMemo(() => `${first} ${last}`, [first, last]);

// ✅ Worth it - heavy filter + sort over hundreds of items
const filtered = useMemo(
  () =>
    incidents
      .filter((i) => i.severity === selectedSeverity)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
  [incidents, selectedSeverity],
);
```

### Custom hooks - extract logic out of components

If a component has more than ~3 related state variables and effects, extract a custom hook.
Custom hooks live in `src/hooks/use<Feature>.ts`.

```typescript
// src/hooks/useIncidents.ts
export function useIncidents(pollInterval = 30_000) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      setIncidents(await getIncidents());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { incidents, isLoading, error, refetch: fetch };
}
```

---

## React - State Management

### Keep state as local as possible

Don't lift state higher than necessary. If only one component needs it, keep it there.

### Derived state - don't duplicate

```typescript
// ❌ Stored state that can get out of sync
const [criticalCount, setCriticalCount] = useState(0);

// ✅ Derived - always consistent
const criticalCount = incidents.filter((i) => i.severity === "P0").length;
```

### Loading and error state is not optional

Every async operation must handle all three states: loading, error, success.

```typescript
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage message={error} onRetry={refetch} />;
return <IncidentList incidents={incidents} />;
```

---

## Tailwind CSS

### Use design tokens, not arbitrary values

```typescript
// ❌ Arbitrary values - breaks visual consistency
<div className="mt-[13px] text-[13px] w-[347px]">

// ✅ Tailwind scale
<div className="mt-3 text-sm w-80">
```

### Established dark theme tokens

This project uses a layered dark theme. Do not introduce new shades that break
the depth hierarchy:

| Layer      | Class                           | Used for                        |
| ---------- | ------------------------------- | ------------------------------- |
| Deepest    | `bg-gray-950`                   | Page / screen background        |
| Surface    | `bg-gray-900`                   | Cards, panels, sidebars         |
| Elevated   | `bg-gray-800`                   | Inputs, dropdowns, hover states |
| Border     | `border-gray-800`               | All borders                     |
| Muted text | `text-gray-400`                 | Labels, metadata, placeholders  |
| Body text  | `text-white`                    | Primary content                 |
| Accent     | `text-blue-400` / `bg-blue-600` | Actions, active states          |

### Use the `cn()` utility for conditional classes

```typescript
import { cn } from '../ui/utils';

// ❌ String concatenation - space bugs waiting to happen
<button className={"px-4 py-2 " + (isActive ? "bg-blue-600" : "bg-gray-800")}>

// ✅ cn() handles merging and conditionals
<button className={cn(
  "px-4 py-2 rounded-lg transition-colors",
  isActive ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
)}>
```

### Group classes by concern

When a class list is long, order by: layout → size → spacing → visual → interaction.

```typescript
// ❌ Random order - impossible to scan
<div className="text-white rounded-lg hover:bg-gray-700 flex p-4 items-center bg-gray-900 border border-gray-800 gap-3 cursor-pointer transition-colors w-full">

// ✅ Grouped
<div className={cn(
  "flex items-center gap-3",                                    // layout
  "w-full",                                                     // size
  "p-4",                                                        // spacing
  "bg-gray-900 border border-gray-800 rounded-lg text-white",  // visual
  "cursor-pointer transition-colors hover:bg-gray-700"          // interaction
)}>
```

### Extract repeated class patterns into atoms

If the same set of classes appears 3+ times, it belongs in a component, not
copy-pasted markup.

### Never use inline styles for layout

```typescript
// ❌ Should be Tailwind
<div style={{ display: 'flex', gap: '12px' }}>

// ✅
<div className="flex gap-3">

// ✅ Inline style is ONLY justified for truly dynamic runtime values
<div style={{ width: `${progress}%` }} className="h-2 bg-blue-500 rounded-full" />
```

---

## Responsive Design & Screens

### This is a dashboard - design desktop-first

```
lg:    1024px+  - primary target (ops centre desktop)
md:    768px+   - tablet / laptop
sm:    640px+   - large phone landscape
(base) -        - fallback, not primary
```

### Think in layouts before writing markup

Before writing any JSX for a new page, answer these questions:

1. What is the top-level layout? (sidebar + content? full-width? two-column?)
2. What is fixed/sticky and what scrolls?
3. What collapses on smaller screens?
4. What is the minimum viable content if the viewport is narrow?

```typescript
// ❌ No thought given to layout - produces a broken mess on any screen
<div>
  <div>Sidebar</div>
  <div>Main content</div>
</div>

// ✅ Explicit, responsive, intentional
<div className="flex h-screen overflow-hidden">
  <aside className="hidden lg:flex w-72 flex-col flex-shrink-0 border-r border-gray-800 bg-gray-900" />
  <main className="flex-1 min-w-0 overflow-y-auto" />
</div>
```

### Established layout patterns

```typescript
// Two-pane (CommunicationCenter)
<div className="flex h-screen overflow-hidden">
  <aside className="w-[30%] min-w-[260px] max-w-[360px] flex-shrink-0" />
  <main className="flex-1 min-w-0 overflow-y-auto" />
</div>

// Dashboard stat grid
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" />

// Full-page with sticky header + scrolling body
<div className="min-h-screen bg-gray-950 flex flex-col">
  <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex-shrink-0" />
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto px-6 py-6" />
  </div>
</div>

// Modal / overlay
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" />
```

---

## Accessibility

Accessibility is not optional. Emergency response tools may be used under stress,
by people with varying abilities, on degraded hardware.

### Use semantic HTML - not div soup

```typescript
// ❌
<div onClick={handleClick}>View incident</div>
<div className="heading">Dashboard</div>

// ✅
<button onClick={handleClick}>View incident</button>
<h1>Dashboard</h1>
```

Correct elements: `<button>` for actions, `<a>` for links, `<h1>`–`<h6>` in order,
`<ul>`/`<li>` for lists, `<table>` for tabular data, `<form>` + `<label>` for inputs.

### Every interactive element must be keyboard accessible

`<button>` handles this automatically. `<div onClick>` does not.

```typescript
// ❌ Keyboard inaccessible
<div onClick={handleSelect} className="cursor-pointer">{incident.title}</div>

// ✅
<button onClick={handleSelect} className="w-full text-left ...">{incident.title}</button>
```

### Labels for all form inputs

```typescript
// ❌
<Input placeholder="Search incidents..." />

// ✅ Visible label
<label htmlFor="incident-search">Search</label>
<Input id="incident-search" placeholder="Search incidents..." />

// ✅ Icon-only - aria-label
<Input aria-label="Search incidents" placeholder="Search..." />
```

### Icon-only buttons need aria-label

```typescript
// ❌ Screen reader says "button" - no context
<button onClick={onClose}><X className="w-4 h-4" /></button>

// ✅
<button onClick={onClose} aria-label="Close modal">
  <X className="w-4 h-4" aria-hidden="true" />
</button>
```

### ARIA live regions for dynamic updates

```typescript
// Status messages
<div role="status" aria-live="polite">
  {notifyStatus === 'success' && 'Alert sent successfully'}
</div>

// Errors
<div role="alert" aria-live="assertive">
  {error && <ErrorMessage message={error} />}
</div>
```

### Communicate loading to screen readers

```typescript
<div aria-busy={isLoading} aria-label="Loading incidents">
  {isLoading ? <LoadingSpinner /> : <IncidentList incidents={incidents} />}
</div>
```

### Colour alone must not convey information

```typescript
// ❌ Colour blind users cannot distinguish
<span className={isOnline ? 'bg-green-500' : 'bg-red-500'} />

// ✅ Colour + text
<span className="flex items-center gap-1.5 text-red-400">
  <span className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
  Critical
</span>
```

---

## Polling & Real-time Data

### Standard intervals

| Data           | Interval   |
| -------------- | ---------- |
| Incidents list | 30 seconds |
| Weather        | 10 minutes |

### Polling pattern (mandatory)

```typescript
const fetchIncidents = useCallback(async () => {
  setError(null);
  try {
    setIncidents(await getIncidents());
  } catch (e: any) {
    setError(e.message);
  } finally {
    setIsLoading(false);
  }
}, []);

useEffect(() => {
  fetchIncidents();
  const id = setInterval(fetchIncidents, 30_000);
  return () => clearInterval(id); // ← NOT optional
}, [fetchIncidents]);
```

### WebSocket cleanup

```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handleMessage;
  return () => ws.close(); // ← always close on unmount
}, [url]);
```

---

## TypeScript

### No `any` except when mapping raw API data

```typescript
// ❌ Throws away all type safety
async function getUser(): Promise<any> { ... }

// ✅ Properly typed
async function getUser(): Promise<User> { ... }

// ✅ `any` is acceptable only immediately before casting to a typed shape
function mapIncident(inc: any): Incident {
  return { id: inc.ID, type: inc.Type ?? 'Unknown', ... };
}
```

### Prefer `interface` for object shapes, `type` for unions/aliases

```typescript
interface Incident {
  id: string;
  type: string;
} // shape → interface
type Severity = "P0" | "P1" | "P2" | "P3"; // union → type
type Status = "reported" | "verified" | "resolved"; // union → type
```

### Type event handlers properly

```typescript
// ❌ Implicit any
const handleChange = (e) => setQuery(e.target.value);

// ✅
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
  setQuery(e.target.value);
```

---

## Adding a New Feature - Checklist

Before writing any code, answer:

1. **What data does this feature need?**
   - Existing service function? Use it.
   - New endpoint? Add to the correct `<domain>.api.ts`.
   - New types? Add to `src/types/<domain>.types.ts`.

2. **What is the component breakdown?**
   - Identify atoms (badges, icons, labels) needed
   - Identify molecules (cards, rows, inputs) needed
   - Identify the organism (full section) that composes them
   - The page just fetches data and composes organisms

3. **How does the page get its data?**
   - URL param? localStorage? Auth state?
   - It does NOT receive data objects from a parent component
   - It does NOT depend on navigation state that could be undefined on refresh

4. **PR checklist:**
   - [ ] New service file named `<domain>.api.ts`
   - [ ] New types in `src/types/<domain>.types.ts`
   - [ ] No bare `fetch()` for Beacon APIs - use `request`
   - [ ] No whole objects passed via navigation - IDs only
   - [ ] Page fetches its own data independently
   - [ ] UI broken into atom / molecule / organism / page layers
   - [ ] All `useEffect`s have correct deps and cleanup
   - [ ] All form inputs have labels, all icon buttons have `aria-label`
   - [ ] All async operations have `isLoading` and `error` state
   - [ ] No inline `style={{}}` for layout
   - [ ] No `any` except raw API mapping
   - [ ] No component over 200 lines

---

## What NOT to Do - Quick Reference

```typescript
// ❌ Vibe code - unstyled div soup with no semantics or structure
<div class="div1"><div class="inner"><div onClick={x}>click</div></div></div>

// ❌ God component (600 lines, fetches, renders, manages modals, does everything)
function Dashboard() { /* ... */ }

// ❌ Passing full objects through navigation
navigate('incident-details', incident); // fragile - use navigate('incident-details', incident.id)

// ❌ Page that depends on data passed by parent (breaks on refresh/direct link)
function IncidentDetailsPage({ incident }: { incident: Incident }) { /* crashes if undefined */ }

// ❌ Molecule/atom that fetches its own data
function IncidentCard({ incidentId }: { incidentId: string }) {
  const data = await getIncidentById(incidentId); // WRONG - fetch in the page
}

// ❌ File named inconsistently
incidents-service.ts  // should be incidents.api.ts
IncidentTypes.ts      // should be incident.types.ts
useincidents.ts       // should be useIncidents.ts

// ❌ Bare fetch for Beacon API
const res = await fetch('/api/core/v1/incidents');

// ❌ useEffect with wrong deps
useEffect(() => { fetchData(id); }, []); // id will always be stale

// ❌ Missing cleanup
useEffect(() => { const id = setInterval(fn, 5000); }, []);

// ❌ Missing loading/error state
const [data, setData] = useState([]);
useEffect(() => { getIncidents().then(setData); }, []);
return <Table data={data} />; // blank screen on load, silent error

// ❌ Arbitrary Tailwind values
<div className="mt-[17px] w-[342px] text-[13.5px]">

// ❌ Inline styles for layout
<div style={{ display: 'flex', gap: '12px' }}>
```

---

## Running the Project

```bash
npm run dev           # Start dev server (Vite proxy active)
npm run build         # Production build
npm run build:check   # TypeScript check + build (run before committing)
npm run lint          # ESLint
```

Copy `.env.example` to `.env.local` for local backend development:

```
VITE_IAM_SERVICE_URL=http://localhost:8081
VITE_API_BASE_URL=http://localhost:8081
```
