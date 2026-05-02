import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Login } from "../Login";

export function LoginPage() {
  usePageTitle("Login");
  const { isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Login onLoginSuccess={() => navigate("/", { replace: true })} />;
}
