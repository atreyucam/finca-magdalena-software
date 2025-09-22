import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

 const base = "/worker";
 const items = [
   { to: `${base}/mis-tareas`, label: "Mis Tareas" },
   { to: `${base}/notificaciones`, label: "Notificaciones" },
 ];

export default function WorkerLayout() {
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
