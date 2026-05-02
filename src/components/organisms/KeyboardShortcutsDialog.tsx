import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { KeyboardShortcutBadge } from "../atoms/KeyboardShortcutBadge";

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string;
  description: string;
}

const NAVIGATION_SHORTCUTS: ShortcutRow[] = [
  { keys: "G then D", description: "Go to Dashboard" },
  { keys: "G then I", description: "Go to Incidents" },
  { keys: "G then C", description: "Go to Communication" },
  { keys: "G then A", description: "Go to Analytics" },
  { keys: "G then T", description: "Go to Transport" },
  { keys: "G then E", description: "Go to ERT Management" },
  { keys: "G then N", description: "Go to Notifications" },
];

const ACTION_SHORTCUTS: ShortcutRow[] = [
  { keys: "Ctrl+K", description: "Open command palette" },
  { keys: "N", description: "Log new incident" },
];

const MODAL_SHORTCUTS: ShortcutRow[] = [
  { keys: "?", description: "Show keyboard shortcuts" },
  { keys: "Esc", description: "Close any modal or palette" },
];

function ShortcutGroup({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: ShortcutRow[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        {title}
      </p>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.keys} className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-300">{s.description}</span>
            <KeyboardShortcutBadge keys={s.keys} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <ShortcutGroup title="Navigation" shortcuts={NAVIGATION_SHORTCUTS} />
          <ShortcutGroup title="Actions" shortcuts={ACTION_SHORTCUTS} />
          <ShortcutGroup title="Modals" shortcuts={MODAL_SHORTCUTS} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
