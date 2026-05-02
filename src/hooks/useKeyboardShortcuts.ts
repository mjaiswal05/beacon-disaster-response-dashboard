import { useEffect } from "react";

type Options = {
  onOpenPalette: () => void;
  onOpenLogIncident: () => void;
  onOpenShortcutsDialog: () => void;
  navigate: (path: string) => void;
};

export function useKeyboardShortcuts(opts: Options) {
  useEffect(() => {
    let chord: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;

      // ⌘K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        opts.onOpenPalette();
        return;
      }

      // G chord → navigation
      if (!e.metaKey && !e.ctrlKey && e.key === "g") {
        chord = "g";
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          chord = null;
        }, 500);
        return;
      }

      if (chord === "g") {
        const ROUTES: Record<string, string> = {
          d: "/",
          i: "/incidents",
          c: "/communication",
          a: "/analytics",
          t: "/transport",
          e: "/ert-management",
          n: "/notifications",
        };
        if (ROUTES[e.key]) {
          opts.navigate(ROUTES[e.key]);
          chord = null;
        }
        return;
      }

      // N → Log Incident modal
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        opts.onOpenLogIncident();
        return;
      }

      // ? → Keyboard shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        opts.onOpenShortcutsDialog();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timer) clearTimeout(timer);
    };
  }, [opts]);
}
