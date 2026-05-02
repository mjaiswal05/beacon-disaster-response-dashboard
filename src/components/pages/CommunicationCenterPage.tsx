import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { CommunicationCenter } from "../web/CommunicationCenter";
import { ErrorBoundary } from "../atoms/ErrorBoundary";

export function CommunicationCenterPage() {
  usePageTitle("Communication");
  const navigate = useNavigate();

  return (
    <ErrorBoundary label="Communication centre failed to load">
      <CommunicationCenter onBack={() => navigate("/")} />
    </ErrorBoundary>
  );
}
