import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AllIncidents } from "../web/AllIncidents";

export function AllIncidentsPage() {
  usePageTitle("Incidents");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const handleNavigate = useCallback(
    (screen: string, incidentId?: string) => {
      switch (screen) {
        case "incident":
          if (incidentId) navigate(`/incidents/${incidentId}`);
          break;
        default:
          navigate("/");
      }
    },
    [navigate],
  );

  return (
    <AllIncidents
      onBack={() => navigate("/")}
      onNavigate={handleNavigate}
      initialSearch={initialSearch}
    />
  );
}
