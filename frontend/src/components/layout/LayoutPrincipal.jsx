import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import MenuLateral from "../MenuLateral"; // Tu componente existente
import BarraSuperior from "../BarraSuperior"; // Tu componente existente
import NotificationsBell from "../NotificationsBell"; // Tu componente existente

export default function LayoutPrincipal({ itemsMenu }) {
  // Lógica responsiva
  const [sidebarAbierto, setSidebarAbierto] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const handler = (e) => setSidebarAbierto(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Configurable */}
      <MenuLateral
        items={itemsMenu}
        abierto={sidebarAbierto}
        alCerrar={() => setSidebarAbierto(false)}
      />

      {/* Contenido Principal */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <BarraSuperior
          alAlternarMenuLateral={() => setSidebarAbierto(!sidebarAbierto)}
          menuLateralAbierto={sidebarAbierto}
          extraDerecha={<NotificationsBell />}
        />

        {/* Aquí se renderizan las páginas hijas */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}