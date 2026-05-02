import { X, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle
              className="w-5 h-5 text-red-400"
              aria-hidden="true"
            />
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-secondary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
