export interface IncidentLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Incident {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  approved: boolean;
  approved_by: string;
  is_internal: boolean;
  location: IncidentLocation;
  affected_radius: number;
  reported_by: string;
  verified_by: string;
  created_at: string;
  updated_at: string;
}

// Paginated incident list response
export interface PaginatedIncidents {
  incidents: Incident[];
  next_page_token: string;
  total_count: number;
}

// Aggregated metrics
export interface IncidentMetrics {
  total_incidents: number;
  active_incidents: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  average_response_minutes: number;
}

// Event history
export interface FieldChange {
  from: unknown;
  to: unknown;
}

export interface ActorMeta {
  id: string;
  name: string;
  role: string;
}

export interface EntityMeta {
  type: string;   // "dispatch" | "evacuation"
  id: string;
  name: string;
}

export interface EventMetadata {
  actor?: ActorMeta;
  entity?: EntityMeta;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  action: string;
  changed_by: string;
  message: string;
  changes: Record<string, FieldChange>;
  created_at: string;
  metadata?: EventMetadata;
  visible_to_citizens: boolean;
}

export interface PaginatedEvents {
  events: IncidentEvent[];
  next_page_token: string;
  total_count: number;
}

// Request payloads
export interface IncidentAlertPayload {
  update_message?: string;
  image_url?: string;
}

export interface UpdateIncidentPayload {
  type?: string;
  severity?: string;
  status?: string;
  title?: string;
  description?: string;
  location?: IncidentLocation;
  affected_radius?: number;
  message?: string;
}

export interface EscalateIncidentPayload {
  new_severity: string;
  message?: string;
}

export interface RecordIncidentUpdatePayload {
  update_message: string;
  image_url?: string;
  should_alert: boolean;
}

// Geo
export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

// Query options for listing incidents
export interface ListIncidentsParams {
  type?: string;
  severity?: string;
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page_size?: number;
  page_token?: string;
  bbox?: string;
  is_internal?: boolean;
}

// Dispatch types

export type DispatchStatus =
  | "pending_acceptance"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type DispatchMemberStatus =
  | "notified"
  | "accepted"
  | "rejected"
  | "completed";

export interface DispatchMember {
  id: string;
  dispatch_id: string;
  user_id: string;
  affiliation: string;
  status: DispatchMemberStatus;
  incident_id: string;
  created_at: string;
  updated_at: string;
}

export interface Dispatch {
  id: string;
  incident_id: string;
  created_by: string;
  station_id: string;
  station_name: string;
  role: string;
  required_count: number;
  accepted_count: number;
  status: DispatchStatus;
  timeout_at: string;
  members?: DispatchMember[];
  created_at: string;
  updated_at: string;
}

export interface CreateDispatchPayload {
  incident_id: string;
  station_id: string;
  station_name: string;
  role: string;
  required_count: number;
}

// Evacuation types

export type EvacuationStatus = "planned" | "active" | "completed" | "cancelled";

export type AdvisoryType = "evacuate" | "shelter_in_place" | "all_clear";

export type TransportMode = "car" | "pedestrian" | "public_transport";

export type ResourceType = "link" | "phone" | "checklist" | "document";

export interface ResourceItem {
  type: ResourceType;
  label: string;
  url?: string;
  value?: string;
  vault_file_id?: string;
  file_name?: string;
}

export interface Evacuation {
  id: string;
  incident_id: string;
  zone_name: string;
  status: EvacuationStatus;
  start_time: string | null;
  completion_time: string | null;
  created_at: string;
  updated_at: string;
  advisory_type?: AdvisoryType;
  bounding_box_ne_lat?: number;
  bounding_box_ne_lon?: number;
  bounding_box_sw_lat?: number;
  bounding_box_sw_lon?: number;
  shelter_id?: string;
  shelter_name?: string;
  shelter_address?: string;
  shelter_lat?: number;
  shelter_lon?: number;
  advisory_title?: string;
  advisory_body?: string;
  template_id?: string;
  notification_sent?: boolean;
  transport_mode?: TransportMode;
  resources: ResourceItem[];
}

export interface CreateEvacuationPayload {
  incident_id: string;
  zone_name?: string;
  advisory_type?: AdvisoryType;
  bounding_box_ne_lat?: number;
  bounding_box_ne_lon?: number;
  bounding_box_sw_lat?: number;
  bounding_box_sw_lon?: number;
  shelter_id?: string;
  shelter_name?: string;
  shelter_address?: string;
  shelter_lat?: number;
  shelter_lon?: number;
  advisory_title?: string;
  advisory_body?: string;
  template_id?: string;
  transport_mode?: TransportMode;
  resources?: ResourceItem[];
}

export interface UpdateEvacuationPayload {
  zone_name?: string;
  status?: string;
  advisory_type?: AdvisoryType;
  bounding_box_ne_lat?: number;
  bounding_box_ne_lon?: number;
  bounding_box_sw_lat?: number;
  bounding_box_sw_lon?: number;
  shelter_id?: string;
  shelter_name?: string;
  shelter_address?: string;
  shelter_lat?: number;
  shelter_lon?: number;
  advisory_title?: string;
  advisory_body?: string;
  template_id?: string;
  notification_sent?: boolean;
  transport_mode?: TransportMode;
  resources?: ResourceItem[];
}

export interface AdvisoryVariables {
  incident_type: string;
  incident_title: string;
  zone_name: string;
  severity: string;
  shelter_name: string;
  shelter_address: string;
  incident_address: string;
}

// Station types

export interface StationAvailability {
  station_id: string;
  role: string;
  total_staff: number;
  currently_deployed: number;
  available: number;
}

export type StationRole = "firefighters" | "police" | "medics";

export interface NearestStation {
  source_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  total_staff: number;
  currently_deployed: number;
  available: number;
}

// Analytics types

export interface MonthlyTrendPoint {
  month: string;
  total: number;
  by_type: Record<string, number>;
  resolved: number;
  pending: number;
}

export interface SeverityTrendPoint {
  month: string;
  by_severity: Record<string, number>;
}

export interface ResponseTimeBucket {
  period: string;
  avg_minutes: number;
  count: number;
}

export interface LocationHotspot {
  address: string;
  latitude: number;
  longitude: number;
  count: number;
}

// Vault / File Management System types

export type VaultFileStatus = "PENDING" | "AVAILABLE" | "DELETED";

export interface VaultTag {
  id: string;
  name: string;
  color: string;
  owner_id: string;
}

export interface FolderStats {
  folder_id: string;
  total_size_bytes: number;
  total_files: number;
  total_subfolders: number;
  updated_at: string;
}

export interface VaultFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: VaultFileStatus;
  folder_id: string;
  uploaded_by: string;
  checksum?: string;
  description?: string;
  last_accessed_at?: string;
  metadata?: Record<string, unknown>;
  tags?: VaultTag[];
  download_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VaultFolder {
  id: string;
  name: string;
  parent_id?: string;
  materialized_path?: string;
  stats?: FolderStats;
  files: VaultFile[];
  sub_folders?: VaultFolder[];
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  incident_id: string;
  file_id: string;
  file: VaultFile;
  linked_by: string;
  created_at: string;
}

export interface VaultStats {
  used_bytes: number;
  quota_bytes: number;
  total_files: number;
  total_folders: number;
}

export interface InitiateUploadPayload {
  folder_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface InitiateUploadResult {
  file_id: string;
  signed_url: string;
}

export interface MoveFilePayload {
  folder_id: string;
}

export interface BulkDeletePayload {
  file_ids: string[];
}

export interface BulkMovePayload {
  file_ids: string[];
  folder_id: string;
}

export interface BulkStarPayload {
  file_ids: string[];
}

export interface BulkRestorePayload {
  file_ids: string[];
}

export interface AnalyticsOverview {
  total_incidents: number;
  active_incidents: number;
  resolved_incidents: number;
  average_response_minutes: number;
  resolution_rate: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  monthly_trend: MonthlyTrendPoint[];
  severity_trend: SeverityTrendPoint[];
  response_time_trend: ResponseTimeBucket[];
  top_locations: LocationHotspot[];
}

// Location tracking types

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number;
  recorded_at: string;
}

export interface MemberTrack {
  user_id: string;
  points: LocationPoint[];
}

export interface DispatchLocationTrack {
  tracks: MemberTrack[];
}

export interface MemberInfo {
  userId: string;
  name: string;
  affiliation: string;
  memberStatus: DispatchMemberStatus;
  role: string;
}

// Mapped safe zone used in EvacuationPlan (combines hospitals/fire stations/shelters)
export interface SafeZone {
  id: string;
  name: string;
  type: "hospital" | "fire_station" | "shelter";
  shelterType?: string;
  capacity?: number;
  address: string;
  distance: string;
  lat: number;
  lng: number;
  status: string;
}
