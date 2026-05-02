import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Profile } from "../web/Profile";

export function ProfilePage() {
  usePageTitle("Profile");
  const navigate = useNavigate();

  return <Profile onBack={() => navigate("/")} />;
}
