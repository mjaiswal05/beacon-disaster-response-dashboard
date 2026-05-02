import { useState, useEffect, useCallback } from "react";
import {
  listERTMembers,
  createERTMember,
  updateERTMemberContactDetails,
  deleteUser,
} from "../services/api";
import type {
  CreateERTMemberRequest,
  ERTMemberResponse,
  UpdateERTMemberContactDetailsRequest,
} from "../types/iam.types";

export function useERTMembers() {
  const [members, setMembers] = useState<ERTMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listERTMembers();
      setMembers(result.data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load ERT members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = useCallback(
    async (data: CreateERTMemberRequest) => {
      setError(null);
      setSuccessMessage(null);
      await createERTMember(data);
      setSuccessMessage(
        `ERT member ${data.first_name} ${data.last_name} created successfully!`,
      );
      fetch();
    },
    [fetch],
  );

  const update = useCallback(
    async (
      userId: string,
      data: UpdateERTMemberContactDetailsRequest,
      memberName: string,
    ) => {
      setError(null);
      setSuccessMessage(null);
      await updateERTMemberContactDetails(userId, data);
      setSuccessMessage(`ERT member ${memberName} updated successfully!`);
      fetch();
    },
    [fetch],
  );

  const remove = useCallback(
    async (userId: string, memberName: string) => {
      setError(null);
      setSuccessMessage(null);
      await deleteUser(userId);
      setSuccessMessage(`ERT member ${memberName} deleted successfully!`);
      fetch();
    },
    [fetch],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    members,
    isLoading,
    error,
    successMessage,
    refetch: fetch,
    create,
    update,
    remove,
    clearMessages,
    setError,
    setSuccessMessage,
  };
}
