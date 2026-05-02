// Authenticated service for all /api/core/v1 endpoints.
// See src/utils/request.ts for the underlying HTTP utility.
import type {
  AdvisoryType,
  AdvisoryVariables,
  AnalyticsOverview,
  Attachment,
  VaultStats,
  CreateDispatchPayload,
  CreateEvacuationPayload,
  Dispatch,
  DispatchLocationTrack,
  DispatchMember,
  EscalateIncidentPayload,
  Evacuation,
  FolderStats,
  Incident,
  IncidentAlertPayload,
  IncidentEvent,
  IncidentMetrics,
  InitiateUploadPayload,
  InitiateUploadResult,
  ListIncidentsParams,
  NearestStation,
  PaginatedEvents,
  PaginatedIncidents,
  RecordIncidentUpdatePayload,
  StationAvailability,
  UpdateEvacuationPayload,
  UpdateIncidentPayload,
  VaultFile,
  VaultFolder,
  VaultTag,
} from "../types/core.types";
import { request } from "../utils/request";

export type {
  ActorMeta,
  AdvisoryType,
  AdvisoryVariables,
  AnalyticsOverview,
  Attachment,
  VaultStats,
  BoundingBox,
  CreateDispatchPayload,
  CreateEvacuationPayload,
  Dispatch,
  DispatchLocationTrack,
  DispatchMember,
  DispatchMemberStatus,
  DispatchStatus,
  EntityMeta,
  EscalateIncidentPayload,
  Evacuation,
  EvacuationStatus,
  EventMetadata,
  FieldChange,
  FolderStats,
  Incident,
  IncidentAlertPayload,
  IncidentEvent,
  IncidentLocation,
  IncidentMetrics,
  ListIncidentsParams,
  LocationHotspot,
  LocationPoint,
  MemberTrack,
  MonthlyTrendPoint,
  NearestStation,
  PaginatedEvents,
  PaginatedIncidents,
  RecordIncidentUpdatePayload,
  ResponseTimeBucket,
  SeverityTrendPoint,
  StationAvailability,
  UpdateEvacuationPayload,
  UpdateIncidentPayload,
  VaultFile,
  VaultTag,
} from "../types/core.types";

const CORE = "/api/core/v1";
const VAULT = CORE;

// Mapping helpers

function mapIncident(inc: any): Incident {
  return {
    id: inc.id,
    type: inc.type || "Unknown",
    title: inc.title || "",
    description: inc.description || "",
    severity: inc.severity || "P2",
    status: inc.status || "reported",
    approved: inc.approved ?? false,
    approved_by: inc.approved_by || "",
    is_internal: inc.is_internal ?? false,
    location: {
      address: inc.location?.address || "Unknown Location",
      latitude: inc.location?.latitude || 0,
      longitude: inc.location?.longitude || 0,
    },
    affected_radius: inc.affected_radius || 0,
    reported_by: inc.reported_by || "",
    verified_by: inc.verified_by || "",
    created_at: inc.created_at || "",
    updated_at: inc.updated_at || "",
  };
}

function mapIncidentEvent(evt: any): IncidentEvent {
  return {
    id: evt.id,
    incident_id: evt.incident_id,
    action: evt.action || "",
    changed_by: evt.changed_by || "",
    message: evt.message || "",
    changes: evt.changes || {},
    created_at: evt.created_at || "",
    metadata: evt.metadata ?? undefined,
    visible_to_citizens: evt.visible_to_citizens ?? true,
  };
}

function mapDispatchMember(m: any): DispatchMember {
  return {
    id: m.id,
    dispatch_id: m.dispatch_id,
    user_id: m.user_id,
    affiliation: m.affiliation || "",
    status: m.status || "notified",
    incident_id: m.incident_id || "",
    created_at: m.created_at || "",
    updated_at: m.updated_at || "",
  };
}

function mapDispatch(d: any): Dispatch {
  return {
    id: d.id,
    incident_id: d.incident_id,
    created_by: d.created_by || "",
    station_id: d.station_id || "",
    station_name: d.station_name || "",
    role: d.role || "",
    required_count: d.required_count || 0,
    accepted_count: d.accepted_count || 0,
    status: d.status || "pending_acceptance",
    timeout_at: d.timeout_at || "",
    members: d.members ? d.members.map(mapDispatchMember) : undefined,
    created_at: d.created_at || "",
    updated_at: d.updated_at || "",
  };
}

function mapEvacuation(e: any): Evacuation {
  return {
    id: e.id,
    incident_id: e.incident_id,
    zone_name: e.zone_name || "",
    status: e.status || "planned",
    start_time: e.start_time || null,
    completion_time: e.completion_time || null,
    created_at: e.created_at || "",
    updated_at: e.updated_at || "",
    advisory_type: e.advisory_type,
    bounding_box_ne_lat: e.bounding_box_ne_lat,
    bounding_box_ne_lon: e.bounding_box_ne_lon,
    bounding_box_sw_lat: e.bounding_box_sw_lat,
    bounding_box_sw_lon: e.bounding_box_sw_lon,
    shelter_id: e.shelter_id,
    shelter_name: e.shelter_name,
    shelter_address: e.shelter_address,
    shelter_lat: e.shelter_lat,
    shelter_lon: e.shelter_lon,
    advisory_title: e.advisory_title,
    advisory_body: e.advisory_body,
    template_id: e.template_id,
    notification_sent: e.notification_sent,
    transport_mode: e.transport_mode,
    resources: Array.isArray(e.resources) ? e.resources : [],
  };
}

// GET endpoints

/** Paginated incident list with filtering, sorting, and bounding-box support. */
export async function getIncidentsPaginated(
  params: ListIncidentsParams = {},
): Promise<PaginatedIncidents> {
  const queryParams: Record<string, string | number> = {};
  if (params.type) queryParams.type = params.type;
  if (params.severity) queryParams.severity = params.severity;
  if (params.status) queryParams.status = params.status;
  if (params.search) queryParams.search = params.search;
  if (params.from_date) queryParams.from_date = params.from_date;
  if (params.to_date) queryParams.to_date = params.to_date;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  if (params.sort_order) queryParams.sort_order = params.sort_order;
  if (params.page_size) queryParams.page_size = params.page_size;
  if (params.page_token) queryParams.page_token = params.page_token;
  if (params.bbox) queryParams.bbox = params.bbox;
  if (params.is_internal !== undefined)
    queryParams.is_internal = String(params.is_internal);

  const data = await request.get<any>(`${CORE}/incidents`, {
    params: queryParams,
  });
  const raw = data?.success ? data.data : null;
  return {
    incidents: raw?.incidents ? raw.incidents.map(mapIncident) : [],
    next_page_token: raw?.next_page_token || "",
    total_count: raw?.total_count || 0,
  };
}

/** Simple list (backward-compatible). Returns a flat array without pagination metadata. */
export async function getIncidents(pageSize = 50): Promise<Incident[]> {
  const result = await getIncidentsPaginated({
    sort_by: "created_at",
    sort_order: "desc",
    page_size: pageSize,
  });
  return result.incidents;
}

export const getAllIncidents = (pageSize = 1000) => getIncidents(pageSize);

export async function getIncidentById(incidentId: string): Promise<Incident> {
  const data = await request.get<any>(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}`,
  );
  if (data?.success && data.data) return mapIncident(data.data);
  throw new Error("Invalid incident data received");
}

export async function getMetrics(): Promise<IncidentMetrics> {
  const data = await request.get<any>(`${CORE}/incidents/metrics`);
  const raw = data?.success ? data.data : null;
  return {
    total_incidents: raw?.total_incidents ?? 0,
    active_incidents: raw?.active_incidents ?? 0,
    by_type: raw?.by_type ?? {},
    by_severity: raw?.by_severity ?? {},
    by_status: raw?.by_status ?? {},
    average_response_minutes: raw?.average_response_minutes ?? 0,
  };
}

/** Comprehensive analytics overview with time-series data. */
export async function getAnalyticsOverview(
  months = 8,
): Promise<AnalyticsOverview> {
  const data = await request.get<any>(`${CORE}/analytics`, {
    params: { months },
  });
  const raw = data?.success ? data.data : null;
  return {
    total_incidents: raw?.total_incidents ?? 0,
    active_incidents: raw?.active_incidents ?? 0,
    resolved_incidents: raw?.resolved_incidents ?? 0,
    average_response_minutes: raw?.average_response_minutes ?? 0,
    resolution_rate: raw?.resolution_rate ?? 0,
    by_type: raw?.by_type ?? {},
    by_severity: raw?.by_severity ?? {},
    by_status: raw?.by_status ?? {},
    monthly_trend: raw?.monthly_trend ?? [],
    severity_trend: raw?.severity_trend ?? [],
    response_time_trend: raw?.response_time_trend ?? [],
    top_locations: raw?.top_locations ?? [],
  };
}

export async function listIncidentEvents(
  incidentId: string,
  pageSize = 20,
  pageToken?: string,
): Promise<PaginatedEvents> {
  const params: Record<string, string | number> = { page_size: pageSize };
  if (pageToken) params.page_token = pageToken;

  const data = await request.get<any>(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/events`,
    { params },
  );
  const raw = data?.success ? data.data : null;
  return {
    events: raw?.events ? raw.events.map(mapIncidentEvent) : [],
    next_page_token: raw?.next_page_token || "",
    total_count: raw?.total_count || 0,
  };
}

// POST / PUT endpoints

export async function createIncident(
  payload: unknown,
  signal?: AbortSignal,
): Promise<any> {
  return request.post<any>(`${CORE}/incidents`, payload, { signal });
}

export async function updateIncident(
  incidentId: string,
  payload: UpdateIncidentPayload,
): Promise<any> {
  const data = await request.put<any>(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}`,
    payload,
  );
  return data;
}

export async function closeIncident(
  incidentId: string,
  message?: string,
): Promise<any> {
  return request.post(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/close`,
    message ? { message } : {},
  );
}

export async function escalateIncident(
  incidentId: string,
  payload: EscalateIncidentPayload,
): Promise<any> {
  return request.post(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/escalate`,
    payload,
  );
}

export async function approveIncident(
  incidentId: string,
  message?: string,
): Promise<any> {
  return request.post(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/approve`,
    message ? { message } : {},
  );
}

export async function recordIncidentUpdate(
  incidentId: string,
  payload: RecordIncidentUpdatePayload,
): Promise<any> {
  return request.post(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/update`,
    payload,
  );
}

export async function postIncidentAlert(
  incidentId: string,
  body: IncidentAlertPayload,
): Promise<void> {
  await request.post(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/alert`,
    body,
  );
}

// Dispatch endpoints

/** List all dispatches for a given incident. */
export async function listDispatchesByIncident(
  incidentId: string,
): Promise<Dispatch[]> {
  const data = await request.get<any>(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/dispatches`,
  );
  const raw = data?.success ? data.data : null;
  return raw?.dispatches ? raw.dispatches.map(mapDispatch) : [];
}

/** List all dispatches (paginated). */
export async function listDispatches(
  params?: { page_size?: number; page_token?: string },
): Promise<Dispatch[]> {
  const data = await request.get<any>(`${CORE}/dispatches`, { params });
  const raw = data?.success ? data.data : null;
  return raw?.dispatches ? raw.dispatches.map(mapDispatch) : [];
}

/** Create a new dispatch request for an incident. */
export async function createDispatch(
  payload: CreateDispatchPayload,
): Promise<Dispatch> {
  const data = await request.post<any>(`${CORE}/dispatches`, payload);
  const raw = data?.success ? data.data : data;
  return mapDispatch(raw);
}

/** Get a single dispatch by ID (includes members). */
export async function getDispatch(dispatchId: string): Promise<Dispatch> {
  const data = await request.get<any>(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}`,
  );
  const raw = data?.success ? data.data : data;
  return mapDispatch(raw);
}

/** Ground staff accepts a dispatch. */
export async function acceptDispatch(dispatchId: string): Promise<Dispatch> {
  const data = await request.post<any>(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}/accept`,
    {},
  );
  const raw = data?.success ? data.data : data;
  return mapDispatch(raw);
}

/** Ground staff rejects a dispatch. */
export async function rejectDispatch(dispatchId: string): Promise<void> {
  await request.post(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}/reject`,
    {},
  );
}

/** Mark a dispatch as completed. */
export async function completeDispatch(dispatchId: string): Promise<Dispatch> {
  const data = await request.post<any>(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}/complete`,
    {},
  );
  const raw = data?.success ? data.data : data;
  return mapDispatch(raw);
}

/** Cancel a dispatch. */
export async function cancelDispatch(dispatchId: string): Promise<Dispatch> {
  const data = await request.post<any>(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}/cancel`,
    {},
  );
  const raw = data?.success ? data.data : data;
  return mapDispatch(raw);
}

/** Get GPS location track for all members of a dispatch. */
export async function getDispatchLocationTrack(
  dispatchId: string,
): Promise<DispatchLocationTrack> {
  const data = await request.get<any>(
    `${CORE}/dispatches/${encodeURIComponent(dispatchId)}/location-track`,
  );
  const raw = data?.tracks ?? data?.data?.tracks ?? [];
  return { tracks: raw };
}

// Evacuation endpoints

/** List all evacuations for a given incident. */
export async function listEvacuationsByIncident(
  incidentId: string,
): Promise<Evacuation[]> {
  const data = await request.get<any>(
    `${CORE}/incidents/${encodeURIComponent(incidentId)}/evacuations`,
  );
  const raw = data?.success ? data.data : null;
  return raw?.evacuations ? raw.evacuations.map(mapEvacuation) : [];
}

/** List all evacuations (paginated). */
export async function listEvacuations(
  params?: { page_size?: number; page_token?: string },
): Promise<Evacuation[]> {
  const data = await request.get<any>(`${CORE}/evacuations`, { params });
  const raw = data?.success ? data.data : null;
  return raw?.evacuations ? raw.evacuations.map(mapEvacuation) : [];
}

/** Create a new evacuation plan. */
export async function createEvacuation(
  payload: CreateEvacuationPayload,
): Promise<Evacuation> {
  const data = await request.post<any>(`${CORE}/evacuations`, payload);
  const raw = data?.success ? data.data : data;
  return mapEvacuation(raw);
}

/** Get a single evacuation by ID. */
export async function getEvacuation(evacuationId: string): Promise<Evacuation> {
  const data = await request.get<any>(
    `${CORE}/evacuations/${encodeURIComponent(evacuationId)}`,
  );
  const raw = data?.success ? data.data : data;
  return mapEvacuation(raw);
}

/** Update an evacuation plan. */
export async function updateEvacuation(
  evacuationId: string,
  payload: UpdateEvacuationPayload,
): Promise<Evacuation> {
  const data = await request.put<any>(
    `${CORE}/evacuations/${encodeURIComponent(evacuationId)}`,
    payload,
  );
  const raw = data?.success ? data.data : data;
  return mapEvacuation(raw);
}

/** Cancel an evacuation. */
export async function cancelEvacuation(
  evacuationId: string,
): Promise<Evacuation> {
  const data = await request.post<any>(
    `${CORE}/evacuations/${encodeURIComponent(evacuationId)}/cancel`,
    {},
  );
  const raw = data?.success ? data.data : data;
  return mapEvacuation(raw);
}

/** Delete an evacuation plan. */
export async function deleteEvacuation(evacuationId: string): Promise<void> {
  await request.del(`${CORE}/evacuations/${encodeURIComponent(evacuationId)}`);
}

/** Send an advisory notification for an evacuation. */
export async function sendEvacuationAdvisory(id: string): Promise<Evacuation> {
  const data = await request.post<any>(
    `${CORE}/evacuations/${encodeURIComponent(id)}/send-advisory`,
    {},
  );
  return mapEvacuation(data);
}

// Station endpoints

/** Get staff availability for a station. */
export async function getStationAvailability(
  id: string,
  affiliationId: string,
  role?: string,
): Promise<StationAvailability> {
  const params: Record<string, string> = {};
  if (role) params.role = role;
  const data = await request.get<any>(
    `${CORE}/incidents/${id}/stations/${encodeURIComponent(affiliationId)}/availability`,
    { params },
  );
  return data?.success ? data.data : data;
}

/** Find nearest stations by coordinates and role. */
export async function getNearestStations(
  id: string,
  lat: number,
  lng: number,
  role: string,
  limit = 5,
): Promise<NearestStation[]> {
  const data = await request.get<any>(`${CORE}/incidents/${id}/nearest-stations`, {
    params: { lat, lng, role, limit },
  });
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw) ? raw : [];
}

export interface LocationSearchResult {
  place_id: string;
  display_name: string;
  lat: number;
  lng: number;
  address: {
    road?: string;
    city?: string;
    county?: string;
    country?: string;
  };
}

/** Search for locations using TomTom geocoding (Ireland-scoped). */
export async function searchLocations(
  query: string,
  limit = 5,
): Promise<LocationSearchResult[]> {
  const data = await request.get<any>(`${CORE}/map/search`, {
    params: { q: query, limit },
  });
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw) ? raw : [];
}

// Vault / File Management System endpoints

/** Step 1 of 3: Obtain a signed PUT URL for a direct GCS upload. */
export async function initiateUpload(
  payload: InitiateUploadPayload,
): Promise<InitiateUploadResult> {
  const data = await request.post<any>(`${VAULT}/vault/files/upload`, payload);
  const raw = data?.success ? data.data : data;
  return { file_id: raw.file_id, signed_url: raw.signed_url };
}

/** Step 3 of 3: Mark a file as AVAILABLE after the direct GCS upload succeeded. */
export async function confirmUpload(fileId: string): Promise<void> {
  await request.post(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}/confirm`,
    {},
  );
}

/** Link an already-confirmed file to an incident. */
export async function linkIncidentAttachment(
  incidentId: string,
  fileId: string,
): Promise<Attachment> {
  const data = await request.post<any>(
    `${VAULT}/incidents/${encodeURIComponent(incidentId)}/attachments`,
    { file_id: fileId },
  );
  const raw = data?.success ? data.data : data;
  return raw as Attachment;
}

/** List all attachments for a given incident. */
export async function listIncidentAttachments(
  incidentId: string,
): Promise<Attachment[]> {
  const data = await request.get<any>(
    `${VAULT}/incidents/${encodeURIComponent(incidentId)}/attachments`,
  );
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw?.attachments)
    ? raw.attachments
    : Array.isArray(raw)
      ? raw
      : [];
}

/** Create a new vault folder. */
export async function createVaultFolder(
  name: string,
  parentId: string | null = null,
): Promise<VaultFolder> {
  const data = await request.post<any>(`${VAULT}/vault/folders`, {
    name,
    parent_id: parentId,
  });
  const raw = data?.success ? data.data : data;
  return raw as VaultFolder;
}

/** Retrieve folder metadata, sub-folders, and files (with signed download URLs). */
export async function getVaultFolder(folderId: string): Promise<VaultFolder> {
  const data = await request.get<any>(
    `${VAULT}/vault/folders/${encodeURIComponent(folderId)}`,
  );
  const raw = data?.success ? data.data : data;
  // Backend returns FolderContent: { folder, sub_folders, files: FileWithURL[] }
  const folder = raw?.folder ?? raw;
  return {
    id: folder.id,
    name: folder.name,
    parent_id: folder.parent_id,
    materialized_path: folder.materialized_path,
    stats: folder.stats,
    sub_folders: (raw?.sub_folders ?? []) as VaultFolder[],
    files: (raw?.files ?? []).map((fw: any) => ({
      ...fw.file,
      download_url: fw.download_url || undefined,
    })),
    created_at: folder.created_at,
    updated_at: folder.updated_at,
  } as VaultFolder;
}

/** List all top-level (root) folders — used for the Files page root view. */
export async function getVaultRoot(): Promise<VaultFolder[]> {
  const data = await request.get<any>(`${VAULT}/vault/root`);
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw?.folders) ? raw.folders : [];
}

const SOCIALS_FOLDER_KEY = "beacon_socials_vault_folder_id";

/**
 * Get or create the shared "Beacon Socials" root vault folder.
 * The resolved folder ID is cached in localStorage so subsequent calls
 * skip the root-listing round-trip entirely.
 */
export async function getSocialsVaultFolder(): Promise<VaultFolder> {
  const cached = localStorage.getItem(SOCIALS_FOLDER_KEY);
  if (cached) {
    try {
      return await getVaultFolder(cached);
    } catch {
      // Folder may have been deleted — fall through and re-create
      localStorage.removeItem(SOCIALS_FOLDER_KEY);
    }
  }
  const roots = await getVaultRoot();
  const existing = roots.find((f) => f.name === "Beacon Socials");
  if (existing) {
    localStorage.setItem(SOCIALS_FOLDER_KEY, existing.id);
    return existing;
  }
  const created = await createVaultFolder("Beacon Socials");
  localStorage.setItem(SOCIALS_FOLDER_KEY, created.id);
  return created;
}

/** Fetch a single vault file with a fresh signed download URL. */
export async function getVaultFile(fileId: string): Promise<VaultFile> {
  const data = await request.get<any>(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}`,
  );
  const raw = data?.success ? data.data : data;
  return raw as VaultFile;
}

/** Soft-delete a vault file. */
export async function deleteVaultFile(fileId: string): Promise<void> {
  await request.del(`${VAULT}/vault/files/${encodeURIComponent(fileId)}`);
}

/** Update the description field on a file. */
export async function updateFileDescription(
  fileId: string,
  description: string,
): Promise<VaultFile> {
  const data = await request.patch<any>(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}`,
    { description },
  );
  const raw = data?.success ? data.data : data;
  return raw as VaultFile;
}

/** Get aggregate storage usage and quota for the current user's vault. */
export async function getVaultStats(): Promise<VaultStats> {
  const data = await request.get<any>(`${VAULT}/vault/stats`);
  const raw = data?.success ? data.data : data;
  return raw as VaultStats;
}

/** Patch arbitrary mutable fields on a vault file (description, size_bytes, etc.). */
export async function patchVaultFile(
  fileId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await request.patch(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}`,
    fields,
  );
}

/** Return all tags attached to a file. */
export async function getFileTags(fileId: string): Promise<VaultTag[]> {
  const data = await request.get<any>(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}/tags`,
  );
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw?.tags) ? raw.tags : Array.isArray(raw) ? raw : [];
}

/** Resolve-or-create a tag by name and attach it to the file. */
export async function addTagToFile(
  fileId: string,
  tagName: string,
  color = "#6366f1",
): Promise<VaultTag> {
  const data = await request.post<any>(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}/tags`,
    { name: tagName, color },
  );
  const raw = data?.success ? data.data : data;
  return raw as VaultTag;
}

/** Remove a tag from a file by tag ID. */
export async function removeTagFromFile(
  fileId: string,
  tagId: string,
): Promise<void> {
  await request.del(
    `${VAULT}/vault/files/${encodeURIComponent(fileId)}/tags/${encodeURIComponent(tagId)}`,
  );
}

/** Get or create the dedicated vault upload folder for an incident.
 *  @param folderName  Desired folder name passed as a query param so the
 *                     backend can use it on first creation.  Ignored if the
 *                     folder already exists.
 */
export async function getIncidentVaultFolder(
  incidentId: string,
  folderName?: string,
): Promise<VaultFolder> {
  const data = await request.get<any>(
    `${VAULT}/incidents/${encodeURIComponent(incidentId)}/vault-folder`,
    folderName ? { params: { name: folderName } } : undefined,
  );
  const raw = data?.success ? data.data : data;
  return raw as VaultFolder;
}

// ─── Move ─────────────────────────────────────────────────────────────────────

export async function moveVaultFile(fileId: string, folderId: string): Promise<void> {
  await request.post(`${VAULT}/vault/files/${encodeURIComponent(fileId)}/move`, { folder_id: folderId });
}

// ─── Star ─────────────────────────────────────────────────────────────────────

export async function starVaultFile(fileId: string): Promise<void> {
  await request.post(`${VAULT}/vault/files/${encodeURIComponent(fileId)}/star`, {});
}

export async function unstarVaultFile(fileId: string): Promise<void> {
  await request.del(`${VAULT}/vault/files/${encodeURIComponent(fileId)}/star`);
}

export async function getStarredFiles(): Promise<VaultFile[]> {
  const data = await request.get<any>(`${VAULT}/vault/starred`);
  const raw = data?.success ? data.data : data;
  // Each element is a FileWithURL { file: VaultFile, download_url?: string }
  const items: any[] = Array.isArray(raw?.files) ? raw.files : [];
  return items.map((fw) => fw.file ? { ...fw.file, download_url: fw.download_url } : fw);
}

// ─── Bin ─────────────────────────────────────────────────────────────────────

export async function getVaultBin(): Promise<VaultFile[]> {
  const data = await request.get<any>(`${VAULT}/vault/bin`);
  const raw = data?.success ? data.data : data;
  return Array.isArray(raw?.files) ? raw.files : [];
}

export async function restoreVaultFile(fileId: string): Promise<void> {
  await request.post(`${VAULT}/vault/files/${encodeURIComponent(fileId)}/restore`, {});
}

export async function permanentDeleteVaultFile(fileId: string): Promise<void> {
  await request.del(`${VAULT}/vault/files/${encodeURIComponent(fileId)}/permanent`);
}

// ─── Bulk ─────────────────────────────────────────────────────────────────────

export async function bulkDeleteVaultFiles(fileIds: string[]): Promise<void> {
  await request.post(`${VAULT}/vault/bulk/delete`, { file_ids: fileIds });
}

export async function bulkMoveVaultFiles(fileIds: string[], folderId: string): Promise<void> {
  await request.post(`${VAULT}/vault/bulk/move`, { file_ids: fileIds, folder_id: folderId });
}

export async function bulkStarVaultFiles(fileIds: string[]): Promise<void> {
  await request.post(`${VAULT}/vault/bulk/star`, { file_ids: fileIds });
}

export async function bulkRestoreVaultFiles(fileIds: string[]): Promise<void> {
  await request.post(`${VAULT}/vault/bulk/restore`, { file_ids: fileIds });
}

