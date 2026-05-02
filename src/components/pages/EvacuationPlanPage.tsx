import { useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { EvacuationPlan } from "../web/EvacuationPlan";

export function EvacuationPlanPage() {
  usePageTitle("Evacuation Plan");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <EvacuationPlan
      incidentId={id ?? null}
      onBack={() => navigate(-1)}
      onNotify={() => navigate("/")}
      onOpenEvacuation={(evacuationId) => navigate(`/incidents/${id}/evacuation/${evacuationId}`)}
    />
  );
}
