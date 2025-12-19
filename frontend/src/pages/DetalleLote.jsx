import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Tractor, Layout } from "lucide-react";
import { obtenerLote, toggleEstadoLote } from "../api/apiClient";

// UI Components
import TablaTareas from "../components/tareas/TablaTareas";
import ResumenTareas from "../components/tareas/ResumenTareas";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import LinkVolver from "../components/ui/LinkVolver";

const PAGE_SIZE = 20;

export default function DetalleLote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [tareas, setTareas] = useState([]);
  const [totalTareas, setTotalTareas] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [resumenTareas, setResumenTareas] = useState({
    total: 0, pendientes: 0, en_progreso: 0, completadas: 0,
    asignadas: 0, canceladas: 0, verificadas: 0,
  });

  const fetchLote = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await obtenerLote(id, { incluirTareas: 1, page, limit: PAGE_SIZE });
      const data = res.data || res;
      setLote(data);
      
      const t = data.tareas || {};
      setTareas(t.rows || []);
      setTotalTareas(t.count || 0);
      setTotalPages(t.totalPages || 1);
      setResumenTareas(data.resumenTareas || { total: 0 });
    } catch (err) {
      setError("No se pudo cargar la información del lote.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLote(); }, [id, page]);

  const handleToggleEstado = async () => {
    if (!lote) return;
    const activar = lote.estado !== "Activo";
    if (!window.confirm(activar ? `¿Activar lote?` : `¿Desactivar lote?`)) return;
    try {
      const res = await toggleEstadoLote(lote.id);
      const updated = res.data || res;
      setLote((prev) => ({ ...prev, estado: updated.estado }));
    } catch (err) {
      alert("No se pudo cambiar el estado.");
    }
  };

  const irADetalleTarea = (tareaId) => {
    navigate(`/owner/detalleTarea/${tareaId}`, { state: { from: location.pathname } });
  };

  const formatearFecha = (f) => f ? new Date(f).toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" }) : "Sin registro";

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Cargando información técnica...</div>;
  if (error || !lote) return <div className="p-10 text-center text-rose-500">{error || "Lote no encontrado."}</div>;

  const estadoLote = lote?.estado || "Activo";
  const labelClass = "block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest";

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">




        {/* BLOQUE 1: NAVEGACIÓN SUPERIOR UNIFICADA */}
        <div className="flex items-center justify-between">
          <LinkVolver to="/owner/produccion" label="Volver a Producción" />
        </div>




        {/* BLOQUE 2: PANEL DE INFORMACIÓN (Card Blanca) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-s uppercase">
                <Tractor size={24}/> Finca: {lote.finca?.nombre || "No asignada"}
              </div>
              
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                {lote.nombre || `Lote #${lote.id}`}
              </h1>

              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  Estado: 
                  <Badge variante={estadoLote === "Activo" ? "activo" : "inactivo"}>
                    {estadoLote.toUpperCase()}
                  </Badge>
                </p>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 uppercase tracking-tighter">
                  <Layout size={12}/> ID Registro: {lote.id}
                </p>
              </div>
            </div>
            
            {/* 🟢 BOTÓN CON COLORES DINÁMICOS (Verde/Ámbar) */}
            <Boton 
              variante="fantasma" 
              onClick={handleToggleEstado}
              className={estadoLote === "Activo" 
                ? "!text-amber-600 !border-amber-200 hover:!bg-amber-50" 
                : "!text-emerald-600 !border-emerald-200 hover:!bg-emerald-50"
              }
            >
              {estadoLote === "Activo" ? "Desactivar Lote" : "Activar Lote"}
            </Boton>
          </div>




          {/* BLOQUE 3: GRID DE ATRIBUTOS TÉCNICOS */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8 pt-8 border-t border-slate-100">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <dt className={labelClass}>Número de plantas</dt>
              <dd className="text-2xl font-black text-slate-900">{lote.numero_plantas ?? "—"}</dd>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <dt className={labelClass}>Superficie total</dt>
              <dd className="text-2xl font-black text-slate-900">{lote.superficie_ha ?? "—"} ha</dd>
            </div>
            <div className="p-4">
              <dt className={labelClass}>Fecha de siembra</dt>
              <dd className="text-sm font-bold text-slate-700">{formatearFecha(lote.fecha_siembra)}</dd>
            </div>
            <div className="p-4">
              <dt className={labelClass}>Registro en sistema</dt>
              <dd className="text-sm font-bold text-slate-700">{formatearFecha(lote.created_at)}</dd>
            </div>
          </dl>
        </div>




        {/* BLOQUE 4: SECCIÓN OPERATIVA (Tareas y Métricas) */}
        <ResumenTareas
          total={resumenTareas.total}
          porGrupo={{
            Pendientes: resumenTareas.pendientes,
            "En progreso": resumenTareas.en_progreso,
            Completadas: resumenTareas.completadas,
            Verificadas: resumenTareas.verificadas,
            Canceladas: resumenTareas.canceladas,
          }}
          filtroActivo={filtroEstado}
          setFiltro={setFiltroEstado}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Historial de Labores</h3>
            <span className="text-[10px] font-bold text-slate-400 italic">Datos en tiempo real</span>
          </div>
          <TablaTareas tareas={tareas} onVerDetalle={irADetalleTarea} mostrarLote={false} />
        </div>

        {totalTareas > PAGE_SIZE && (
          <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
              <Boton variante="fantasma" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Boton>
              <span className="text-xs font-bold text-slate-400 uppercase">Página {page} de {totalPages}</span>
              <Boton variante="fantasma" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Boton>
          </div>
        )}

      </div>
    </section>
  );
}