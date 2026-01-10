// src/components/tareas/HistorialSemanas.jsx
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getEstadoTareaUI } from "../../utils/estadoTareaStyles";

const fmtRango = (inicio, fin) => {
  const a = new Date(inicio);
  const b = new Date(fin);
  const opt = { day: "2-digit", month: "long", year: "numeric" };
  return `${a.toLocaleDateString("es-EC", opt)} - ${b.toLocaleDateString("es-EC", opt)}`;
};

const fmtDiaCorto = (isoDate) => {
  const d = new Date(isoDate);
  const day = d.toLocaleDateString("es-EC", { weekday: "short" }); // dom., sáb.
  const dm = d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit" }); // 11/01
  return `${day.replace(".", "")} ${dm}`;
};

export default function HistorialSemanas({ semanas = [], onVerDetalle = null }) {
  const [openIso, setOpenIso] = useState(semanas?.[0]?.semana_iso || null);

  // ✅ importante: cuando la data llega async, abrimos primera semana
 // ✅ auto-abrir SOLO cuando llegan semanas (async)
useEffect(() => {
  if (semanas?.length) {
    setOpenIso((prev) => prev ?? semanas[0].semana_iso);
  }
}, [semanas]);


  if (!semanas || semanas.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-white">
        <p className="text-sm text-slate-400 font-medium">No existen registros.</p>
        <p className="text-xs text-slate-400 mt-1">Aún no hay tareas asignadas en tu historial.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {semanas.map((w) => {
        const abierto = openIso === w.semana_iso;

        const total = w.items?.length || 0;
        const cont = (estado) => (w.items || []).filter((x) => x.estado === estado).length;

        return (
          <section key={w.semana_iso} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* HEADER de semana */}
            <button
              type="button"
              onClick={() => setOpenIso(abierto ? null : w.semana_iso)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900">
                    Semana {w.semana_iso}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {fmtRango(w.fecha_inicio, w.fecha_fin)}
                  </span>
                </div>

                {/* ✅ RESUMEN EN CHIPS (más limpio) */}
<div className="mt-2 flex flex-wrap gap-2">
  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
    <span className="font-black">{total}</span> tareas
  </span>

  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
    <span className="font-black">{cont("Completada")}</span> completadas
  </span>

  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
    <span className="font-black">{cont("Verificada")}</span> verificadas
  </span>

  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
    <span className="font-black">{cont("Cancelada")}</span> canceladas
  </span>
</div>

              </div>

              <ChevronDown className={`shrink-0 transition ${abierto ? "rotate-180" : ""}`} size={18} />
            </button>

            {/* BODY */}
            {abierto && (
              <div className="border-t border-slate-100">
                <div className="px-5 py-4">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-black">
                        <tr>
                          <th className="px-4 py-3 text-left">Día</th>
                          <th className="px-4 py-3 text-left">Tarea</th>
                          <th className="px-4 py-3 text-left">Lote</th>
                          <th className="px-4 py-3 text-right">Estado</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {(w.items || []).map((t) => {
                          const ui = getEstadoTareaUI(t.estado);

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                                {fmtDiaCorto(t.fecha_programada)}
                              </td>

                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {t.tipo || "—"}
                              </td>

                              <td className="px-4 py-3 text-slate-700">
                                {t.lote || "—"}
                              </td>

                              {/* ✅ ESTADO (SIN PUNTO) */}
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${ui.badge}`}>
                                  {t.estado}
                                </span>
                              </td>

                              {/* ✅ ACCIONES */}
                              <td className="px-4 py-3 text-right">
                                {onVerDetalle ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200/70 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onVerDetalle(t);
                                    }}
                                  >
                                    Ver
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {(!w.items || w.items.length === 0) && (
                    <p className="text-center text-sm text-slate-400 italic py-6">
                      No existen registros en esta semana.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
