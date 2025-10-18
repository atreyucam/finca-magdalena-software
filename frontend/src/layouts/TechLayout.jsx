import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import { clsx } from "clsx";

/* --- Items de navegación --- */
const base = "/tech";
const items = [
  { to: `${base}/dashboard`, label: "Dashboard" },
  { to: `${base}/tareas`, label: "Tareas" },
  { to: `${base}/inventario`, label: "Inventario" },
  { to: `${base}/metricas`, label: "Métricas" },
  { to: `${base}/notificaciones`, label: "Notificaciones" },
];

/* --- Hook media query --- */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function TechLayout() {
  const [open, setOpen] = useState(true);
  const isLG = useMediaQuery("(min-width: 1024px)");
  const isXL = useMediaQuery("(min-width: 1280px)");

  const handleToggle = () => {
    if (!isLG) setOpen((s) => !s);      // móvil
    else if (isXL) setOpen((s) => !s);  // desktop
  };

  return (
    <div className="min-h-dvh bg-white overflow-x-hidden">
      <Topbar onToggleSidebar={handleToggle} isSidebarOpen={open} />
      <div
        className={clsx(
          "relative grid",
          "grid-cols-1",
          "lg:grid-cols-[4.5rem_1fr]",
          open ? "xl:grid-cols-[16rem_1fr]" : "xl:grid-cols-[4.5rem_1fr]"
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
