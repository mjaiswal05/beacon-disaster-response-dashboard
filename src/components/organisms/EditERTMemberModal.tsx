import { useState, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type {
  ERTMemberResponse,
  UpdateERTMemberContactDetailsRequest,
} from "../../types/iam.types";

interface EditERTMemberModalProps {
  isOpen: boolean;
  member: ERTMemberResponse | null;
  onClose: () => void;
  onSubmit: (
    userId: string,
    data: UpdateERTMemberContactDetailsRequest,
    memberName: string,
  ) => Promise<void>;
}

export function EditERTMemberModal({
  isOpen,
  member,
  onClose,
  onSubmit,
}: EditERTMemberModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      const [first = "", last = ""] = member.name?.split(" ") ?? [];
      setFirstName(first);
      setLastName(last);
      setEmail(member.email);
      setPhone(member.phone_number);
      setError(null);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(
        member.id,
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone,
        },
        `${firstName} ${lastName}`,
      );
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to update member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-400" aria-hidden="true" />
            Edit Member
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-first-name"
                className="block text-sm text-muted-foreground mb-1"
              >
                First Name
              </label>
              <Input
                id="edit-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
            <div>
              <label
                htmlFor="edit-last-name"
                className="block text-sm text-muted-foreground mb-1"
              >
                Last Name
              </label>
              <Input
                id="edit-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-email"
              className="block text-sm text-muted-foreground mb-1"
            >
              Email
            </label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-phone"
              className="block text-sm text-muted-foreground mb-1"
            >
              Phone Number
            </label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
