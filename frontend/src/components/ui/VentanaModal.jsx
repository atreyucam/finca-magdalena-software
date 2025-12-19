import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react"; // Icono de cierre

export default function VentanaModal({
  abierto,
  cerrar,
  titulo,
  children,
  footer,
  ancho = "max-w-2xl", // Clases de Tailwind para el ancho
  bloquearCierre = false, // Si es true, no cierra al hacer click fuera o ESC
}) {
  const contenidoRef = useRef(null);

  // Manejo de cierre (ESC y Click fuera) y Bloqueo de Scroll
  useEffect(() => {
    if (!abierto) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // Bloquear scroll del fondo

    const handleKeyDown = (e) => {
      if (!bloquearCierre && e.key === "Escape") cerrar();
    };

    const handleClickOutside = (e) => {
      if (
        !bloquearCierre &&
        contenidoRef.current &&
        !contenidoRef.current.contains(e.target)
      ) {
        cerrar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.body.style.overflow = originalOverflow; // Restaurar scroll
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [abierto, cerrar, bloquearCierre]);

  if (!abierto) return null;

  // Renderizamos en un Portal para evitar conflictos de CSS
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 transition-opacity animate-in fade-in duration-200">
      <div
        ref={contenidoRef}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 ${ancho} animate-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
          {!bloquearCierre && (
            <button
              onClick={cerrar}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Cuerpo con scroll propio */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {children}
        </div>

        {/* Pie de página (Opcional) */}
        {footer && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}