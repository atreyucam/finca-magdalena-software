import { AlertTriangle, XCircle, Settings } from "lucide-react";

export default function AlertasStock({ alertas, onAjustar }) {
  if (!alertas || alertas.length === 0) return null;

  const agotados = alertas.filter((a) => Number(a.stock_actual) <= 0);
  const bajos = alertas.filter((a) => Number(a.stock_actual) > 0);

  return (
    <div className="space-y-3 animate-in slide-in-from-top-2">
      {/* 🔴 Agotados */}
      {agotados.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 mb-3 text-rose-800 font-black text-sm uppercase tracking-wide">
            <XCircle size={16} />
            Stock agotado
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agotados.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="font-black text-slate-900 truncate"
                      title={a.nombre}
                    >
                      {a.nombre}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-rose-700">
                      Se ha agotado todo el stock.
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 text-[11px] font-black">
                    AGOTADO
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  <div>
                    <span className="font-bold">Insumo</span> {a.nombre}
                  </div>

                  <div className="mt-1 font-mono">
                    Stock actual:{" "}
                    <span className="font-black text-rose-700">0</span>{" "}
                    {a.unidad} · Stock mínimo:{" "}
                    <span className="font-black">{a.stock_minimo}</span>{" "}
                    {a.unidad}
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-600">
                    Por favor: ajuste el stock del ítem inmediatamente.
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAjustar?.(a);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-100 px-3 py-2 text-xs font-black text-rose-800 hover:bg-rose-200 transition"
                  >
                    <Settings size={14} />
                    Ajustar stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🟠 Bajos */}
      {bajos.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3 text-amber-800 font-black text-sm uppercase tracking-wide">
            <AlertTriangle size={16} />
            Atención: Stock bajo detectado
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bajos.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="font-black text-slate-900 truncate"
                      title={a.nombre}
                    >
                      {a.nombre}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-amber-700">
                      Requiere reposición / ajuste.
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 text-[11px] font-black">
                    BAJO
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  <div>
                    <span className="font-bold">Insumo</span> {a.nombre}
                  </div>

                  <div className="mt-1 font-mono">
                    Stock actual:{" "}
                    <span className="font-black text-amber-700">
                      {a.stock_actual}
                    </span>{" "}
                    {a.unidad} · Stock mínimo:{" "}
                    <span className="font-black">{a.stock_minimo}</span>{" "}
                    {a.unidad}
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-600">
                    Por favor: ajuste el stock del ítem inmediatamente.
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAjustar?.(a);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-200 transition"
                  >
                    <Settings size={14} />
                    Ajustar stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
