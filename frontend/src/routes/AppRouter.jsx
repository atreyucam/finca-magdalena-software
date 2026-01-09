import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loading from "../components/Loading";
import RequireAuth from "./RequireAuth";
import RequireRole from "./RequireRole";
import ScrollToTop from "../components/ScrollToTop";

import Login from "../pages/Login";

// Layouts
import OwnerLayout from "../layouts/OwnerLayout";
import TechLayout from "../layouts/TechLayout";
import WorkerLayout from "../layouts/WorkerLayout";

// Pages
import Dashboard from "../pages/Dashboard";
import Tareas from "../pages/Tareas";
import Inventario from "../pages/Inventario";
import Notificaciones from "../pages/Notificaciones";
import Reportes from "../pages/Reportes";
import Usuarios from "../pages/Usuarios";
import MisTareas from "../pages/MisTareas";
import DetalleUsuario from "../pages/DetalleUsuario";
import DetalleTarea from "../pages/DetalleTarea";
import MiPerfil from "../pages/MiPerfil";
import Pagos from "../pages/Pagos";
import Produccion from "../pages/Produccion";
import DetalleLote from "../pages/DetalleLote";
import DetalleCosecha from "../pages/DetalleCosecha";

export default function AppRouter() {
  const { isBootstrapped } = useAuth();
  if (!isBootstrapped) return <Loading />;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protegido */}
        <Route element={<RequireAuth />}>
          {/* Propietario */}
          <Route element={<RequireRole roles={["Propietario"]} />}>
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tareas" element={<Tareas />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="produccion" element={<Produccion />} />
              <Route path="produccion/lotes/:id" element={<DetalleLote />} />
              <Route path="produccion/cosechas/:id" element={<DetalleCosecha />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="usuarios/:id" element={<DetalleUsuario />} />
              <Route path="pagos" element={<Pagos />} />
              <Route path="metricas" element={<Reportes />} />
              <Route path="notificaciones" element={<Notificaciones />} />
              <Route path="detalleTarea/:id" element={<DetalleTarea />} />
            </Route>
          </Route>

          {/* Técnico */}
          <Route element={<RequireRole roles={["Tecnico"]} />}>
            <Route path="/tech" element={<TechLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tareas" element={<Tareas />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="metricas" element={<Reportes />} />
              <Route path="notificaciones" element={<Notificaciones />} />
              <Route path="detalleTarea/:id" element={<DetalleTarea />} />
            </Route>
          </Route>

          {/* Trabajador */}
          <Route element={<RequireRole roles={["Trabajador"]} />}>
            <Route path="/worker" element={<WorkerLayout />}>
              <Route index element={<Navigate to="mis-tareas" replace />} />
              <Route path="mis-tareas" element={<MisTareas />} />
              <Route path="mi-perfil" element={<MiPerfil />} />
              <Route path="notificaciones" element={<Notificaciones />} />
              <Route path="detalleTarea/:id" element={<DetalleTarea />} />
            </Route>
          </Route>
        </Route>

        {/* Redirects raíz */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
