import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ERTManagement } from "../web/ERTManagement";

export function ERTManagementPage() {
  usePageTitle("ERT Management");
  const navigate = useNavigate();

  return <ERTManagement onBack={() => navigate("/")} />;
}
