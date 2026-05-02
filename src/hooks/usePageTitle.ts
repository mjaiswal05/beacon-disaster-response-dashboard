import { useEffect } from "react";

const APP_NAME = "Beacon";

/**
 * Sets the browser tab title for the current page.
 * Restores the previous title on unmount.
 *
 * @param title - Page-specific title, e.g. "Dashboard" → "Dashboard | Beacon"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
