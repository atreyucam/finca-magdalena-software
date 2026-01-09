// src/routes/RootRedirect.jsx
import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

function homeByRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "propietario") return "/owner/dashboard";
  if (r === "tecnico") return "/tech/dashboard";
  if (r === "trabajador") return "/worker/mis-tareas";
  return "/login";
}

export default function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.getRole());

  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={homeByRole(role)} replace />;
}
