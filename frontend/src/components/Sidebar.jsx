// Sidebar.jsx
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
  PiCurrencyDollarSimpleBold, // ⬅️ nuevo icono
  PiLeafBold,  
} from "react-icons/pi";
import logoFM from "../assets/Logo-FM.png";

// Paleta del logo
const FM_GREEN = "#0F5E36";
const FM_ORANGE = "#F5A637";

const ICON = {
  Dashboard: <PiSquaresFourBold className="h-5 w-5" />,
  Tareas: <PiCheckSquareOffsetBold className="h-5 w-5" />,
  Inventario: <PiPackageBold className="h-5 w-5" />,
  Usuarios: <PiUsersThreeBold className="h-5 w-5" />,
  Pagos: <PiCurrencyDollarSimpleBold className="h-5 w-5" />, // ⬅️ agregado
  Métricas: <PiChartLineUpBold className="h-5 w-5" />,
  Notificaciones: <PiBellRingingBold className="h-5 w-5" />,
  "Mis tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
  "Mis Tareas": <PiCheckSquareOffsetBold className="h-5 w-5" />,
  Producción: <PiLeafBold className="h-5 w-5" />, 
};

/* ---------- SHEET MÓVIL (entra desde la izquierda) ---------- */
function MobileSheet({ items, open, onClose }) {
  const homeTo = items?.[0]?.to || "/";

useEffect(() => {
  const onKey = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  if (open) {
    window.addEventListener("keydown", onKey);
  }

  return () => {
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
          {/* Header con logo + nombre (clic al dashboard) */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <NavLink
              to={homeTo}
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <img
                src={logoFM}
                alt="Finca La Magdalena"
                className="h-8 w-8 rounded-[6px] object-contain"
              />
              <span className="text-[15px] font-semibold text-slate-800">
                Finca La Magdalena
              </span>
            </NavLink>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
                        : "text-slate-700 hover"
                    )
                  }
                  style={{
                    ["--fm-green"]: FM_GREEN,
                    ["--fm-green-10"]: `${FM_GREEN}1A`,
                    ["--fm-orange"]: FM_ORANGE,
                  }}
                >
                  <span
                    className={clsx(
                      "absolute inset-y-1 left-1 w-1 rounded-full",
                      "group-[.bg-\\[color\\:var\\(--fm-green\\)\\]]:bg-[color:var(--fm-orange)]"
                    )}
                  />
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {ICON[it.label] || ICON["Dashboard"]}
                  </div>
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
export default function Sidebar({ items, open, onClose }) {
  const homeTo = items?.[0]?.to || "/";

  return (
    <>
      {/* MÓVIL / TABLET */}
      <MobileSheet items={items} open={open} onClose={onClose} />

      {/* LAPTOP (lg…<xl): rail fijo estrecho */}
      <aside className="sticky top-0 hidden h-screen w-[4.5rem] border-r border-slate-300/80 bg-white lg:block xl:hidden">
        <nav className="flex h-full flex-col items-center gap-2 py-3">
          {/* Logo solo ícono (clic al home) */}
          <NavLink
            to={homeTo}
            className="mb-3 mt-1 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              ["--fm-green"]: FM_GREEN,
              ["--fm-green-10"]: `${FM_GREEN}1A`,
            }}
          >
            <img
              src={logoFM}
              alt="Finca La Magdalena"
              className="h-7 w-7 rounded-[6px] object-contain"
            />
          </NavLink>

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
                    : "text-slate-700 hover"
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

      {/* DESKTOP (≥xl): ancho animado + logo + nombre */}
      <aside
        className={clsx(
          "sticky top-0 hidden h-screen border-r border-slate-300/80 bg-white xl:block",
          "transition-[width] duration-300 ease-in-out will-change-[width]",
          open ? "w-64" : "w-[4.5rem]"
        )}
      >
        <nav className="flex h-full flex-col gap-2 p-3">
          {/* HEADER: logo + nombre, clic al home */}
          <NavLink
            to={homeTo}
            className="mb-4 flex items-center px-1"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--fm-green--500)]"
              style={{
                ["--fm-green"]: FM_GREEN,
                ["--fm-green-10"]: `${FM_GREEN}1A`,
              }}
            >
              <img
                src={logoFM}
                alt="Finca La Magdalena"
                className="h-7 w-7 rounded-[6px] object-contain"
              />
            </div>
            <div
              className={clsx(
                "ml-3 overflow-hidden whitespace-nowrap text-[15px] font-semibold text-slate-800 transition-all duration-300 ease-in-out",
                open ? "opacity-100 max-w-[12rem]" : "opacity-0 max-w-0"
              )}
            >
              Finca La Magdalena
            </div>
          </NavLink>

          {/* NAV ITEMS */}
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
                <span
                  className={clsx(
                    "absolute inset-y-1 left-1 w-1 rounded-full",
                    "group-[.bg-\\[color\\:var\\(--fm-green\\)\\]]:bg-[color:var(--fm-orange)]"
                  )}
                />
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {ICON[it.label] || ICON["Dashboard"]}
                </div>
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
              "mt-auto border-t border-slate-300 pt-3 text-center text-xs text-slate-500 px-1",
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
