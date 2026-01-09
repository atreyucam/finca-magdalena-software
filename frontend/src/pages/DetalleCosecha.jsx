import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { obtenerCosecha, cerrarCosecha } from "../api/apiClient";
import { Calendar, Tractor, CheckCircle2, Lock, ArrowLeft, Info, Sprout } from "lucide-react";
import useToast from "../hooks/useToast";

// UI Components
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";

export default function DetalleCosecha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cosecha, setCosecha] = useState(null);
  const [loading, setLoading] = useState(true);

  const notify = useToast();

  const cargarCosecha = async () => {
    setLoading(true);
    try {
      const res = await obtenerCosecha(id);
      setCosecha(res.data || res);
    } catch (e) {
      notify.error("Error al cargar el ciclo de cosecha");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarCosecha(); }, [id]);

  const handleCerrar = async () => {
    if (!cosecha.metricas.puedeCerrar) return;
    const fecha = window.prompt("Confirmar fecha de cierre (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!fecha) return;
    try {
      await cerrarCosecha(id, { fecha_fin: fecha });
      notify.success("Ciclo cerrado exitosamente");
      cargarCosecha();
    } catch (e) { notify.error("Error al cerrar ciclo"); }
  };

  if (loading) return <div className="py-20 text-center text-slate-400 animate-pulse">Cargando panel...</div>;
  if (!cosecha) return <div className="p-10 text-center text-rose-500">Ciclo no encontrado</div>;

  const esCerrada = cosecha.estado === "Cerrada";

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        
        {/* Navegación y Estado */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm">
            <ArrowLeft size={18}/> Volver a Producción
          </button>
        </div>

        {/* Panel de Información Principal */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-s uppercase">
                <Tractor size={22}/> Finca: {cosecha.Finca?.nombre}
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{cosecha.nombre}</h1>
              <p className="font-bold">Estado: <Badge variante={esCerrada ? "neutro" : "activo"}>{cosecha.estado.toUpperCase()}</Badge></p>
              <div className="flex flex-col gap-2  items-start p-2">
                <p className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">CÓDIGO: {cosecha.codigo}</p>
                <p className="text-xl font-mono text-slate-700 font-medium">{cosecha.anio_agricola_label}</p>
              </div>
              
            </div>

            <div className="flex flex-col items-end justify-center gap-4">
              <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verificación de Labores (100% Requerido)</p>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div className={`h-full transition-all duration-700 ${cosecha.metricas.puedeCerrar ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${cosecha.metricas.progresoVerificacion}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-700">{cosecha.metricas.progresoVerificacion}%</span>
                </div>
              </div>
              
              {!esCerrada && (
                <Boton 
                  variante={cosecha.metricas.puedeCerrar ? "primario" : "fantasma"} 
                  disabled={!cosecha.metricas.puedeCerrar}
                  onClick={handleCerrar}
                  icono={cosecha.metricas.puedeCerrar ? CheckCircle2 : Lock}
                  className="w-full md:w-auto"
                >
                  {cosecha.metricas.puedeCerrar ? "Cerrar Ciclo Productivo" : "Cierre Bloqueado (Tareas Pendientes)"}
                </Boton>
              )}
            </div>
          </div>
        </div>

        {/* Detalle de Etapas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Sprout size={16} className="text-emerald-500"/> Etapas Fenológicas Establecidas
               </h3>
               <div className="grid grid-cols-1 gap-3">
                 {cosecha.PeriodoCosechas?.map((p, idx) => (
                   <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
                     <div className="flex items-center gap-4">
                       <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-xs font-black text-slate-800">
                         0{idx + 1}
                       </span>
                       <span className="font-bold text-slate-700 text-sm">{p.nombre}</span>
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                       {esCerrada ? "HISTÓRICO" : "OBLIGATORIO"}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Resumen de Tareas */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">
            <h3 className="text-xs font-bold uppercase opacity-40 mb-8 tracking-widest">Resumen de Control</h3>
            <div className="space-y-8">
              <div className="flex justify-between items-baseline">
                <span className="text-sm opacity-60">Tareas Programadas</span>
                <span className="text-3xl font-black">{cosecha.metricas.totalTareas}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm opacity-60">Tareas Verificadas</span>
                <span className="text-3xl font-black text-emerald-400">{cosecha.metricas.verificadas}</span>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-white/10">
                <span className="text-sm opacity-60">Pendientes</span>
                <span className="text-3xl font-black text-amber-500">{cosecha.metricas.totalTareas - cosecha.metricas.verificadas}</span>
              </div>
            </div>
            {!cosecha.metricas.puedeCerrar && !esCerrada && (
              <div className="mt-10 p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                <Info size={18} className="text-amber-400 shrink-0"/>
                <p className="text-[10px] leading-relaxed opacity-60 font-medium">
                  Para cumplir con la trazabilidad técnica, no se permite el cierre del año agrícola hasta que todas las actividades del lote hayan sido verificadas por el administrador.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}