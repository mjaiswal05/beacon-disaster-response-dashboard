import type { AdvisoryType, ResourceItem } from "../types/core.types";

export function getDefaultResources(incidentType: string, advisoryType: AdvisoryType): ResourceItem[] {
  const t = incidentType.toLowerCase();

  if (advisoryType === "all_clear") return allClearResources();
  if (advisoryType === "shelter_in_place") return shelterInPlaceResources(t);
  return evacuateResources(t);
}

export function getDefaultAdvisoryText(
  incidentType: string,
  advisoryType: AdvisoryType,
): { title: string; body: string } {
  const t = incidentType.toLowerCase();

  if (advisoryType === "all_clear") {
    return {
      title: "All Clear — Situation Resolved",
      body: "The emergency situation has been resolved. Authorities confirm it is safe to return. Please follow official instructions before re-entering affected areas.",
    };
  }

  if (advisoryType === "shelter_in_place") {
    if (t.includes("chemical") || t.includes("hazmat")) {
      return {
        title: "Shelter in Place — Chemical Hazard",
        body: "A chemical hazard has been detected nearby. Remain indoors, seal doors and windows, and await further instructions from emergency services.",
      };
    }
    if (t.includes("gas")) {
      return {
        title: "Shelter in Place — Gas Leak",
        body: "A gas leak has been reported in your area. Stay indoors away from windows, do not use electrical switches or open flames, and await further instructions.",
      };
    }
    return {
      title: "Shelter in Place Advisory",
      body: "An emergency situation requires you to shelter in place. Stay indoors, close all windows and doors, and monitor official channels for updates.",
    };
  }

  // evacuate
  if (t.includes("fire")) {
    return {
      title: "Evacuation Order — Fire",
      body: "An evacuation order has been issued due to a fire in your area. Leave immediately via the designated route to the shelter. Do not return until authorities confirm it is safe.",
    };
  }
  if (t.includes("flood")) {
    return {
      title: "Evacuation Order — Flooding",
      body: "Flooding is occurring in your area. Evacuate immediately to higher ground via the designated route. Do not attempt to walk or drive through floodwater.",
    };
  }
  if (t.includes("earthquake")) {
    return {
      title: "Evacuation Order — Earthquake",
      body: "An evacuation order is in effect following seismic activity. Leave the area via the designated route and avoid damaged structures, downed power lines, and unstable ground.",
    };
  }
  if (t.includes("chemical") || t.includes("hazmat")) {
    return {
      title: "Evacuation Order — Hazardous Material",
      body: "A hazardous material incident requires immediate evacuation. Leave the area immediately, moving crosswind away from the hazard. Do not re-enter until cleared by authorities.",
    };
  }
  if (t.includes("gas")) {
    return {
      title: "Evacuation Order — Gas Leak",
      body: "A gas leak has been confirmed in your area. Evacuate immediately without using electrical switches. Leave doors open behind you and move upwind of the affected area.",
    };
  }
  return {
    title: "Evacuation Order",
    body: "An evacuation order has been issued for your area. Please proceed immediately to the designated shelter via the recommended route. Follow all instructions from emergency services.",
  };
}

// ── per-advisory-type helpers ──────────────────────────────────────────────

function allClearResources(): ResourceItem[] {
  return [
    { type: "checklist", label: "Wait for official confirmation before re-entering your home" },
    { type: "checklist", label: "Check your home for structural damage before going inside" },
    { type: "checklist", label: "Inspect utilities — gas, water, electricity — before switching them on" },
    { type: "checklist", label: "Document any damage with photos for insurance purposes" },
    { type: "phone", label: "Emergency Services", value: "" },
    { type: "phone", label: "Local Authority Helpline", value: "" },
  ];
}

function shelterInPlaceResources(incidentType: string): ResourceItem[] {
  const base: ResourceItem[] = [
    { type: "checklist", label: "Go to an interior room with no or few windows" },
    { type: "checklist", label: "Close all windows, doors, and fireplace dampers" },
    { type: "checklist", label: "Turn off fans, air conditioning, and forced-air heating" },
    { type: "checklist", label: "Keep a battery-powered radio tuned to local emergency broadcasts" },
    { type: "phone", label: "Emergency Services", value: "" },
    { type: "phone", label: "Poison Control", value: "" },
  ];

  if (incidentType.includes("chemical") || incidentType.includes("hazmat")) {
    base.push(
      { type: "checklist", label: "Seal gaps under doors and windows with wet towels or tape" },
      { type: "checklist", label: "Do not use the phone unless it is a life-threatening emergency" },
    );
  }
  if (incidentType.includes("gas")) {
    base.push(
      { type: "checklist", label: "Do NOT use electrical switches, appliances, or open flames" },
      { type: "phone", label: "Gas Emergency Line", value: "" },
    );
  }
  return base;
}

function evacuateResources(incidentType: string): ResourceItem[] {
  const universal: ResourceItem[] = [
    { type: "checklist", label: "Leave immediately — do not delay to collect belongings" },
    { type: "checklist", label: "Take your emergency kit: documents, medication, phone charger, water" },
    { type: "checklist", label: "Lock your home and leave a note stating your destination" },
    { type: "checklist", label: "Follow the designated route — do not take shortcuts" },
    { type: "checklist", label: "Assist neighbours who may need help, especially elderly or disabled" },
    { type: "checklist", label: "Check in at the shelter and register with staff on arrival" },
    { type: "phone", label: "Emergency Services", value: "" },
    { type: "phone", label: "Local Authority Emergency Line", value: "" },
  ];

  if (incidentType.includes("fire")) {
    return [
      { type: "checklist", label: "Stay low and cover your mouth with a cloth if there is smoke" },
      { type: "checklist", label: "Close doors behind you as you leave — this slows fire spread" },
      { type: "checklist", label: "Do NOT use elevators" },
      { type: "checklist", label: "If your exit is blocked, seal the door and signal from a window" },
      ...universal,
    ];
  }
  if (incidentType.includes("flood")) {
    return [
      { type: "checklist", label: "Move to higher ground immediately — do not wait" },
      { type: "checklist", label: "Never walk or drive through floodwater — even shallow water can knock you down" },
      { type: "checklist", label: "Disconnect electrical appliances if it is safe to do so" },
      { type: "checklist", label: "Do not touch floodwater — it may be contaminated" },
      ...universal,
    ];
  }
  if (incidentType.includes("earthquake")) {
    return [
      { type: "checklist", label: "Watch for falling debris as you exit the building" },
      { type: "checklist", label: "Avoid damaged buildings, bridges, and overpasses" },
      { type: "checklist", label: "Stay away from downed power lines" },
      { type: "checklist", label: "Be prepared for aftershocks — move quickly but calmly" },
      ...universal,
    ];
  }
  if (incidentType.includes("chemical") || incidentType.includes("hazmat")) {
    return [
      { type: "checklist", label: "Move crosswind — not downwind — away from the hazard source" },
      { type: "checklist", label: "Cover nose and mouth with a cloth dampened with water" },
      { type: "checklist", label: "Remove and bag contaminated clothing before entering the shelter" },
      ...universal,
    ];
  }
  if (incidentType.includes("gas")) {
    return [
      { type: "checklist", label: "Do NOT use electrical switches, lighters, or open flames" },
      { type: "checklist", label: "Leave doors open behind you to ventilate the building" },
      { type: "checklist", label: "Move upwind of the affected area" },
      { type: "phone", label: "Gas Emergency Line", value: "" },
      ...universal,
    ];
  }
  return universal;
}
