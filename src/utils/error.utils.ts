const STATUS_MAP: Record<number, string> = {
  400: "Invalid request. Check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource no longer exists.",
  409: "This conflicts with current state. Refresh and try again.",
  422: "The data provided is invalid.",
  429: "Too many requests. Please wait a moment.",
  500: "Server error. Our team has been notified.",
  502: "Service temporarily unavailable.",
  503: "System maintenance in progress. Try again shortly.",
};

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "An unexpected error occurred.";
  const statusMatch = error.message.match(/failed:\s*(\d{3})$/);
  if (statusMatch) return STATUS_MAP[+statusMatch[1]] ?? "An unexpected error occurred.";
  if (/network|fetch|failed to fetch/i.test(error.message))
    return "Connection lost. Check your network and try again.";
  if (/timeout/i.test(error.message))
    return "The request timed out. Please try again.";
  // Only forward message if it looks user-safe (no stack/code paths)
  if (error.message.length < 180 && !error.message.includes(" at "))
    return error.message;
  return "An unexpected error occurred. Please try again.";
}
