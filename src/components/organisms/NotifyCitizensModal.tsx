import { useState } from "react";
import { X, Bell, CheckCircle, Image } from "lucide-react";
import { Button } from "../ui/button";
import { postIncidentAlert } from "../../services/core.api";

interface NotifyCitizensModalProps {
  isOpen: boolean;
  incidentId: string;
  incidentTitle: string;
  onClose: () => void;
}

export function NotifyCitizensModal({
  isOpen,
  incidentId,
  incidentTitle,
  onClose,
}: NotifyCitizensModalProps) {
  const [updateMessage, setUpdateMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const body: { update_message?: string; image_url?: string } = {};
      if (updateMessage.trim()) body.update_message = updateMessage.trim();
      if (imageUrl.trim()) body.image_url = imageUrl.trim();

      await postIncidentAlert(incidentId, body);
      setStatus("success");
    } catch (err: any) {
      setError(err.message ?? "Failed to send alert");
      setStatus("error");
    }
  };

  const handleClose = () => {
    setUpdateMessage("");
    setImageUrl("");
    setStatus("idle");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" aria-hidden="true" />
            Notify Citizens
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-secondary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {status === "success" ? (
          <div className="p-6 text-center">
            <CheckCircle
              className="w-12 h-12 text-green-400 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-foreground font-medium">
              Alert sent successfully!
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Citizens have been notified about {incidentTitle}.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="alert-message"
                className="block text-sm text-muted-foreground mb-1"
              >
                Update Message
              </label>
              <textarea
                id="alert-message"
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm resize-none"
                placeholder="Describe the situation and any instructions…"
              />
            </div>

            <div>
              <label
                htmlFor="alert-image"
                className="block text-sm text-muted-foreground mb-1 flex items-center gap-1"
              >
                <Image className="w-3.5 h-3.5" aria-hidden="true" />
                Image URL (optional)
              </label>
              <input
                id="alert-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send Alert"}
              </Button>
            </div>
          </form>
        )}

        <div role="status" aria-live="polite" className="sr-only">
          {status === "success" && "Alert sent successfully"}
        </div>
      </div>
    </div>
  );
}
