import { useState } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import { clsx } from "clsx";

const base = "/owner";
const items = [
  { to: `${base}/dashboard`, label: "Dashboard" },
  { to: `${base}/tareas`, label: "Tareas" },
  { to: `${base}/inventario`, label: "Inventario" },
  { to: `${base}/usuarios`, label: "Usuarios" },
  { to: `${base}/metricas`, label: "Métricas" },
  { to: `${base}/notificaciones`, label: "Notificaciones" },
];

export default function OwnerLayout() {
  const [open, setOpen] = useState(true); // expandido por defecto

  const handleToggle = () => setOpen((s) => !s); // ahora también controla lg

  return (
    <div className="min-h-dvh bg-white overflow-x-hidden">
      <Topbar onToggleSidebar={handleToggle} isSidebarOpen={open} />

      <div
  className={clsx(
    "relative grid",
    "grid-cols-1",
    "lg:grid-cols-[4.5rem_1fr]",
    open ? "xl:grid-cols-[16rem_1fr]" : "xl:grid-cols-[4.5rem_1fr]",
    "transition-[grid-template-columns] duration-300 ease-in-out" // animación suave
  )}
>

        <Sidebar items={items} open={open} onClose={() => setOpen(false)} />
        <main className="min-h-[calc(100dvh-3.5rem)] p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
