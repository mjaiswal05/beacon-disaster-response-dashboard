import { useState, useMemo } from "react";
import { SearchInput } from "../molecules/SearchInput";
import { ERTMemberRow } from "../molecules/ERTMemberRow";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { ErrorMessage } from "../atoms/ErrorMessage";
import { EmptyState } from "../atoms/EmptyState";
import type { ERTMemberResponse } from "../../types/iam.types";

interface ERTMemberTableProps {
  members: ERTMemberResponse[];
  isLoading: boolean;
  error: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
}

export function ERTMemberTable({
  members,
  isLoading,
  error,
  onEdit,
  onDelete,
  onRetry,
}: ERTMemberTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.phone_number?.toLowerCase().includes(q)
        );
      }),
    [members, searchQuery],
  );

  if (isLoading) return <LoadingSpinner label="Loading ERT members…" />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search members…"
        aria-label="Search ERT members"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Try adjusting your search."
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <ERTMemberRow
                  key={member.id}
                  id={member.id}
                  name={member.name}
                  email={member.email}
                  phone={member.phone_number}
                  role={member.role}
                  status={member.status}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
