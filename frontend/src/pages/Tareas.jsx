import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

import { useNavigate, useLocation } from "react-router-dom";
import { 
  Plus, Filter, Calendar, MapPin, 
  ClipboardList, Clock, PlayCircle, CheckCircle2, 
  Eye, Tractor, ShieldCheck, UserCheck, XCircle
} from "lucide-react";

import { listarTareas, listarLotes, listarTiposActividad, resumenTareas, listarFincas } from "../api/apiClient";
import useListado from "../hooks/useListado";
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda, TablaVacia } from "../components/ui/Tabla";
import Paginador from "../components/ui/Paginador";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge"; 
import CrearTareaModal from "../components/CrearTareaModal";

const fmtFechaHora = (v) => (v ? new Date(v).toLocaleString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : "—");

export default function Tareas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [lotes, setLotes] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, porGrupo: {}, porFinca: {} });
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);

  const {
    datos: tareas,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    recargar
  } = useListado(listarTareas, { 
    estado: "", 
    lote_id: "", 
    finca_id: "", 
    tipo_codigo: "", 
    fecha_rango: "" 
  });

const recargarTodo = useCallback(() => {
  recargar();
  resumenTareas().then(res => setResumen(res.data)).catch(console.error);
}, [recargar]);


  useEffect(() => {
  const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000", {
    transports: ["websocket", "polling"], // opcional pero ayuda
  });

  const onUpdate = () => {
    // refresca tabla + cards/tabs
    recargarTodo();
  };

  socket.on("tareas:update", onUpdate);

  return () => {
    socket.off("tareas:update", onUpdate);
    socket.disconnect();
  };
  // 👇 importante: recargarTodo debe existir antes (como ya lo tienes)
}, [recargarTodo]);


  useEffect(() => {
    const cargarAuxiliares = async () => {
      try {
        const [resLotes, resFincas, resTipos, resResumen] = await Promise.all([
          listarLotes(), 
          listarFincas(),
          listarTiposActividad(),
          resumenTareas()
        ]);
        setLotes(resLotes.data || []);
        setFincas(resFincas.data || []);
        setTiposActividad(resTipos.data || []);
        setResumen(resResumen.data || { total: 0, porGrupo: {}, porFinca: {} });
      } catch (e) {
        console.error("Error cargando auxiliares", e);
      }
    };
    cargarAuxiliares();
  }, []);
const base =
  location.pathname.startsWith("/tech") ? "/tech" :
  location.pathname.startsWith("/worker") ? "/worker" :
  "/owner";
  const irADetalle = (id) => navigate(`${base}/detalleTarea/${id}`, { state: { from: location.pathname } });

  const toggleFiltroEstado = (estado) => {
    actualizarFiltro("estado", filtros.estado === estado ? "" : estado);
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Tareas</h1>
            <p className="text-slate-500 font-medium">Control operativo de labores agrícolas.</p>
          </div>
          <div className="flex gap-2">
            <Boton onClick={() => setModalCrearAbierto(true)} icono={Plus}>
              Nueva Tarea
            </Boton>
          </div>
        </div>

        {/* --- CARDS DE RESUMEN (ESTADOS) --- */}
        {/* Cambio: md:grid-cols-7 -> md:grid-cols-6 (Queda perfecto) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            
            {/* 1. TOTAL */}
            <div onClick={() => actualizarFiltro("estado", "")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${!filtros.estado ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200" : "bg-white border-slate-100"}`}>
                <div className="flex items-center gap-2 mb-1 opacity-80"><ClipboardList size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Total</span></div>
                <div className="text-2xl font-black">{resumen.total || 0}</div>
            </div>

            {/* 2. POR HACER (Fusión de Pendientes + Asignadas) */}
            {/* Al hacer click, filtramos por 'Pendiente' como punto de partida, o podrías dejarlo sin filtro específico si prefieres */}
            <div onClick={() => toggleFiltroEstado("Pendiente")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${["Pendiente", "Asignada"].includes(filtros.estado) ? "bg-amber-100 border-amber-200 ring-2 ring-amber-100" : "bg-amber-50/50 border-amber-100 text-amber-900/60"}`}>
                <div className="flex items-center gap-2 mb-1 text-amber-600"><Clock size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Por Hacer</span></div>
                {/* Sumamos ambas cantidades */}
                <div className="text-2xl font-black text-amber-800">
                    {(resumen.porGrupo?.Pendientes || 0) + (resumen.porGrupo?.Asignadas || 0)}
                </div>
            </div>

            {/* 3. EN CURSO */}
            <div onClick={() => toggleFiltroEstado("En progreso")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${filtros.estado === "En progreso" ? "bg-sky-100 border-sky-200 ring-2 ring-sky-100" : "bg-sky-50/50 border-sky-100 text-sky-900/60"}`}>
                <div className="flex items-center gap-2 mb-1 text-sky-600"><PlayCircle size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">En Curso</span></div>
                <div className="text-2xl font-black text-sky-800">{resumen.porGrupo?.["En_Progreso"] || 0}</div>
            </div>

            {/* 4. COMPLETADAS */}
            <div onClick={() => toggleFiltroEstado("Completada")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${filtros.estado === "Completada" ? "bg-emerald-100 border-emerald-200 ring-2 ring-emerald-100" : "bg-emerald-50/50 border-emerald-100 text-emerald-900/60"}`}>
                <div className="flex items-center gap-2 mb-1 text-emerald-600"><CheckCircle2 size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Listas</span></div>
                <div className="text-2xl font-black text-emerald-800">{resumen.porGrupo?.Completadas || 0}</div>
            </div>

            {/* 5. VERIFICADAS */}
            <div onClick={() => toggleFiltroEstado("Verificada")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${filtros.estado === "Verificada" ? "bg-violet-100 border-violet-200 ring-2 ring-violet-100" : "bg-violet-50/50 border-violet-100 text-violet-900/60"}`}>
                <div className="flex items-center gap-2 mb-1 text-violet-600"><ShieldCheck size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Verificadas</span></div>
                <div className="text-2xl font-black text-violet-800">{resumen.porGrupo?.Verificadas || 0}</div>
            </div>

            {/* 6. CANCELADAS */}
            <div onClick={() => toggleFiltroEstado("Cancelada")} className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${filtros.estado === "Cancelada" ? "bg-rose-100 border-rose-200 ring-2 ring-rose-100" : "bg-rose-50/50 border-rose-100 text-rose-900/60"}`}>
                <div className="flex items-center gap-2 mb-1 text-rose-600"><XCircle size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Canceladas</span></div>
                <div className="text-2xl font-black text-rose-800">{resumen.porGrupo?.Canceladas || 0}</div>
            </div>
        </div>

        {/* --- 🌟 PESTAÑAS DE FINCAS (Estilo Inteligente) --- */}
        {fincas.length > 0 && (
            <div className="mb-6">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Botón Todas */}
                    <button 
                        onClick={() => actualizarFiltro("finca_id", "")}
                        className={`group flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap
                            ${!filtros.finca_id 
                                ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200 scale-105" 
                                : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
                            }`}
                    >
                        <span>Todas</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${!filtros.finca_id ? "bg-slate-600 text-slate-100" : "bg-slate-100 text-slate-400 group-hover:bg-white"}`}>
                            {resumen.total || 0}
                        </span>
                    </button>

                    {/* Botones por Finca */}
                    

{/* Botones por Finca (Fragmento modificado) */}

{fincas.map(f => {
    // Aseguramos comparar strings para evitar errores '1' vs 1
    const isActive = String(filtros.finca_id) === String(f.id);
    const stats = resumen.porFinca?.[f.id] || { total: 0, listas: 0 };
    
    // Lógica: Completado (Verde) vs Pendiente (Ámbar) vs Vacío (Gris)
    const hayTareas = stats.total > 0;
    const todoListo = hayTareas && stats.listas === stats.total;
    
    // Clases por defecto (Inactivo)
    let btnClass = "bg-white text-slate-500 border-slate-200 hover:bg-slate-50";
    let iconClass = "text-slate-400";
    let badgeClass = "bg-slate-100 text-slate-500";

    if (isActive) {
        // --- ESTADO ACTIVO (SELECCIONADO) ---
        if (todoListo) {
            // VERDE SÓLIDO (Todo listo)
            btnClass = "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100 ring-2 ring-emerald-100";
            iconClass = "text-emerald-100";
            badgeClass = "bg-emerald-700 text-emerald-50";
        } else if (hayTareas) {
            // ÁMBAR SÓLIDO (Hay pendientes)
            btnClass = "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-100 ring-2 ring-amber-100";
            iconClass = "text-amber-50";
            badgeClass = "bg-amber-600 text-amber-50";
        } else {
            // GRIS OSCURO (Sin tareas - Default activo)
            btnClass = "bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-200";
            iconClass = "text-slate-300";
            badgeClass = "bg-slate-600 text-slate-200";
        }
    } else {
        // --- ESTADO INACTIVO (Solo Borde/Texto) ---
        if (todoListo) {
            btnClass = "bg-emerald-50/30 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
            iconClass = "text-emerald-500";
            badgeClass = "bg-emerald-100 text-emerald-700";
        } else if (hayTareas) {
            btnClass = "bg-amber-50/30 text-amber-700 border-amber-200 hover:bg-amber-50";
            iconClass = "text-amber-500";
            badgeClass = "bg-amber-100 text-amber-700";
        }
    }

    return (
        <button 
            key={f.id}
            onClick={() => actualizarFiltro("finca_id", String(f.id))}
            className={`group flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap ${btnClass}`}
        >
            <Tractor size={18} className={iconClass}/>
            <span>{f.nombre}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${badgeClass}`}>
                {stats.listas}/{stats.total}
            </span>
        </button>
    )
})}


<br/>
                </div>
            </div>
        )}

        {/* --- FILTROS SECUNDARIOS (Estilo Card) --- */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha</label>
                <select className="input-card" value={filtros.fecha_rango} onChange={(e) => actualizarFiltro("fecha_rango", e.target.value)}>
                    <option value="">Todas las fechas</option>
                    <option value="hoy_atrasadas">Hoy + Atrasadas</option>
                    <option value="proximos_7">Próxima Semana</option>
                    <option value="ultimos_30">Último Mes</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Lote</label>
                <select className="input-card" value={filtros.lote_id} onChange={(e) => actualizarFiltro("lote_id", e.target.value)}>
                    <option value="">Todos los lotes</option>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Actividad</label>
                <select className="input-card" value={filtros.tipo_codigo} onChange={(e) => actualizarFiltro("tipo_codigo", e.target.value)}>
                    <option value="">Todas las actividades</option>
                    {tiposActividad.map(t => <option key={t.codigo} value={t.codigo}>{t.nombre}</option>)}
                </select>
            </div>

            <div className="flex items-end">
                <button onClick={limpiarFiltros} className="input-card flex justify-center items-center font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                  <Filter size={16} className="mr-2"/> Limpiar filtros
                </button>
            </div>
        </div>

        {/* --- TABLA --- */}
        <Tabla>
            <TablaCabecera>
                <TablaHead className="w-16">ID</TablaHead>
                <TablaHead>Actividad / Detalle</TablaHead>
                <TablaHead>Finca</TablaHead>
                <TablaHead>Lote</TablaHead>
                <TablaHead>Fecha Prog.</TablaHead>
                <TablaHead align="center">Estado</TablaHead>
                <TablaHead align="right">Acción</TablaHead>
            </TablaCabecera>

            <TablaCuerpo>
                {cargando ? [...Array(5)].map((_, i) => (
                    <TablaFila key={i}><TablaCelda colSpan={7} className="py-6"><div className="h-4 bg-slate-100 rounded animate-pulse"/></TablaCelda></TablaFila>
                )) : tareas.length === 0 ? <TablaVacia mensaje="No hay tareas con estos filtros." colSpan={7} /> : 
                tareas.map((t) => (
                    <TablaFila key={t.id} className={t.estado === "En progreso" ? "bg-blue-50/40" : ""}>
                        <TablaCelda className="text-slate-500 font-mono text-xs">#{t.id}</TablaCelda>
                        <TablaCelda>
                            <div className="font-bold text-slate-800">{t.titulo || t.tipo}</div>
                            <div className="text-xs text-slate-500 uppercase">{t.tipo_codigo}</div>
                        </TablaCelda>
                        <TablaCelda>
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                <Tractor size={14} className="text-slate-400"/> {t.finca || "-"}
                            </div>
                        </TablaCelda>
                        <TablaCelda className="text-slate-600">
                            <div className="flex items-center gap-1.5"><MapPin size={14} className="text-emerald-600"/> {t.lote}</div>
                        </TablaCelda>
                        <TablaCelda className="text-slate-600">
                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> {fmtFechaHora(t.fecha_programada)}</div>
                        </TablaCelda>
                        <TablaCelda align="center"><Badge variante={t.estado}>{t.estado}</Badge></TablaCelda>
                        <TablaCelda align="right">
                            <Boton variante="fantasma"
                            onClick={() => irADetalle(t.id)} 
                            className="!px-2 !py-1 text-xs font-bold border border-slate-200"
                            >Ver</Boton>
                              
        
                        </TablaCelda>
                    </TablaFila>
                ))}
            </TablaCuerpo>
        </Tabla>

        {tareas.length > 0 && <Paginador paginaActual={pagina} totalPaginas={totalPaginas} totalRegistros={totalRegistros} onCambiarPagina={setPagina} mostrarSiempre />}
      </div>

      <CrearTareaModal open={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)} onCreated={recargarTodo} />
      
      {/* Estilos actualizados al final de Tareas.jsx */}
<style>{`
  .input-card { 
      width: 100%; 
      border-radius: 1rem; /* rounded-2xl */
      border: 1px solid #e2e8f0; 
      background-color: #ffffff; /* Blanco limpio */
      padding: 0.65rem 1rem; 
      font-size: 0.875rem; 
      color: #475569;
      outline: none;
      transition: all 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* Sombra sutil */
  }
  .input-card:focus { 
      border-color: #10b981; 
      box-shadow: 0 0 0 3px #d1fae5; /* Ring verde suave */
  }
  /* ... resto de estilos ... */
`}</style>
    </section>
  );
}