import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AdminRoute() {
  const { authenticated, loading, user } = useAuth();

  if (loading) return null;
  if (!authenticated) return <Navigate to="/" replace />;
  if (user?.role.toLowerCase() !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}