import { Loader2 } from "lucide-react";

export default function Boton({
  children,
  onClick,
  tipo = "button",
  // ✅ soporta también "type" por si lo usas en otros componentes
  type,
  variante = "primario",
  cargando = false,
  disabled = false,
  icono: Icono,
  className = "",
  ...props // ✅ captura props nativos: form, id, name, etc.
}) {
  const bases =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const estilos = {
    primario: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
    secundario: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800",
    ambar: "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800",
    peligro: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
    exito: "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200",
    neutro: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200",
    fantasma: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-none",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-none",
    outlineExito: "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-none",
    outlineAlerta: "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 shadow-none",
    outlinePeligro: "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 shadow-none",
  };

  return (
    <button
      type={type ?? tipo}          // ✅ prioridad a "type" si lo pasas
      onClick={onClick}
      disabled={disabled || cargando}
      className={`${bases} ${estilos[variante] || estilos.primario} ${className}`}
      {...props}                   // ✅ aquí viaja form="editarUsuarioForm"
    >
      {cargando ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          {Icono && <Icono className="mr-2 h-4 w-4" />}
          {children}
        </>
      )}
    </button>
  );
}
