import { createBrowserRouter, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { FullPageLayout } from "./components/layouts/FullPageLayout";
import { AllIncidentsPage } from "./components/pages/AllIncidentsPage";
import { AnalyticsPage } from "./components/pages/AnalyticsPage";
import { CommunicationCenterPage } from "./components/pages/CommunicationCenterPage";
import { DispatchPage } from "./components/pages/DispatchPage";
import { DispatchTrackingPage } from "./components/pages/DispatchTrackingPage";
import { ERTDashboardPage } from "./components/pages/ERTDashboardPage";
import { ERTManagementPage } from "./components/pages/ERTManagementPage";
import { EvacuationDetailsPage } from "./components/pages/EvacuationDetailsPage";
import { EvacuationPlanPage } from "./components/pages/EvacuationPlanPage";
import { IncidentDetailsPage } from "./components/pages/IncidentDetailsPage";
import { LoginPage } from "./components/pages/LoginPage";
import { NotificationsPage } from "./components/pages/NotificationsPage";
import { ProfilePage } from "./components/pages/ProfilePage";
import { SocialsPage } from "./components/pages/SocialsPage";
import { TemplatesPage } from "./components/pages/TemplatesPage";
import { TransportPage } from "./components/pages/TransportPage";
import { VaultPage } from "./components/pages/VaultPage";

export const router = createBrowserRouter([
  // Public routes (login)
  {
    element: <FullPageLayout />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },

  // Protected routes (dashboard shell)
  {
    element: <DashboardLayout />,
    children: [
      { index: true, element: <ERTDashboardPage /> },
      { path: "incidents", element: <AllIncidentsPage /> },
      { path: "incidents/:id", element: <IncidentDetailsPage /> },
      { path: "incidents/:id/dispatch", element: <DispatchPage /> },
      { path: "dispatches/:id/track", element: <DispatchTrackingPage /> },
      { path: "incidents/:id/evacuation", element: <EvacuationPlanPage /> },
      { path: "incidents/:id/evacuation/:evacuationId", element: <EvacuationDetailsPage /> },
      { path: "communication", element: <CommunicationCenterPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "ert-management", element: <ERTManagementPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "transport", element: <TransportPage /> },
      { path: "vault", element: <VaultPage /> },
      { path: "socials", element: <SocialsPage /> },
      { path: "templates", element: <TemplatesPage /> },
    ],
  },

  // Catch-all redirect
  { path: "*", element: <Navigate to="/" replace /> },
]);
