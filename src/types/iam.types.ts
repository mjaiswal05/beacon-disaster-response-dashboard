// IAM domain types - mirrors beacon-iam API responses

export interface CreateERTMemberRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  temporary_password: boolean;
}

export interface ERTMemberResponse {
  id: string;
  keycloak_user_id: string;
  email: string;
  name: string;
  phone_number: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateERTMemberContactDetailsRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  status?: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ListERTMembersResult {
  data: ERTMemberResponse[];
  pagination: PaginationMeta;
}

export interface UserProfile {
  id: string;
  keycloak_user_id: string;
  name: string;
  email: string;
  phone_number: string;
  role: string;
  status: string;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_id: string | null;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  expires_at: string;
  last_activity_at: string;
  created_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_type: string;
  device_name: string;
  os: string;
  browser: string;
  ip_address: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface LoginActivity {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  created_at: string;
}

// ── Ground Staff ──────────────────────────────────────────────

export interface GroundStaffApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  group: string;
  affiliation: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ListGroundStaffApplicationsResult {
  applications: GroundStaffApplication[];
  total: number;
}

export interface BulkCreateGroundStaffMember {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface GroundStaffMember {
  id: string;
  /** Combined full name returned by the API, if available */
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListGroundStaffMembersResult {
  members: GroundStaffMember[];
  pagination: PaginationMeta;
}
