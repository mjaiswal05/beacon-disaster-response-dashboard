import { useParams, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { IncidentDetails } from "../web/IncidentDetails";

export function IncidentDetailsPage() {
  usePageTitle("Incident Details");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (screen: string, incidentId?: string) => {
      switch (screen) {
        case "dispatch":
          navigate(`/incidents/${incidentId ?? id}/dispatch`);
          break;
        case "evacuation":
          navigate(`/incidents/${incidentId ?? id}/evacuation`);
          break;
        case "incident":
          if (incidentId) navigate(`/incidents/${incidentId}`);
          break;
        default:
          navigate("/");
      }
    },
    [navigate, id],
  );

  return (
    <IncidentDetails
      incidentId={id ?? null}
      onNavigate={handleNavigate}
      onBack={() => navigate(-1)}
    />
  );
}
