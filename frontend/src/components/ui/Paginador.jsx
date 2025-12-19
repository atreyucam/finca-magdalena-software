import { ChevronLeft, ChevronRight } from "lucide-react";
import Boton from "./Boton"; // Usamos el botón de la Fase 1

export default function Paginador({ 
  paginaActual, 
  totalPaginas, 
  onCambiarPagina, 
  totalRegistros, // Opcional, para mostrar "X resultados"
  className = "" 
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className={`flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 ${className}`}>
      {/* Texto informativo móvil/desktop */}
      <div className="hidden sm:flex flex-1 items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Página <span className="font-medium text-slate-900">{paginaActual}</span> de{" "}
            <span className="font-medium text-slate-900">{totalPaginas}</span>
            {totalRegistros && (
              <> · Total: <span className="font-medium">{totalRegistros}</span> registros</>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Boton
            variante="fantasma"
            onClick={() => onCambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="px-2 py-1 h-8 w-8 !rounded-lg" // Ajuste manual para hacerlo cuadrado pequeño
          >
            <ChevronLeft size={16} />
          </Boton>
          
          <Boton
            variante="fantasma"
            onClick={() => onCambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="px-2 py-1 h-8 w-8 !rounded-lg"
          >
            <ChevronRight size={16} />
          </Boton>
        </div>
      </div>

      {/* Versión Móvil Simplificada */}
      <div className="flex sm:hidden w-full justify-between items-center text-xs">
        <button 
          onClick={() => onCambiarPagina(paginaActual - 1)}
          disabled={paginaActual === 1}
          className="disabled:opacity-50 font-medium text-slate-600"
        >
          Anterior
        </button>
        <span>{paginaActual} / {totalPaginas}</span>
        <button 
          onClick={() => onCambiarPagina(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          className="disabled:opacity-50 font-medium text-slate-600"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}