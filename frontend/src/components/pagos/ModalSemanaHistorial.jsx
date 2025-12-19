import { useEffect, useMemo, useState } from "react";
import { X, FileText, ExternalLink } from "lucide-react"; // Agregué iconos útiles
import Boton from "../ui/Boton";
import Badge from "../ui/Badge";
import useAuthStore from "../../store/authStore"; 

function fmtFechaES(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default function ModalSemanaHistorial({ open, nominaId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  
  const accessToken = useAuthStore((state) => state.accessToken);
  
  // === CORRECCIÓN AQUÍ: Usar BASE_URL o fallback ===
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

  useEffect(() => {
    const run = async () => {
      if (!open || !nominaId) return;

      setLoading(true);
      try {
        const url = `${apiUrl}/pagos/semana?nomina_id=${nominaId}`;
        
        const res = await fetch(url, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}` 
          },
        });

        if (!res.ok) throw new Error("No se pudo cargar la semana");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Error cargando historial:", e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [open, nominaId, apiUrl, accessToken]);

  const header = useMemo(() => {
    if (!data) return "-";
    return `${data.semana_iso} — ${fmtFechaES(data.fecha_inicio)} al ${fmtFechaES(data.fecha_fin)}`;
  }, [data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="text-lg font-black text-slate-900">Detalle Histórico</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{header}</div>
          </div>

          <Boton variante="fantasma" className="!p-2 text-slate-400 hover:text-slate-700" onClick={onClose}>
            <X size={20} />
          </Boton>
        </div>

        {/* body */}
        <div className="p-6 overflow-y-auto">
          {loading && (
             <div className="py-10 text-center animate-pulse">
                <div className="text-slate-400 text-sm">Cargando información...</div>
             </div>
          )}

          {!loading && !data && (
            <div className="py-10 text-center text-slate-500">No se pudo cargar la información.</div>
          )}

          {!loading && data && (
            <div className="space-y-6">
              {/* Info Bar */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Badge color={data.estado === "Aprobada" ? "verde" : "ambar"}>
                    Estado: {data.estado}
                </Badge>
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                <span className="text-xs text-slate-500">
                    Pago programado: <strong className="text-slate-700">{fmtFechaES(data.pago_programado)}</strong>
                </span>
                <div className="h-4 w-px bg-slate-300 mx-1"></div>
                <span className="text-xs text-slate-500">
                    Aprobado por: <strong className="text-slate-700">{data.aprobado_por_nombre || "-"}</strong>
                </span>
              </div>

              {/* Tabla */}
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Trabajador</th>
                      <th className="px-4 py-3">Cargo</th>
                      <th className="px-4 py-3 text-right">Días</th>
                      <th className="px-4 py-3 text-right">Tareas</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Recibo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.detalles || []).map((d) => {
                      const reciboUrl = d.recibo_pdf_path ? `${apiUrl}${d.recibo_pdf_path}` : null;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{d.trabajador?.nombre || "-"}</div>
                            <div className="text-xs text-slate-500 font-mono">{d.trabajador?.cedula}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{d.cargo || "-"}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{d.dias_laborados || 0}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{d.tareas_completadas || 0}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                             ${Number(d.monto_total || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {reciboUrl ? (
                              <div className="flex justify-end gap-2">
                                <a 
                                    href={reciboUrl}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                >
                                    Ver <ExternalLink size={10}/>
                                </a>
                              </div>
                            ) : (
                               <span className="text-xs text-slate-400 italic">No disponible</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Boton variante="fantasma" onClick={onClose} className="border-slate-300 text-slate-600">
            Cerrar
          </Boton>
        </div>
      </div>
    </div>
  );
}