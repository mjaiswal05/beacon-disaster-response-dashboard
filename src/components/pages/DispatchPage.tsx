import { useParams, useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { DispatchPanel } from "../web/DispatchPanel";

export function DispatchPage() {
  usePageTitle("Dispatch");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <DispatchPanel
      incidentId={id ?? null}
      onBack={() => navigate(-1)}
      onSuccess={() => navigate("/")}
    />
  );
}
