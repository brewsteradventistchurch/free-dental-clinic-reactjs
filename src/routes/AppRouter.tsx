import { Routes, Route, Navigate } from "react-router-dom";

import WelcomePage from "../pages/WelcomePage";
import DashboardPage from "../pages/DashboardPage";
import RegistrationPage from "../pages/RegistrationPage";
import ListsPage from "../pages/ListsPage";
import PrintPage from "../pages/PrintPage";
import SchedulePage from "../pages/SchedulePage";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminRoute from "../auth/AdminRoute";
import ConfigPage from "../pages/ConfigPage";
import AppLayout from "../components/AppLayout";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/print" element={<PrintPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/config" element={<ConfigPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}