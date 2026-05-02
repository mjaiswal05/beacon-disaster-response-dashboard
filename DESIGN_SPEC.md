# Beacon ERT - Design Specification

> Complete product brief for a UI/UX revamp. Use this document to instruct Figma AI, a design system, or a design agency to recreate every screen from scratch.

---

## 1. Product Overview

**Beacon ERT** is a real-time Emergency Response Team dashboard used by first responders and system administrators in Ireland. It aggregates live incidents from a backend microservice, plots them on a geographic map, manages ERT team rosters, enables team communication via WebSocket chat, and dispatches response units - all from a single dark-themed web application.

### User Roles

| Role               | Access                                             |
| ------------------ | -------------------------------------------------- |
| `ROLE_SYS_ADMIN`   | All screens + create/edit/delete ERT members       |
| `ROLE_ERT_MEMBERS` | All screens except "Create Member" form            |
| Unauthenticated    | Login page only; redirected on any protected route |

### Technology Stack (for design context)

- React + TypeScript, Tailwind CSS, shadcn/ui component library
- Maps: TomTom Web SDK (night-mode tile style) + OpenStreetMap Nominatim geocoding
- Charts: Recharts
- WebSocket: real-time incident communication
- Color palette: dark gray (`gray-950` background, `gray-900` surfaces, `gray-800` cards/inputs, `gray-700` borders)

---

## 2. Design System Tokens

### Colors

| Token             | Hex                    | Usage                          |
| ----------------- | ---------------------- | ------------------------------ |
| Background        | `#030712` (gray-950)   | App background                 |
| Surface           | `#111827` (gray-900)   | Sidebar, header, cards         |
| Surface Elevated  | `#1f2937` (gray-800)   | Inputs, secondary cards        |
| Border            | `#374151` (gray-700)   | Dividers, input borders        |
| Text Primary      | `#ffffff`              | Headings, values               |
| Text Secondary    | `#9ca3af` (gray-400)   | Labels, metadata               |
| Text Muted        | `#6b7280` (gray-500)   | Timestamps, hints              |
| Accent Blue       | `#2563eb` (blue-600)   | Primary CTA, active nav, links |
| Accent Purple     | `#9333ea` (purple-600) | Evacuation actions, AI widget  |
| Severity Critical | `#ef4444` (red-500)    | P0 incidents                   |
| Severity High     | `#f97316` (orange-500) | P1 incidents                   |
| Severity Medium   | `#eab308` (yellow-500) | P2 incidents                   |
| Severity Low      | `#3b82f6` (blue-500)   | P3 incidents                   |
| Success           | `#22c55e` (green-500)  | Active units, success states   |

### Severity Badge System

Every incident carries a priority level rendered as a small colored pill:

| Code | Label    | Background    | Text       |
| ---- | -------- | ------------- | ---------- |
| P0   | Critical | red-500/20    | red-400    |
| P1   | High     | orange-500/20 | orange-400 |
| P2   | Medium   | yellow-500/20 | yellow-400 |
| P3   | Low      | blue-500/20   | blue-400   |

### Incident Type Icons (Lucide)

Fire → `Flame` · Flood → `Droplets` · Gas Leak / Storm / Chemical Spill → `Wind` · Building Collapse / Earthquake → `Building2` · Medical Emergency / Other → `AlertTriangle` · Traffic Accident → `Truck` · Evacuation → `MapPin`

---

## 3. Global Layout Shell

All authenticated screens share the **DashboardLayout** - a three-zone layout.

```
┌─────────────────────────────────────────────────────┐
│  TOPBAR (sticky, 64px tall, gray-900)               │
│  ☰  [Search incidents, locations…]  🔔 [Avatar ▾]   │
├──────────────────┬──────────────────────────────────┤
│  SIDEBAR         │  PAGE CONTENT (scrollable)       │
│  (256px / 0px)   │                                  │
│  [nav items]     │  <Outlet />                      │
│                  │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
                                  [AI Chat FAB]  ●
```

### 3.1 Sidebar (Left, collapsible)

- **Width:** 256 px open · 0 px collapsed (CSS transition)
- **Toggle:** hamburger button in topbar
- **Logo area:** top section, "Beacon ERT" with `LayoutDashboard` icon in blue

**Nav Items** (icon + label, 16px padding, 8px border-radius):

| Label          | Icon              | Route             | Visibility          |
| -------------- | ----------------- | ----------------- | ------------------- |
| Dashboard      | `LayoutDashboard` | `/`               | All                 |
| Incidents      | `AlertTriangle`   | `/incidents`      | All                 |
| Communication  | `MessageSquare`   | `/communication`  | All                 |
| Analytics      | `BarChart3`       | `/analytics`      | All                 |
| ERT Management | `Users`           | `/ert-management` | SysAdmin + ERT only |
| Settings       | `Settings`        | `/profile`        | All                 |

**Active state:** solid blue-600 background, white text.
**Inactive hover:** gray-800 background, white text.
**Inactive rest:** gray-400 text.

### 3.2 Topbar (Top, sticky)

Left side:

- Hamburger toggle button (`Menu` icon)
- Search input: 320px wide, placeholder "Search incidents, locations…", magnifier icon left-padded, gray-800 background

Right side:

- Notification bell (`Bell` icon) with red 8px dot indicator (top-right)
- User avatar: 40px circle, blue-600 fill, `User` icon
  - **Dropdown menu** (align end, 224px wide):
    - Profile → navigates to `/profile`
    - ─── separator ───
    - Logout → in red-400 text

### 3.3 AI Chat Widget (Global Floating, z-9999)

Always visible on all authenticated screens, fixed to bottom-right corner.

**Closed state - FAB:**

- 56×56px circle, purple-600→blue-600 gradient
- `Bot` icon centered
- Pulse ring animation (purple-500, opacity 25%)
- 12px status dot top-right: gray = pending, green = connected, red = disconnected

**Open state - Chat panel** (384×500px, gray-900, rounded-2xl, shadow-2xl):

Header (gradient purple-to-blue, 12px padding):

- Left: 32px icon tile (Sparkles icon) + "Beacon AI" title + connection status subtitle
- Right: minimize/maximize toggle + close (×) button

Body (scrollable, 16px padding):

- **History loading state:** centered spinner + "Loading conversation…" label
- **Messages:** chat bubbles
  - User: right-aligned, blue-600 fill, rounded-br-md corner flat
  - Assistant: left-aligned, gray-800 fill, rounded-bl-md; shows Bot icon + "AI" label above
  - Error: left-aligned, red-500/20 fill + red border; shows AlertCircle icon + "Error" label above
  - Timestamp (10px, 50% opacity) in bottom-right of each bubble

**Suggested prompts** (shown on empty chat only):
Four pill buttons in a flex-wrap row:

- "What should I do during a flood?"
- "How to prepare for an earthquake?"
- "Emergency evacuation procedures"
- "First aid basics"

Footer (gray-900, border-top gray-800):

- Text input (flex-1, gray-800) + Send button (purple-600, icon-only)
- Below: "Clear chat" text link (left) | "Powered by Beacon Support Bot" (right, muted)

**Minimized state:** only the gradient header strip visible (288×56px), expand/collapse controls remain.

---

## 4. Screen Specifications

---

### Screen 1 - Login

**Route:** `/login`
**Layout:** Full page, no sidebar, no topbar.

```
┌──────────────────────────────────────┐
│  Background: solid #0066FF blue      │
│                                      │
│      ┌────────────────────────┐      │
│      │  [TowerControl icon]   │      │
│      │  (white, 112×112px,    │      │
│      │   rounded-2xl shadow)  │      │
│      └────────────────────────┘      │
│                                      │
│          BEACON                      │
│   Stay safe and informed             │
│   during emergencies                 │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Error banner (conditional)     │  │
│  │ ⚠ [error message]             │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Username                      │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Password                  👁  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ╔════════════════════════════════╗  │
│  ║          LOG IN                ║  │
│  ╚════════════════════════════════╝  │
│                                      │
│         Forgot password?             │
└──────────────────────────────────────┘
```

**Components:**

- Logo: white rounded square (border-radius: 32px), `TowerControl` icon in #0066FF
- App name: white, 30px bold, letter-spaced
- Tagline: blue-100 (light), 14px
- Error banner: red-500/20 background, red-500/30 border, rounded-xl, `AlertTriangle` icon + message
- Inputs: white/10 background, white/20 border, white text, blue-200 placeholder; rounded-xl; 14px, 14px vertical padding
- Password field: right-side eye icon toggle (`Eye`/`EyeOff`)
- Submit: white background, #0066FF text, bold, uppercase, pill shape (rounded-full), full width
- Loading state on submit: spinner + "Logging in..." text
- Forgot password: blue-200, 12px, center-aligned anchor

**States:**

- Default
- Loading (fields + button disabled, spinner in button)
- Error (red banner above form)
- Auth-redirect (if already logged in, instantly redirects to `/`)

---

### Screen 2 - ERT Dashboard (Home)

**Route:** `/` (index)
**Layout:** Inside DashboardLayout (sidebar + topbar visible)

Additional topbar element (specific to this screen): **"Log Incident"** red CTA button (right-aligned in topbar actions, before notification bell).

```
┌───────────────────────────────────────────────────────────────────┐
│  TOPBAR (shared) + "Log Incident" red button                      │
├─────────────────────────────────────────────────────────────────── │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ WEATHER  │  │ TOTAL    │  │ AVG RESP │  │ CITIZENS │  [4 stat │
│  │ Dublin   │  │ INCIDENTS│  │ TIME     │  │ EVACUATED│   cards] │
│  │ 12°C     │  │ 47       │  │ 8.4 min  │  │ 1,847    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
├──────────────────────────────────────┬────────────────────────────┤
│  LIVE INCIDENT MAP                   │  ACTIVE INCIDENTS PANEL    │
│                                      │  (w-96, fixed width)       │
│  [County dropdown ▾] [N incidents]  │                            │
│  [Legend: ● Crit ● High ● Med ● Low]│  Header + count + Refresh  │
│  [⛶ Fullscreen button]              │  ─────────────────────────  │
│                                      │  [incident card]           │
│  ┌──────────────────────────────┐    │  [incident card]           │
│  │   TomTom Map                 │    │  [incident card]           │
│  │   colored markers per        │    │  [incident card]  ↕ scroll │
│  │   severity on click → detail │    │  [incident card]           │
│  └──────────────────────────────┘    │  ─────────────────────────  │
│                                      │  "Showing X of Y" footer   │
└──────────────────────────────────────┴────────────────────────────┘
```

#### 2a. Stat Cards (4-column grid)

**Card 1 - Weather Widget**

- Label: "Dublin Weather" (gray-400, 12px)
- Value: temperature (18px white bold) + "feels X°" (gray-500, 12px) side by side
- Sub-row: wind speed + direction (Wind icon) | humidity % (Droplets icon)
- Right icon: 40px tile with sky-500 gradient background, weather condition icon
- Conditional precipitation badge: blue-500/20 pill showing "Xmm" when precipitation > 0
- States: Loading (spinner), Available (data), Unavailable (grayed out)

**Card 2 - Total Incidents**

- Label: "Total Incidents"
- Value: live count from API
- Right icon: red-500/20 gradient tile, `AlertTriangle` in red-400

**Card 3 - Avg Response Time**

- Label: "Avg Response Time"
- Value: "8.4 min" (static)
- Right icon: blue-500/20 gradient tile, `Truck` in blue-400

**Card 4 - Citizens Evacuated**

- Label: "Citizens Evacuated"
- Value: "1,847" (static)
- Right icon: green-500/20 gradient tile, `MapPin` in green-400

#### 2b. Live Incident Map

Fills remaining vertical height (flex-1). Contains:

- Map header row: title "Live Incident Map" + controls (county select, count text, legend pills, fullscreen button)
- County dropdown: native `<select>`, gray-800, all 26 Irish counties
- Legend: 4 dot+label pairs (Critical/High/Medium/Low)
- Fullscreen button (⛶): opens fullscreen modal overlay
- Map area: absolutely positioned within card, fills entire remaining space, border gray-700 rounded-lg
- Map tiles: TomTom dark night style
- Markers: colored circles per severity, clickable → navigates to Incident Detail

**Fullscreen Map Modal:**

- `fixed inset-0 z-9999` overlay, gray-950 background
- Header bar: title, legend, close (×) button
- Map fills remaining space
- Preserves county filter selection

#### 2c. Active Incidents Panel (right column, 384px wide)

Panel structure:

- **Header:** AlertTriangle icon tile + "Active Incidents" + red count badge + Refresh button (ghost, small)
- **Body (scrollable):** incident cards
- **Footer:** "Showing X of Y incidents" (gray-500, 10px, centered)

**Incident Card:**

```
┌─────────────────────────────────────────┐
│ [type icon]  Title or Type              │
│   40×40px    ─────────────────────      │
│   colored    [Severity] [Status] [time] │
│   tile       📍 Location address        │
│                                     ›   │
└─────────────────────────────────────────┘
```

- Icon tile: 36×36px, gradient bg + ring per severity color
- Severity badge: colored pill (10px)
- Status badge: gray-700 pill (10px)
- Time ago: gray-500 (10px)
- Location: MapPin icon + truncated address
- Chevron right on hover
- Hover: gray-800/80 bg + blue-600/50 border
- Click → navigate to incident detail

**Loading state:** 4 skeleton cards (gray-700 animated pulse)
**Error state:** orange warning bar with message
**Empty state:** centered AlertTriangle icon + "No active incidents" + "All clear for now"

#### 2d. Log Incident Modal

Full-screen overlay (black/50 backdrop). 2-column form card (max-w-2xl).

```
Header: ⚠ Log New Incident + description
─────────────────────────────────────────
Left column:            Right column:
  Incident Title*         Location Address* [search autocomplete]
  Incident Type* (select) Latitude   Longitude
  Severity Level* (select)
  Affected Radius (meters) Description* (textarea, 4 rows)
─────────────────────────────────────────
Footer: [Cancel] [⚠ Log Incident]
```

**Location autocomplete:**

- Text input, debounced 500ms, calls OpenStreetMap Nominatim
- Suggestion dropdown (absolute, max-h-60 scrollable):
  - Each result: display name (white) + "📍 Lat: X, Lng: Y" (gray-400)
  - Click → populates address + lat/lng fields

**Type options:** Fire 🔥 · Flood 🌊 · Earthquake 🏗️ · Gas Leak 💨 · Building Collapse 🏢 · Medical Emergency 🚑 · Traffic Accident 🚗 · Chemical Spill ☢️ · Storm ⛈️ · Evacuation 📍 · Other ⚠️

**Severity options:** P0 🔴 Critical · P1 🟠 High · P2 🟡 Medium · P3 🔵 Low

**Button states:** "Log Incident" disabled until title, type, description, address are filled. Loading state shows spinner.

---

### Screen 3 - All Incidents

**Route:** `/incidents`
**Layout:** Inside DashboardLayout

```
Header: ← All Incidents  "N incidents in [County]"      [Refresh]
───────────────────────────────────────────────────────────────────
Filter card:
  [🔍 Search by title, type, or location…]  [📍 County ▾]
  [All] [Critical] [High] [Medium] [Low]    ← severity pills
───────────────────────────────────────────────────────────────────
Incident list (full width, 1 column, 12px gap):
  ┌──────────────────────────────────────────────────────────┐
  │ [type icon 48px]  Title                [Severity badge]  │
  │                   📍 Location  ·  time ago  ·  status    │
  │                   Description preview (2 lines clamped)  │
  │                                                       ›  │
  └──────────────────────────────────────────────────────────┘
  [repeat]
```

**Filter pills behavior:** clicking a severity pill filters the list in real time. County dropdown: custom dropdown with 26 Irish counties, scrollable (max-h-72).

**States:**

- Loading: 5 skeleton cards (animated pulse)
- Empty (no data): AlertTriangle icon + "No incidents found" + hint to adjust filters
- Populated: scrollable list

**Click on any card → `/incidents/:id`**

---

### Screen 4 - Incident Detail

**Route:** `/incidents/:id`
**Layout:** Inside DashboardLayout

```
Header: ← Incident Details  ID: [uuid]    [Refresh] [● Severity badge]
────────────────────────────────────────────────────────────────────────
Main grid (2/3 width + 1/3 width):
  ┌────────────────────────────────┐  ┌──────────────────────┐
  │  ⚠ Incident Overview          │  │  🚛 Assigned Units   │
  │  Title (large, bold)          │  │  [unit] ── [Active]  │
  │  Type                         │  │  [unit] ── [Active]  │
  │  Description (full text)      │  │  [unit] ── [Active]  │
  │  Location     │ Reported time │  │  ─────────────────── │
  │  Affected     │ Affected      │  │  Status: Reported    │
  │  Citizens     │ Radius        │  │  Response Time: 6.2m │
  │  Response Team│ Reported By   │  └──────────────────────┘
  │  Verified By (if present)     │
  └────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  🗺 Incident Location  [📍 Coordinates Available badge] │
  │  ┌───────────────────────────────────────────────────┐  │
  │  │  TomTom Map centered on incident, zoom 14         │  │
  │  │  Top overlay: incident title + location + sev     │  │
  │  │  Bottom-right: 📍 lat, lng (monospace)            │  │
  │  │  Bottom-left: ● Active Incident dot indicator     │  │
  │  └───────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────┘

  Action buttons (3 equal columns, 56px tall):
  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
  │ 🚛 Dispatch Unit│ │ 🔔 Notify Citizens│ │ 🗺 Evacuation Plan │
  │    (blue-600)   │ │  (orange-600)     │ │   (purple-600)      │
  └─────────────────┘ └──────────────────┘ └─────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  Incident Timeline                                      │
  │  ●── Incident reported by [name]  · timestamp          │
  │  │                                                      │
  │  ●── Units dispatched             · +2 mins            │
  │  │                                                      │
  │  ●── First responders arrived     · +6 mins            │
  │  │                                                      │
  │  ⊙── Response team actively managing [type]  · Now     │
  └─────────────────────────────────────────────────────────┘
```

**Map fallback** (no coordinates): animated pulsing severity-colored circle on grid pattern background + location address label.

**Notify Citizens Button states:** idle (orange) → loading "Sending Alert…" (spinner) → success "Citizens Notified!" (green + CheckCircle) → error "Failed to Notify" (red + XCircle). Resets after 3 seconds.

#### Notify Citizens Modal (overlay)

```
╔═══════════════════════════════════════════╗
║  [🔔 icon]  Notify Citizens               ×
║             Send emergency alert to area  ║
╠═══════════════════════════════════════════╣
║  Incident summary card:                   ║
║  [Title]           [Severity badge]       ║
║  📍 Location                              ║
║  Affected Citizens: ~N people             ║
╠═══════════════════════════════════════════╣
║  Update Message (optional)                ║
║  ┌─────────────────────────────────────┐  ║
║  │  [textarea, 4 rows]                 │  ║
║  └─────────────────────────────────────┘  ║
║  "This message will be included in…"      ║
║                                           ║
║  Image URL (optional)                     ║
║  ┌─ 🖼 ─────────────────────────────────┐ ║
║  └──────────────────────────────────────┘ ║
║  [Image preview 128px tall, if URL set]   ║
╠═══════════════════════════════════════════╣
║  [Cancel]              [🔔 Send Alert]    ║
╚═══════════════════════════════════════════╝
```

**States:**

- Loading (full incident data): centered spinner + "Loading incident details…"
- Error: AlertTriangle icon + error message + "Try Again" button
- Not found: AlertTriangle + "Incident not found"

---

### Screen 5 - Dispatch Panel

**Route:** `/incidents/:id/dispatch`
**Layout:** Inside DashboardLayout

```
Header: ← Dispatch Units  Incident [ID]
───────────────────────────────────────────
Section: Available Units (2-column grid)

  ┌─────────────────────────────┐ ┌──────────────────────────────┐
  │ [☑] Fire Truck 15          │ │ [☑] Ambulance 9              │
  │     📍 2.3 km · ETA 4 min  │ │     📍 1.5 km · ETA 3 min   │
  │     Crew: 6  [Available]   │ │     Crew: 3  [Available]     │
  └─────────────────────────────┘ └──────────────────────────────┘
  [repeat for 6 total units]

Section: Dispatch Summary (appears when units selected)
  "N unit(s) selected: Fire Truck 15, Ambulance 9…"

  [Dispatch Selected Units]  ← CTA button, disabled if no selection
───────────────────────────────────────────
Success state (replaces above):
  [✓ green checkmark]
  "Units Dispatched Successfully"
  "Fire Truck 15, Ambulance 9 are en route…"
  [Return to Incident]
```

**Unit card anatomy:**

- Checkbox indicator (selected = blue border + checkmark background)
- Type icon (`Truck`, `Ambulance`, `Shield`) in colored tile
- Unit name (bold)
- Distance + ETA
- Crew count
- Status badge: "Available" (green) or "En Route" (yellow)

**Units available (6 static):**

1. Fire Truck 15 - 2.3 km, 4 min ETA, crew 6, Available
2. Fire Truck 18 - 3.8 km, 7 min ETA, crew 6, Available
3. Ambulance 9 - 1.5 km, 3 min ETA, crew 3, Available
4. Ambulance 11 - 4.2 km, 8 min ETA, crew 3, Available
5. Police Unit 32 - 1.8 km, 3 min ETA, crew 2, Available
6. Police Unit 35 - 2.9 km, 5 min ETA, crew 2, En Route

---

### Screen 6 - Evacuation Plan

**Route:** `/incidents/:id/evacuation`
**Layout:** Inside DashboardLayout

```
Header: ← Evacuation Plan
───────────────────────────────────────────────────────────
Left panel (map, fills remaining height):
  TomTom dark-night map, zoom 14, centered on incident

  Map overlays:
  - Red pulsing danger zone: 120px radial gradient + 50px
    red circle with ⚠ icon, CSS pulse animation
  - Green safe zone markers: Home icon, white fill
  - Traffic flow layer (TomTom SDK)

Right panel (384px, scrollable):
  ┌─────────────────────────────────────┐
  │  ✅ Safe Zones (3 items)            │
  │  ────────────────────────────────── │
  │  Central Park Shelter               │
  │  Capacity: 500 · Distance: 1.2 km  │
  │  ● Available                        │
  ├─────────────────────────────────────┤
  │  City Stadium                       │
  │  2,000 people · 2.5 km · Available │
  ├─────────────────────────────────────┤
  │  Community Center                   │
  │  300 people · 0.8 km · Available   │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  🛣 Evacuation Routes               │
  │  ────────────────────────────────── │
  │  Route A – Main Street  ✅ Clear   │
  │  Traffic: Low                       │
  ├─────────────────────────────────────┤
  │  Route B – Harbor Way  ✅ Clear    │
  │  Traffic: Medium                    │
  ├─────────────────────────────────────┤
  │  Route C – Park Avenue  ✗ Blocked  │
  │  Traffic: High                      │
  └─────────────────────────────────────┘

  [🔔 Notify Citizens]  [📣 Send Evacuation Alert]  ← buttons
```

**Map loading state:** spinner overlay on map tile.

---

### Screen 7 - Communication Center

**Route:** `/communication`
**Layout:** Inside DashboardLayout

This is a 2-pane chat interface (IRC/Slack-style), where each _incident_ is a channel.

```
┌──────────────────────────┬──────────────────────────────────────────┐
│  CHANNEL LIST (320px)    │  CHAT AREA (flex-1)                      │
│  ─────────────────────── │  ─────────────────────────────────────── │
│  ● Incident channel 1    │  Header: incident name + WS status       │
│    Type badge            │  ────────────────────────────────────────│
│    last message preview  │  Messages (scrollable, flex-1):          │
│  ─────────────────────── │                                           │
│  ● Incident channel 2    │  [their msg] ←──────────                │
│    …                     │      avatar · sender · time  ──────────► │
│  ─────────────────────── │                                [my msg]   │
│  [loading/empty states]  │  ────────────────────────────────────────│
│                          │  Typing indicator (optional)              │
│                          │  ────────────────────────────────────────│
│                          │  Reply-to preview banner (if replying)    │
│                          │  [   Message input…      ] 😊 [Send ➤]  │
└──────────────────────────┴──────────────────────────────────────────┘
```

#### 7a. Channel List (left panel, 320px)

Header: "Communication" title + WS connection status icon (`Wifi` green / `WifiOff` red)

Each channel item (clickable, 16px vertical padding):

- Active channel: blue-900/50 left border accent
- Incident title (bold, 14px, white)
- Type badge (small colored pill)
- Last message preview (gray-400, 12px, 1 line clamped)
- Time of last message (gray-500, 10px)

Loading: spinner centered
Error: AlertTriangle + error text + retry
Empty: "No incident channels available" centered

#### 7b. Chat Area (right panel)

**No channel selected state:** centered `MessageSquare` icon + "Select a channel to start chatting" prompt.

**Active channel:**

Chat header:

- Incident name + incident type badge
- WS status dot (green/red/gray)
- "Reconnect" button if disconnected

Messages area (scrollable):

- History loaded via REST when channel selected
- New messages arrive via WebSocket in real-time
- **Sent messages** (mine): right-aligned bubble, blue-600/30 bg, rounded-tl rounded-bl rounded-br, white text
- **Received messages**: left-aligned bubble, gray-800 bg, rounded-tr rounded-br rounded-bl

**Each message bubble contains:**

- Sender name (bold, 12px) + timestamp (gray-500, 11px)
- Content text
- **Reactions row:** emoji + count chips. Quick-react on hover shows 6 emoji options (👍 ❤️ 🚨 ✅ 👀 🔥). Click any → toggles reaction. Full picker via `+` button
- **Reply button:** appears on hover (right side), opens reply context in input area

**Reply-to banner** (above input when replying):

- Gray-800 bar: "Replying to [sender]" + quoted message (1 line) + × close
- Left accent border in blue

**Typing indicator:** "User X is typing…" in gray-400, italic, appears below messages

**Input area:**

- Text input (gray-800, border-gray-700)
- Emoji button → opens full `@emoji-mart/react` picker
- Send button (blue-600)
- WS disconnect warning: yellow banner at top of chat area if disconnected

---

### Screen 8 - Analytics

**Route:** `/analytics`
**Layout:** Inside DashboardLayout

```
Header: ← Analytics Dashboard  "Emergency Response Performance Metrics"
─────────────────────────────────────────────────────────────────────
KPI Row (4 equal cards):
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ Total        │ │ Avg Response │ │ Citizens     │ │ Notification │
  │ Incidents    │ │ Time         │ │ Helped       │ │ Success Rate │
  │ 186          │ │ 8.4 min      │ │ 2,847        │ │ 89%          │
  │ ↓12% decrease│ │ ↓15% faster  │ │ ↑8% increase │ │ ↑3% up       │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

Charts (2-column, Recharts library):
  ┌───────────────────────────────┐ ┌───────────────────────────────┐
  │  Bar Chart: Incidents by Type │ │  Line Chart: Response Time     │
  │  X: Fire/Flood/Gas/…         │ │  X: Jun–Nov                    │
  │  Y: count                    │ │  Y: minutes (7.9–9.5 range)   │
  └───────────────────────────────┘ └───────────────────────────────┘

  ┌───────────────────────────────┐
  │  Pie Chart: Notification      │
  │  Delivery Status              │
  │  Delivered 89% (green)        │
  │  Pending 7% (yellow)          │
  │  Failed 4% (red)              │
  └───────────────────────────────┘
```

**KPI card anatomy:**

- Label: gray-400, 14px
- Value: white, large (28px+ bold)
- Trend: green (↓ for decrease is good, ↑ for increase is good) with `TrendingDown`/`TrendingUp` icon

**All chart data is static (mock)**; no live API connection yet.

---

### Screen 9 - ERT Management

**Route:** `/ert-management`
**Layout:** Inside DashboardLayout

```
Header: ← ERT Management
─────────────────────────────────────────────────────────────────────
Tab bar:
  [+ Create Member]  [👥 View Members]    ← SysAdmin sees both
  [👥 View Members only]                  ← ERT member sees this only

─── Create Member tab (SysAdmin only) ────────────────────────────────
Card form:
  Email *             First Name *    Last Name *
  Phone Number *      Password *  👁
  ☐ Temporary Password (auto-expires on first login)

  [Create ERT Member]  ← CTA, full width

─── View Members tab ─────────────────────────────────────────────────
Member table:
  ┌────────────┬──────────────────┬──────────────┬────────────────┬─────────┐
  │ Name       │ Email            │ Phone        │ Status         │ Actions │
  ├────────────┼──────────────────┼──────────────┼────────────────┼─────────┤
  │ John Doe   │ jdoe@beacon.ie  │ +353 …       │ ● ACTIVE       │ ✏ 🗑   │
  │ Jane Smith │ jsmith@…        │ +353 …       │ ○ INACTIVE     │ ✏ 🗑   │
  └────────────┴──────────────────┴──────────────┴────────────────┴─────────┘

  (Actions column: SysAdmin only - pencil = edit dialog, trash = delete confirm)
```

**Status badge:** ACTIVE = green-500/20 + green text, INACTIVE = gray

**Edit Member Dialog:**

```
╔══════════════════════════════════════╗
║  ✏ Edit Member  ×                   ║
╠══════════════════════════════════════╣
║  First Name    Last Name             ║
║  Email                               ║
║  Phone Number                        ║
║  Status: [Active ▾]                  ║
╠══════════════════════════════════════╣
║  [Cancel]    [Save Changes]          ║
╚══════════════════════════════════════╝
```

**Delete Confirmation Dialog:**

```
╔══════════════════════════════════════╗
║  ⚠ Confirm Delete  ×                ║
║  "Are you sure you want to remove   ║
║   [Name] from the ERT team?"         ║
║  This action cannot be undone.       ╠
║  [Cancel]  [Delete Member] (red)     ║
╚══════════════════════════════════════╝
```

**States:** Loading table (skeleton rows), Error (red banner), Empty ("No ERT members found"), Success flash message (green banner, auto-dismiss 3s).

---

### Screen 10 - Profile / Settings

**Route:** `/profile`
**Layout:** Inside DashboardLayout

```
──────────────────────────────────────────────────────────────
│  ← Profile                             [✎ Edit Profile]   │
──────────────────────────────────────────────────────────────

Top section:
  ┌─────────────────────────────────────────────────────┐
  │  [📷 Avatar circle 96px]  Full Name                 │
  │   camera overlay on hover  [Role badge]             │
  │                             ID: [uuid]              │
  └─────────────────────────────────────────────────────┘

Form sections (in edit mode: inputs editable; view mode: plain text):

  ─ Personal Information ───────────────────────────────
  First Name          Last Name
  Email               Phone

  ─ Location ──────────────────────────────────────────
  Address (full)
  City                Country

  ─ Professional Details ──────────────────────────────
  Department          Position
  Employee ID         Date Joined

  ─ Emergency Contact ──────────────────────────────────
  Contact Name        Contact Phone

  ─ Skills ─────────────────────────────────────────────
  [Skill chip] [Skill chip] [+ Add Skill]

  ─ Certifications ─────────────────────────────────────
  [Cert chip] [+ Add Certification]

  ─ Bio ────────────────────────────────────────────────
  [Bio textarea]

  ─ Authentication Info ────────────────────────────────
  Username: [value]    User ID: [value]    Role: [badge]

Footer:
  [Cancel] [💾 Save Profile]   ← visible in edit mode
  Success toast: ✅ "Profile saved successfully!"
```

**Edit/View toggle:**

- View mode: all fields display as read-only text labels
- Edit mode: all fields become `<input>` or `<textarea>`
- Profile data persisted to `localStorage` (not API-backed yet)

---

## 5. Modals & Overlays Summary

| Modal             | Trigger                                     | Size                             |
| ----------------- | ------------------------------------------- | -------------------------------- |
| Log Incident      | "Log Incident" button in topbar             | max-w-2xl, up to 90vh scrollable |
| Notify Citizens   | "Notify Citizens" button in Incident Detail | max-w-lg                         |
| Edit ERT Member   | Pencil icon in ERT Management table         | Dialog component (auto-size)     |
| Delete ERT Member | Trash icon in ERT Management table          | Dialog component (compact)       |
| Fullscreen Map    | ⛶ button in dashboard map                   | Full viewport (fixed inset-0)    |

All modals share:

- Black/50–60% backdrop blur
- Close button (×) top-right: 32×32px gray-800 rounded-lg
- Focus trap (keyboard navigation)
- Click-outside to dismiss (where appropriate)

---

## 6. Navigation & Routing Flows

```
/login
  └─ success → / (Dashboard)

/ (Dashboard)
  ├─ [Log Incident] → modal on same screen
  ├─ [incident card click] → /incidents/:id
  ├─ [map marker click] → /incidents/:id
  └─ nav → any other route

/incidents
  └─ [incident row click] → /incidents/:id

/incidents/:id
  ├─ [Dispatch Unit] → /incidents/:id/dispatch
  ├─ [Notify Citizens] → modal on same screen
  └─ [View Evacuation Plan] → /incidents/:id/evacuation

/incidents/:id/dispatch
  └─ [Return to Incident / back] → /incidents/:id

/incidents/:id/evacuation
  └─ [Notify Citizens] → triggers notify flow
  └─ [back] → /incidents/:id

/communication    → standalone (no drill-down routes)
/analytics        → standalone
/ert-management   → standalone (edit/delete via modals)
/profile          → standalone (edit inline)

Any route (authenticated):
  └─ [Logout] → /login
```

---

## 7. Loading, Error & Empty States

Every data-fetching screen must implement all three states:

| State       | Pattern                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| **Loading** | Skeleton cards (gray-700 rounded rects with `animate-pulse`), or centered spinner (`Loader2` icon `animate-spin`) |
| **Error**   | Orange/red info bar with `AlertTriangle` icon + error message + "Try Again" button                                |
| **Empty**   | Centered large icon (grayed out) + heading + supportive text                                                      |

---

## 8. Real-Time & Polling Behaviour

| Feature                 | Method                                                 | Interval                                            |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Dashboard incident list | REST polling                                           | 30 seconds                                          |
| Dashboard map incidents | REST polling                                           | 30 seconds                                          |
| All Incidents page      | REST polling                                           | 30 seconds                                          |
| Communication Center    | WebSocket (wss://beacon-tcd.tech/api/communication/ws) | Persistent; auto-reconnect with exponential backoff |
| Weather widget          | Open-Meteo API                                         | 10 minutes                                          |
| AI Chat history         | REST on mount                                          | Once on open                                        |

---

## 9. Key Interaction Patterns

### Optimistic UI

- Sending a chat message: message appears immediately in the list before WS confirmation
- Logging an incident: new card prepended to list immediately before API response

### Debounced Search

- Location search in "Log Incident" modal: 500ms debounce before calling Nominatim
- All Incidents search: filters applied on every keystroke (client-side, no debounce needed)

### Collapsible Sidebar

- Toggled by hamburger in topbar
- Transitions: `duration-300` CSS animation
- State persisted in component state (resets on navigation)

### Emoji Reactions

- Hover a received message → quick emoji toolbar appears (6 emojis)
- Click emoji → toggles reaction; count updates immediately
- `+` button → opens full emoji-mart picker

### WebSocket Reconnection

- On disconnect: displays disconnected banner with manual "Reconnect" option
- Auto-reconnect: exponential backoff (attempt 1 = 1s, attempt 2 = 2s, etc. up to max)

---

## 10. Responsive Behaviour

The application is designed primarily for **desktop (1280px+ wide)**. The following breakpoints exist:

| Breakpoint   | Change                                                     |
| ------------ | ---------------------------------------------------------- |
| `md` (768px) | Stat cards switch from 1-col to 4-col; form grids activate |
| Below `md`   | Dashboard map + incident panel stack vertically            |
| Below `md`   | Incident detail grid collapses to single column            |

No mobile-specific navigation (no bottom tab bar). Sidebar collapses on small screens.

---

## 11. Accessibility Notes

- All icon-only buttons have `aria-label` attributes
- Form inputs have corresponding `<label>` elements
- Notification bell has `aria-label`
- Loading spinners accompanied by text ("Loading…")
- Color is never the sole means of conveying information (badges include text labels)
- Modals implement focus trap

---

## 12. What Does NOT Exist Yet (Future Design Areas)

The following items are visible in the codebase but not yet wired to live data or fully designed:

| Feature                   | Current State                                       |
| ------------------------- | --------------------------------------------------- |
| Global search bar         | Input present, not functional                       |
| Notification panel        | Bell icon present, no dropdown/panel                |
| Profile photo upload      | Camera overlay present, no upload action            |
| Profile → API persistence | Saves to localStorage only                          |
| Citizen dashboard         | `CitizenDashboard.tsx` exists but not in web router |
| Analytics data            | All static/mock - no live API                       |
| Dispatch → real API       | Unit selection is local state only                  |
| Evacuation routes         | Static data only                                    |

These areas are candidates for new screen designs in the redesign.
