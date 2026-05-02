import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { CreateERTMemberRequest } from "../../types/iam.types";

interface CreateERTMemberFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateERTMemberRequest) => Promise<void>;
}

export function CreateERTMemberForm({
  isOpen,
  onClose,
  onSubmit,
}: CreateERTMemberFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phone,
        password,
        temporary_password: true,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" aria-hidden="true" />
            Add ERT Member
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
                htmlFor="ert-first-name"
                className="block text-sm text-muted-foreground mb-1"
              >
                First Name
              </label>
              <Input
                id="ert-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
            <div>
              <label
                htmlFor="ert-last-name"
                className="block text-sm text-muted-foreground mb-1"
              >
                Last Name
              </label>
              <Input
                id="ert-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="ert-email"
              className="block text-sm text-muted-foreground mb-1"
            >
              Email
            </label>
            <Input
              id="ert-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div>
            <label
              htmlFor="ert-phone"
              className="block text-sm text-muted-foreground mb-1"
            >
              Phone Number
            </label>
            <Input
              id="ert-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div>
            <label
              htmlFor="ert-password"
              className="block text-sm text-muted-foreground mb-1"
            >
              Temporary Password
            </label>
            <Input
              id="ert-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
