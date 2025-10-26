import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is already logged in, redirect to dashboard
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}