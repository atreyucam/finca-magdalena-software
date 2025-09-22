import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

 const base = "/tech";
const items = [
  { to: `${base}/dashboard`, label: "Dashboard" },
  { to: `${base}/tareas`, label: "Tareas" },
  { to: `${base}/inventario`, label: "Inventario" },
  { to: `${base}/metricas`, label: "Métricas" },
  { to: `${base}/notificaciones`, label: "Notificaciones" },
 ];

export default function TechLayout() {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr]">
      <Topbar />
      <div className="grid grid-cols-[14rem_1fr]">
        <Sidebar items={items} />
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}
