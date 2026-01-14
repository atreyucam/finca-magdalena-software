// frontend/src/components/ui/EstadoPanelVacio.jsx
import { Info, AlertCircle, CheckCircle, Calendar } from "lucide-react";

const ICONOS = {
  info: Info,
  error: AlertCircle,
  exito: CheckCircle,
  warn: AlertCircle,
  calendario: Calendar,
};

const ESTILOS = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  exito: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  calendario: "border-slate-200 bg-white text-slate-700",
};

export default function EstadoPanelVacio({
  tipo = "info",
  icono,          // opcional: puedes forzar un icono
  titulo,
  children,
  className = "",
}) {
  const Icono = icono || ICONOS[tipo] || Info;
  const claseColor = ESTILOS[tipo] || ESTILOS.info;

  return (
    <div
      className={[
        "rounded-2xl border p-10 text-center",
        "flex flex-col items-center justify-center gap-3",
        "min-h-[220px]",
        claseColor,
        className,
      ].join(" ")}
    >
      <div className="rounded-full border border-slate-200 bg-white p-4 shadow-sm">
        <Icono size={22} />
      </div>

      {titulo ? (
        <div className="font-extrabold text-slate-900">{titulo}</div>
      ) : null}

      <div className="max-w-xl text-sm text-slate-600 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
