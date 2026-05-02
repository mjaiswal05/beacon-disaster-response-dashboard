/** Replaces {{variable}} placeholders with values from vars map.
 *  Unmatched variables are left as-is. */
export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

/** Returns unique variable names found in a template body. */
export function extractTemplateVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  const names = matches.map((m) => m.slice(2, -2));
  return Array.from(new Set(names));
}

/** Sample values for the 8 standard template variables. */
export const TEMPLATE_SAMPLE_VARS: Record<string, string> = {
  incident_type: 'Flooding',
  incident_title: 'Flash Flood Warning — South Dublin',
  zone_name: 'Zone 4 — Ringsend',
  severity: 'P1',
  shelter_name: 'Ringsend Community Centre',
  shelter_address: '18 Ringsend Road, Dublin 4',
  incident_address: 'Irishtown Road, Dublin 4',
  affected_count: '250',
};

/** Maps advisory type strings to TemplateCategory values. */
export const ADVISORY_TYPE_TO_CATEGORY: Record<string, string> = {
  evacuate: 'EVACUATION',
  shelter_in_place: 'DISASTER_ALERT',
  all_clear: 'ALL_CLEAR',
};
