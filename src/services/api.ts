// Aggregated API service - re-exports from domain services.
// Prefer importing directly from the domain service file (e.g. iam.api.ts)
// for new code. This file exists for backward compatibility.

// Core (incidents)
export {
    createIncident,
    getAllIncidents,
    getIncidentById,
    getIncidents,
    postIncidentAlert
} from "./core.api";
export type { Incident, IncidentLocation } from "./core.api";

// IAM (users, ERT members, profile, auth)
export type {
    BulkCreateGroundStaffMember,
    CreateERTMemberRequest,
    ERTMemberResponse,
    GroundStaffMember,
    ListERTMembersResult,
    ListGroundStaffMembersResult,
    PaginationMeta,
    UpdateERTMemberContactDetailsRequest
} from "../types/iam.types";
export {
    bulkCreateGroundStaff,
    changePassword,
    createERTMember,
    deleteUser,
    getGroundStaffMembers,
    getMyActivity,
    getMyDevices,
    getMyProfile,
    getMySessions,
    listERTMembers,
    revokeSession,
    updateERTMemberContactDetails,
    updateMyProfile
} from "./iam.api";

// Communication (chat)
import { request } from "../utils/request";

const COMM = "/api/communication/v1";

export async function getChatHistory(
  roomId: string,
  limit = 50,
): Promise<import("../types/chat.types").Message[]> {
  const result = await request.get<any>(`${COMM}/messages`, {
    params: { room_id: roomId, limit },
  });
  return result.data ?? [];
}
