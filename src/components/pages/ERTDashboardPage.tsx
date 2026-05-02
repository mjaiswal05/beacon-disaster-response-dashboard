import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ERTDashboard } from "../web/ERTDashboard";

export function ERTDashboardPage() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (screen: string, incidentId?: string) => {
      switch (screen) {
        case "incident":
          if (incidentId) navigate(`/incidents/${incidentId}`);
          break;
        case "all-incidents":
          navigate("/incidents");
          break;
        case "chat":
          navigate("/communication");
          break;
        case "analytics":
          navigate("/analytics");
          break;
        case "ert-management":
          navigate("/ert-management");
          break;
        case "profile":
          navigate("/profile");
          break;
        default:
          navigate("/");
      }
    },
    [navigate],
  );

  return <ERTDashboard onNavigate={handleNavigate} />;
}
