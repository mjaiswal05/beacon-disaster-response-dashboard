// IAM service - owns /api/iam/v1

import type {
    BulkCreateGroundStaffMember,
    CreateERTMemberRequest,
    ERTMemberResponse,
    GroundStaffApplication,
    GroundStaffMember,
    ListERTMembersResult,
    ListGroundStaffApplicationsResult,
    ListGroundStaffMembersResult,
    LoginActivity,
    UpdateERTMemberContactDetailsRequest,
    UserDevice,
    UserProfile,
    UserSession,
} from "../types/iam.types";
import { request } from "../utils/request";

const IAM = "/api/iam/v1";

// ── ERT Members ──────────────────────────────────────────────

export async function listERTMembers(
  page = 1,
  pageSize = 20,
): Promise<ListERTMembersResult> {
  const result = await request.get<any>(`${IAM}/ert-members`, {
    params: { page, page_size: pageSize },
  });
  return {
    data: result.data ?? [],
    pagination: result.pagination ?? {
      page,
      page_size: pageSize,
      total_items: (result.data ?? []).length,
      total_pages: 1,
    },
  };
}

export async function createERTMember(
  data: CreateERTMemberRequest,
): Promise<ERTMemberResponse> {
  const result = await request.post<any>(`${IAM}/ert-members`, data);
  return result.data;
}

export async function updateERTMemberContactDetails(
  userId: string,
  data: UpdateERTMemberContactDetailsRequest,
): Promise<ERTMemberResponse> {
  const fullName = [data.first_name, data.last_name]
    .filter((part) => part && part.trim().length > 0)
    .join(" ")
    .trim();

  const payload: {
    name?: string;
    email?: string;
    phone_number?: string;
    status?: string;
  } = {};

  if (fullName) payload.name = fullName;
  if (data.email) payload.email = data.email;
  if (data.phone_number) payload.phone_number = data.phone_number;
  if (data.status) payload.status = data.status;

  const result = await request.patch<any>(
    `${IAM}/users/${encodeURIComponent(userId)}`,
    payload,
  );
  return result.data;
}

export async function deleteUser(userId: string): Promise<void> {
  await request.del(`${IAM}/users/${encodeURIComponent(userId)}`);
}

export async function getUserById(
  userId: string,
): Promise<ERTMemberResponse | null> {
  try {
    const result = await request.get<any>(
      `${IAM}/users/${encodeURIComponent(userId)}`,
    );
    return result.data ?? null;
  } catch {
    return null;
  }
}

// ── Self-service profile ─────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile> {
  const result = await request.get<any>(`${IAM}/auth/me`);
  return result.data;
}

export async function updateMyProfile(
  data: { name?: string; phone_number?: string },
): Promise<UserProfile> {
  const result = await request.patch<any>(`${IAM}/auth/me`, data);
  return result.data;
}

export async function changePassword(
  data: { current_password: string; new_password: string },
): Promise<void> {
  await request.post(`${IAM}/auth/change-password`, data);
}

export async function getMySessions(): Promise<UserSession[]> {
  const result = await request.get<any>(`${IAM}/auth/me/sessions`);
  return result.data ?? [];
}

export async function revokeSession(sessionId: string): Promise<void> {
  await request.del(
    `${IAM}/auth/me/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export async function getMyDevices(): Promise<UserDevice[]> {
  const result = await request.get<any>(`${IAM}/auth/me/devices`);
  return result.data ?? [];
}

export async function getMyActivity(limit = 50): Promise<LoginActivity[]> {
  const result = await request.get<any>(`${IAM}/auth/me/activity`, {
    params: { limit },
  });
  return result.data ?? [];
}

// ── Ground Staff ──────────────────────────────────────────────

export async function getGroundStaffApplications(
  status?: string,
): Promise<ListGroundStaffApplicationsResult> {
  const result = await request.get<any>(
    `${IAM}/ground-staff-applications`,
    status ? { params: { status } } : undefined,
  );
  return result.data;
}

export async function approveGroundStaffApplication(
  appId: string,
): Promise<void> {
  await request.post(
    `${IAM}/ground-staff-applications/${encodeURIComponent(appId)}:approve`,
    {},
  );
}

export async function rejectGroundStaffApplication(
  appId: string,
  reason: string,
): Promise<void> {
  await request.post(
    `${IAM}/ground-staff-applications/${encodeURIComponent(appId)}:reject`,
    { reason },
  );
}

export async function bulkCreateGroundStaff(
  members: BulkCreateGroundStaffMember[],
): Promise<void> {
  await request.post(`${IAM}/ground-staff-members`, { members });
}

export async function getGroundStaffMembers(
  page = 1,
  pageSize = 20,
): Promise<ListGroundStaffMembersResult> {
  const result = await request.get<any>(`${IAM}/ground-staff-members`, {
    params: { page, page_size: pageSize },
  });
  // Handle both shapes:
  //   flat array   → result.data = [...]
  //   nested obj   → result.data = { members: [...], total: N }
  const raw = result.data;
  const members: GroundStaffMember[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.members)
      ? raw.members
      : [];
  const totalItems =
    result.pagination?.total_items ??
    raw?.total ??
    raw?.total_items ??
    members.length;
  return {
    members,
    pagination: result.pagination ?? {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / pageSize) || 1,
    },
  };
}

export type {
  BulkCreateGroundStaffMember,
  GroundStaffApplication,
  GroundStaffMember,
  ListGroundStaffApplicationsResult,
  ListGroundStaffMembersResult,
};
