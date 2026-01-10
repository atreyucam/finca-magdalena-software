// frontend/src/components/ui/Paginador.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Paginador({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
  totalRegistros,
  className = "",
  mostrarSiempre = false,   // ✅ nuevo
}) {
  const noHayPaginas = !totalPaginas || totalPaginas <= 0;
  const paginas = noHayPaginas ? 1 : totalPaginas;
  const pagina = paginaActual || 1;

  // ✅ antes retornabas null. Ahora solo ocultas si NO quieres mostrarSiempre.
  if (!mostrarSiempre && paginas <= 1) return null;

  const irAnterior = () => onCambiarPagina(Math.max(1, pagina - 1));
  const irSiguiente = () => onCambiarPagina(Math.min(paginas, pagina + 1));

  const btnBase =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors " +
    "hover:bg-slate-50 hover:text-slate-900 " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className={[
        "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3",
        "rounded-b-2xl",
        className,
      ].join(" ")}
    >
      {/* Desktop */}
      <div className="hidden sm:flex flex-1 items-center justify-between">
        <p className="text-xs text-slate-500">
          Página <span className="font-medium text-slate-900">{pagina}</span> de{" "}
          <span className="font-medium text-slate-900">{paginas}</span>
          {typeof totalRegistros === "number" && (
            <>
              {" "}
              · Total: <span className="font-medium text-slate-900">{totalRegistros}</span> registros
            </>
          )}
        </p>

        <div className="flex gap-2">
          <button onClick={irAnterior} disabled={pagina <= 1} className={btnBase} aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>

          <button onClick={irSiguiente} disabled={pagina >= paginas} className={btnBase} aria-label="Siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Móvil */}
      <div className="flex sm:hidden w-full justify-between items-center text-xs">
        <button onClick={irAnterior} disabled={pagina <= 1} className="font-medium text-slate-700 disabled:opacity-40">
          Anterior
        </button>

        <span className="text-slate-600">
          {pagina} / {paginas}
        </span>

        <button
          onClick={irSiguiente}
          disabled={pagina >= paginas}
          className="font-medium text-slate-700 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
