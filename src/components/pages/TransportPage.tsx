import { usePageTitle } from "../../hooks/usePageTitle";
import { TransportMonitor } from "../web/TransportMonitor";
import { ErrorBoundary } from "../atoms/ErrorBoundary";

export function TransportPage() {
  usePageTitle("Transport");
  return (
    <ErrorBoundary label="Transport monitoring failed to load">
      <TransportMonitor />
    </ErrorBoundary>
  );
}
