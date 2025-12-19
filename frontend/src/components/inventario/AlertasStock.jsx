import { AlertTriangle } from "lucide-react"; // npm i lucide-react

export default function AlertasStock({ alertas }) {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold text-sm uppercase tracking-wide">
        <AlertTriangle size={16} />
        Atención: Stock Bajo detectado
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {alertas.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 border border-amber-100">
            <span className="text-sm font-medium text-amber-900 truncate mr-2" title={a.nombre}>
              {a.nombre}
            </span>
            <span className="text-xs font-mono text-amber-700 bg-amber-100 px-2 py-1 rounded-md whitespace-nowrap">
              {a.stock_actual} / min {a.stock_minimo} {a.unidad}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}