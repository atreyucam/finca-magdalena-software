import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import {
  PiSquaresFourBold,
  PiCheckSquareOffsetBold,
  PiPackageBold,
  PiUsersThreeBold,
  PiChartLineUpBold,
  PiBellRingingBold,
  PiCurrencyDollarSimpleBold,
  PiLeafBold,
} from "react-icons/pi";
import logoFM from "../assets/Logo-FM.png"; // Asegúrate que la ruta sea correcta

// Configuración de Estilos y Colores
const COLORES = {
  verde: "#0F5E36",
  naranja: "#F5A637",
  fondoHover: "#0F5E361A", // Verde con opacidad
};

// Diccionario de Iconos
const ICONOS = {
  Dashboard: <PiSquaresFourBold className="h-5 w-5" />,
  Tareas: <PiCheckSquareOffsetBold className="h-5 w-5" />,
  Inventario: <PiPackageBold className="h-5 w-5" />,
  Usuarios: <PiUsersThreeBold className="h-5 w-5" />,
  Pagos: <PiCurrencyDollarSimpleBold className="h-5 w-5" />,
  Métricas: <PiChartLineUpBold className="h-5 w-5" />,
  Notificaciones: <PiBellRingingBold className="h-5 w-5" />,
  "Mis tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
  "Mis Tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
  Producción: <PiLeafBold className="h-5 w-5" />,
  Reportes: <PiChartLineUpBold className="h-5 w-5" />,
};

// --- SUB-COMPONENTE: Item de Navegación ---
function ItemNavegacion({ to, label, onClick, expandido = true }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={label}
      className={({ isActive }) =>
        clsx(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-[#0F5E36] text-white shadow-sm"
            : "text-slate-700 hover:bg-[#0F5E361A]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicador lateral (bolita naranja) */}
          <span
            className={clsx(
              "absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-colors",
              isActive ? "bg-[#F5A637]" : "bg-transparent"
            )}
          />
          
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            {ICONOS[label] || ICONOS["Dashboard"]}
          </div>

          <div
            className={clsx(
              "whitespace-nowrap transition-all duration-300 overflow-hidden",
              expandido ? "opacity-100 max-w-[12rem] ml-0" : "opacity-0 max-w-0 -ml-2"
            )}
          >
            {label}
          </div>
        </>
      )}
    </NavLink>
  );
}

// --- SUB-COMPONENTE: Menú Móvil (Portal) ---
function MenuMovil({ items, abierto, alCerrar }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && alCerrar();
    if (abierto) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, alCerrar]);

  // Si no está abierto, no renderizamos nada para ahorrar recursos (salvo animación de salida si se desea)
  // Aquí usamos CSS para la animación de slide
  
  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={alCerrar}
        className={clsx(
          "fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px] transition-opacity lg:hidden",
          abierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Panel Lateral */}
      <aside
        className={clsx(
          "fixed left-0 top-0 bottom-0 z-[9999] w-[85vw] max-w-[320px] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden flex flex-col",
          abierto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={logoFM} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold text-slate-800 text-lg">Finca Magdalena</span>
          </div>
          <button onClick={alCerrar} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((it) => (
            <ItemNavegacion key={it.to} {...it} onClick={alCerrar} />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Sistema Finca</p>
        </div>
      </aside>
    </>,
    document.body
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function MenuLateral({ items, abierto, alCerrar }) {
  const rutaHome = items?.[0]?.to || "/";

  return (
    <>
      {/* Versión Móvil */}
      <MenuMovil items={items} abierto={abierto} alCerrar={alCerrar} />

      {/* Versión Escritorio (Responsive: width animado) */}
      <aside
        className={clsx(
          "hidden lg:flex flex-col h-screen border-r border-slate-200 bg-white sticky top-0 transition-[width] duration-300 ease-in-out",
          abierto ? "w-64" : "w-[4.5rem]"
        )}
      >
        {/* Header Logo */}
        <div className="flex items-center h-16 px-3 border-b border-transparent">
          <NavLink to={rutaHome} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <img src={logoFM} alt="F" className="h-7 w-7 object-contain" />
            </div>
            <div
              className={clsx(
                "overflow-hidden whitespace-nowrap font-bold text-slate-800 transition-all duration-300",
                abierto ? "opacity-100 w-auto" : "opacity-0 w-0"
              )}
            >
              Finca Magdalena
            </div>
          </NavLink>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 scrollbar-hide">
          {items.map((it) => (
            <ItemNavegacion key={it.to} {...it} expandido={abierto} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100">
          <div
            className={clsx(
              "text-xs text-slate-400 text-center transition-opacity duration-200",
              abierto ? "opacity-100" : "opacity-0 hidden"
            )}
          >
            Finca La Magdalena
          </div>
        </div>
      </aside>
    </>
  );
}