import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { TemplatesManager } from "../web/TemplatesManager";

export function TemplatesPage() {
  usePageTitle("Templates");
  const { isSysAdmin } = useAuth();

  if (!isSysAdmin) {
    return <Navigate to="/" replace />;
  }

  return <TemplatesManager />;
}
