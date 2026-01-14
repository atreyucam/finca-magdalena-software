// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function ProtectedRoute() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (!isBootstrapped) return null; // o loader

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
