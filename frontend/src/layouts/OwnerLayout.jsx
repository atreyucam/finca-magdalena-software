import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

/* --- Items de navegación OWNER --- */
const base = "/owner";
const items = [
  { to: `${base}/dashboard`, label: "Dashboard" },
  { to: `${base}/tareas`, label: "Tareas" },
  { to: `${base}/inventario`, label: "Inventario" },
  { to: `${base}/produccion`, label: "Producción" },
  { to: `${base}/usuarios`, label: "Usuarios" },
  { to: `${base}/pagos`, label: "Pagos"},
  { to: `${base}/metricas`, label: "Reportes" },
  { to: `${base}/notificaciones`, label: "Notificaciones" },
];

export default function OwnerLayout() {
  // sidebar abierto solo en >= xl al cargar
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const handler = (e) => setOpen(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleToggle = () => setOpen((s) => !s);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Columna izquierda: sidebar fijo */}
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />

      {/* Columna derecha: topbar fijo + contenido scrollable */}
      <div className="flex flex-1 min-w-0 flex-col min-h-0">
        <Topbar onToggleSidebar={handleToggle} isSidebarOpen={open} />

        <main className=" app-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
