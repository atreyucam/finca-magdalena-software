import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_NAME = "Finca La Magdalena";

const TITLES = [
  // Public
  { match: /^\/login\/?$/, title: "Iniciar sesión" },

  // OWNER
  { match: /^\/owner\/dashboard\/?$/, title: "Dashboard" },
  { match: /^\/owner\/tareas\/?$/, title: "Gestión de Tareas" },
  { match: /^\/owner\/inventario\/?$/, title: "Inventario" },
  { match: /^\/owner\/produccion\/?$/, title: "Producción" },
  { match: /^\/owner\/produccion\/lotes\/\d+\/?$/, title: "Detalle de Lote" },
  { match: /^\/owner\/produccion\/cosechas\/\d+\/?$/, title: "Detalle de Cosecha" },
  { match: /^\/owner\/usuarios\/?$/, title: "Usuarios" },
  { match: /^\/owner\/usuarios\/\d+\/?$/, title: "Detalle de Usuario" },
  { match: /^\/owner\/pagos\/?$/, title: "Pagos" },
  { match: /^\/owner\/metricas\/?$/, title: "Reportes" },
  { match: /^\/owner\/notificaciones\/?$/, title: "Notificaciones" },
  { match: /^\/owner\/detalleTarea\/\d+\/?$/, title: "Detalle de Tarea" },

  // TECH
  { match: /^\/tech\/dashboard\/?$/, title: "Dashboard" },
  { match: /^\/tech\/tareas\/?$/, title: "Gestión de Tareas" },
  { match: /^\/tech\/inventario\/?$/, title: "Inventario" },
  { match: /^\/tech\/usuarios\/?$/, title: "Usuarios" },
  { match: /^\/tech\/usuarios\/\d+\/?$/, title: "Detalle de Usuario" },
  { match: /^\/tech\/metricas\/?$/, title: "Reportes" },
  { match: /^\/tech\/pagos\/?$/, title: "Pagos" },
  { match: /^\/tech\/notificaciones\/?$/, title: "Notificaciones" },
  { match: /^\/tech\/detalleTarea\/\d+\/?$/, title: "Detalle de Tarea" },
  { match: /^\/tech\/mi-perfil\/?$/, title: "Mi Perfil" },

  // WORKER
  { match: /^\/worker\/mis-tareas\/?$/, title: "Mis Tareas" },
  { match: /^\/worker\/mi-perfil\/?$/, title: "Mi Perfil" },
  { match: /^\/worker\/notificaciones\/?$/, title: "Notificaciones" },
  { match: /^\/worker\/detalleTarea\/\d+\/?$/, title: "Detalle de Tarea" },
];

export default function AppTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const found = TITLES.find((x) => x.match.test(pathname));
    document.title = found?.title ? `${found.title} – ${APP_NAME}` : APP_NAME;
  }, [pathname]);

  return null;
}
