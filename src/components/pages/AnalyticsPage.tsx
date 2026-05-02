import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Analytics } from "../web/Analytics";

export function AnalyticsPage() {
  usePageTitle("Analytics");
  const navigate = useNavigate();

  return <Analytics onBack={() => navigate("/")} />;
}
