/**
 * Format a timestamp as a relative "time ago" string.
 */
export function formatTimeAgo(timestamp: string): string {
  if (!timestamp) return "Unknown time";

  try {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } catch {
    return "Unknown time";
  }
}

/**
 * Format a timestamp into a human-readable date string.
 * Example: "Jan 15, 2025, 3:45 PM"
 */
export function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "Unknown time";

  try {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Unknown time";
  }
}

/**
 * Format a date string for table display.
 * Example: "Jan 15, 2025, 03:45 PM"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO timestamp to a short time string.
 * Example: "03:45 PM"
 */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
