// src/components/ui/VentanaModal.jsx
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function VentanaModal({
  abierto,
  cerrar,
  titulo = null,

  // ✅ opcionales (solo para modales “grandes/bonitos”)
  descripcion = null,
  icon: Icon = null,
  footer = null,

  // ✅ defaults que NO rompen modales pequeños (igual a tu versión)
  maxWidthClass = "sm:max-w-[min(880px,calc(100vw-1rem))]",

  // ✅ por defecto NO mete padding (igual a tu versión)
  bodyClass = "",

  children,
  className = "",
}) {
  const panelRef = useRef(null);

  // cerrar con ESC + bloquear scroll
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => {
      if (e.key === "Escape") cerrar?.();
    };
    document.addEventListener("keydown", onKey);

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, [abierto, cerrar]);

  // click outside
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) cerrar?.();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [abierto, cerrar]);

  if (!abierto) return null;

  const showHeader = !!titulo;
  const showFooter = !!footer;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div
        ref={panelRef}
        className={`
          w-full max-w-none ${maxWidthClass}
          h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]
          rounded-none sm:rounded-2xl border border-slate-200 bg-white
          shadow-[0_24px_60px_rgba(0,0,0,.18)]
          overflow-hidden flex flex-col ${className}
        `}
      >
        {/* ✅ HEADER SOLO SI HAY TITULO */}
        {showHeader && (
          <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {Icon ? (
                  <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl border border-emerald-100 mt-0.5 shrink-0">
                    <Icon size={18} />
                  </div>
                ) : null}

                <div className="min-w-0">
                  {typeof titulo === "string" ? (
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight truncate">
                      {titulo}
                    </h3>
                  ) : (
                    <div className="min-w-0">{titulo}</div>
                  )}

                  {descripcion ? (
                    <p className="text-sm text-slate-500 mt-0.5">{descripcion}</p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={cerrar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ✅ BODY: por defecto sin padding (igual a tu versión),
            pero si pasas bodyClass, se aplica */}
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClass}`}>
          {children}
        </div>

        {/* ✅ FOOTER opcional */}
        {showFooter ? (
          <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-white">
            <div className="flex items-center justify-end gap-2">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
