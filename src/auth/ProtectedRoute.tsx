import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/" replace />;
  }

  if (status === "unauthorized") {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}