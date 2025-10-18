// Sidebar.jsx
import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import {
  PiSquaresFourBold, PiCheckSquareOffsetBold, PiPackageBold,
  PiUsersThreeBold, PiChartLineUpBold, PiBellRingingBold
} from "react-icons/pi";

// Paleta del logo
const FM_GREEN = "#0F5E36";
const FM_ORANGE = "#F5A637";

const ICON = {
  Dashboard: <PiSquaresFourBold className="h-5 w-5" />,
  Tareas: <PiCheckSquareOffsetBold className="h-5 w-5" />,
  Inventario: <PiPackageBold className="h-5 w-5" />,
  Usuarios: <PiUsersThreeBold className="h-5 w-5" />,
  Métricas: <PiChartLineUpBold className="h-5 w-5" />,
  Notificaciones: <PiBellRingingBold className="h-5 w-5" />,
  "Mis tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
  "Mis Tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
};

/* ---------- SHEET MÓVIL (entra desde la izquierda) ---------- */
function MobileSheet({ items, open, onClose }) {
  useEffect(() => {
    const html = document.documentElement;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) {
      html.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      html.style.overflow = "";
    }
    return () => {
      html.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 ease-out lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sheet IZQUIERDA */}
      <div
        className={clsx(
          "fixed left-0 top-0 bottom-0 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] lg:hidden px-4 py-4",
          "transform transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] will-change-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Navegación"
      >
        <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-[15px] font-semibold text-slate-800">Navegación</h3>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[color:var(--fm-green)] text-white shadow-sm"
                        : "text-slate-700 hover:bg-[color:var(--fm-green-10)]"
                    )
                  }
                  style={{
                    // variables CSS para evitar repetir hex
                    ["--fm-green"]: FM_GREEN,
                    ["--fm-green-10"]: `${FM_GREEN}1A`, // 10% alpha
                    ["--fm-orange"]: FM_ORANGE,
                  }}
                >
                  {/* Indicador naranja cuando está activo */}
                  <span
                    className={clsx(
                      "absolute inset-y-1 left-1 w-1 rounded-full",
                      // mostrar solo cuando está activo (usa peer-state via group)
                      "group-[.bg-\\[color\\:var\\(--fm-green\\)\\]]:bg-[color:var(--fm-orange)]"
                    )}
                  />
                  {/* Ícono (tamaño fijo) */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {ICON[it.label] || ICON["Dashboard"]}
                  </div>
                  {/* Texto */}
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="border-t px-5 py-3 text-xs text-slate-500">
            © {new Date().getFullYear()} Finca La Magdalena
          </div>
        </aside>
      </div>
    </>,
    document.body
  );
}

/* ---------- SIDEBAR DESKTOP/LAPTOP ---------- */
export default function Sidebar({ items, open,  onClose  }) {
  return (
    <>
      {/* MÓVIL / TABLET */}
      <MobileSheet items={items} open={open}onClose={onClose} />

      {/* LAPTOP (lg…<xl): rail fijo */}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[4.5rem] border-r border-slate-300/80 bg-white lg:block xl:hidden">
        <nav className="flex h-full flex-col items-center gap-2 py-3">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              title={it.label}
              className={({ isActive }) =>
                clsx(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-[color:var(--fm-green)] text-white"
                    : "text-slate-700 hover:bg-[color:var(--fm-green-10)]"
                )
              }
              style={{
                ["--fm-green"]: FM_GREEN,
                ["--fm-green-10"]: `${FM_GREEN}1A`,
              }}
            >
              {ICON[it.label] || ICON["Dashboard"]}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* DESKTOP (≥xl): ancho animado + esquema de color */}
      <aside
        className={clsx(
          "sticky top-14 hidden xl:block h-[calc(100dvh-3.5rem)] border-r border-slate-300/80 bg-white",
          "transition-[width] duration-300 ease-in-out will-change-[width]",
          open ? "w-64" : "w-[4.5rem]"
        )}
      >
        <nav className="flex h-full flex-col gap-2 p-3">
          <div className="space-y-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) =>
                  clsx(
                    "group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[color:var(--fm-green)] text-white shadow-sm"
                      : "text-slate-700 hover:bg-[color:var(--fm-green-10)]"
                  )
                }
                style={{
                  ["--fm-green"]: FM_GREEN,
                  ["--fm-green-10"]: `${FM_GREEN}1A`,
                  ["--fm-orange"]: FM_ORANGE,
                }}
              >
                {/* Indicador naranja (solo activo) */}
                <span
                  className={clsx(
                    "absolute inset-y-1 left-1 w-1 rounded-full",
                    "group-[.bg-\\[color\\:var\\(--fm-green\\)\\]]:bg-[color:var(--fm-orange)]"
                  )}
                />

                {/* Ícono tamaño fijo */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {ICON[it.label] || ICON["Dashboard"]}
                </div>

                {/* Label animado (no cambia de tamaño el ícono) */}
                <div
                  className={clsx(
                    "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                    open ? "ml-3 opacity-100 max-w-[12rem]" : "ml-0 opacity-0 max-w-0"
                  )}
                >
                  {it.label}
                </div>
              </NavLink>
            ))}
          </div>

          <div
            className={clsx(
              "mt-auto border-t pt-3 text-xs text-slate-500 px-1",
              "transition-[opacity,transform,max-height] duration-200 ease-in-out overflow-hidden",
              open ? "opacity-100 translate-y-0 max-h-10" : "opacity-0 -translate-y-1 max-h-0"
            )}
          >
            © {new Date().getFullYear()} Finca La Magdalena
          </div>
        </nav>
      </aside>
    </>
  );
}
