import { Info, AlertCircle, CheckCircle } from "lucide-react";

const ICONOS = {
  info: Info,
  error: AlertCircle,
  exito: CheckCircle,
  warn: AlertCircle
};

const ESTILOS = {
  info: "bg-slate-50 border-slate-200 text-slate-600",
  error: "bg-rose-50 border-rose-200 text-rose-700",
  exito: "bg-emerald-50 border-emerald-200 text-emerald-700",
  warn: "bg-amber-50 border-amber-200 text-amber-800"
};

export default function EstadoVacio({ tipo = "info", titulo, children }) {
  const Icono = ICONOS[tipo] || Info;
  const claseColor = ESTILOS[tipo] || ESTILOS.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${claseColor} animate-in fade-in`}>
      <div className="shrink-0 mt-0.5">
        <Icono size={20} />
      </div>
      <div>
        {titulo && <h4 className="font-bold mb-1">{titulo}</h4>}
        <div className="opacity-90 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}