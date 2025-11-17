import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

/* --- Items de navegación TECH --- */
const base = "/tech";
const items = [
  { to: `${base}/dashboard`, label: "Dashboard" },
  { to: `${base}/tareas`, label: "Tareas" },
  { to: `${base}/inventario`, label: "Inventario" },
  { to: `${base}/metricas`, label: "Métricas" },
  { to: `${base}/notificaciones`, label: "Notificaciones" },
];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    onChange(mql);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function TechLayout() {
  const isLG = useMediaQuery("(min-width: 1024px)");
  const isXL = useMediaQuery("(min-width: 1280px)");

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    if (isXL) setOpen(true);
    else if (!isLG) setOpen(false);
  }, [isLG, isXL]);

  const handleToggle = () => setOpen((s) => !s);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar items={items} open={open} onClose={() => setOpen(false)} />

      <div className="flex flex-1 min-w-0 flex-col min-h-0">
        <Topbar onToggleSidebar={handleToggle} isSidebarOpen={open} />

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
