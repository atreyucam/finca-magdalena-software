// src/routes/RequireRole.jsx
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

function homeByRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "propietario") return "/owner/dashboard";
  if (r === "tecnico") return "/tech/dashboard";
  if (r === "trabajador") return "/worker/mis-tareas";
  return "/login";
}

export default function RequireRole({ roles = [] }) {
  const role = (useAuthStore((s) => s.getRole()) || "").toLowerCase();
  const allowed = roles.map((r) => r.toLowerCase());

  if (!allowed.includes(role)) {
    return <Navigate to={homeByRole(role)} replace />;
  }
  return <Outlet />;
}
