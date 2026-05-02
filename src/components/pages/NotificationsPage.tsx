import { usePageTitle } from "../../hooks/usePageTitle";
import { Notifications } from "../web/Notifications";

export function NotificationsPage() {
  usePageTitle("Notifications");
  return <Notifications />;
}
