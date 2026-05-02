import { useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { EvacuationDetails } from "../web/EvacuationDetails";

export function EvacuationDetailsPage() {
    usePageTitle("Evacuation Details");
    const { id, evacuationId } = useParams<{ id: string; evacuationId: string }>();
    const navigate = useNavigate();

    return (
        <EvacuationDetails
            incidentId={id ?? null}
            evacuationId={evacuationId ?? null}
            onBack={() => navigate(-1)}
        />
    );
}
