import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { connectSocket, getSocket } from "../lib/socket";
import { 
  ClipboardList, CheckCircle2, Clock, PlayCircle, MapPin, 
  Calendar, Filter, Tractor, ShieldCheck, XCircle
} from "lucide-react";
import { listarTareas, listarLotes, listarFincas, resumenTareas } from "../api/apiClient"; // ✅ Importar resumenTareas
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda, TablaVacia } from "../components/ui/Tabla";
import Paginador from "../components/ui/Paginador";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";

const fmtFechaHora = (v) => (v ? new Date(v).toLocaleString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : "—");

export default function MisTareas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tareas, setTareas] = useState([]);
  const [lotes, setLotes] = useState([]); 
  const [fincas, setFincas] = useState([]); 
  const [resumen, setResumen] = useState({ porFinca: {} }); // ✅ Nuevo estado para contadores de Finca
  const [loading, setLoading] = useState(true);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  
  // Filtros (Agregado fecha_rango)
  const [filtros, setFiltros] = useState({ estado: "", lote_id: "", finca_id: "", fecha_rango: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = { soloMias: true, page, limit: 20 };
      if (filtros.estado) q.estado = filtros.estado;
      if (filtros.lote_id) q.lote_id = filtros.lote_id;
      if (filtros.finca_id) q.finca_id = filtros.finca_id;
      if (filtros.fecha_rango) q.fecha_rango = filtros.fecha_rango; // ✅

      // Cargar todo en paralelo (Tareas, Lotes, Fincas y Resumen del trabajador)
      const [resTareas, resLotes, resFincas, resResumen] = await Promise.all([
        listarTareas(q),
        listarLotes(),
        listarFincas(),
        resumenTareas({ soloMias: true }) // El backend ya filtra por user si pasas query, o usa token
      ]);

      const data = resTareas.data?.data || [];
      const total = Number(resTareas.data?.total || data.length);
      const limit = Number(resTareas.data?.limit || q.limit || 20);
      setTareas(data);
      setTotalPages(Math.max(1, Math.ceil(total / Math.max(1, limit))));
      setTotalRegistros(total);
      
      setLotes(resLotes.data || []);
      setFincas(resFincas.data || []);
      setResumen(resResumen.data || { porFinca: {} });

    } catch (err) { console.error("Error", err); } finally { setLoading(false); }
  }, [filtros, page]);

  useEffect(() => { setPage(1); }, [filtros]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const onUpdate = () => {
      fetchData();
    };
    const onNotifNueva = (notif) => {
      if (notif?.tipo === "Tarea") {
        fetchData();
      }
    };

    socket.on("tareas:update", onUpdate);
    socket.on("notif:nueva", onNotifNueva);
    return () => {
      socket.off("tareas:update", onUpdate);
      socket.off("notif:nueva", onNotifNueva);
    };
  }, [fetchData]);

  // Métricas calculadas para las cards superiores
  // Métricas calculadas: Agrupamos Pendientes y Asignadas en "porHacer"
// Métricas calculadas: Agrupamos Pendientes y Asignadas en "porHacer"
  const metricas = useMemo(() => {
    return tareas.reduce((acc, t) => {
      acc.total++;
      // ✅ FUSIÓN: Si es Pendiente o Asignada, cuenta como "porHacer"
      if (["Pendiente", "Asignada"].includes(t.estado)) acc.porHacer++;
      
      if (t.estado === "En progreso") acc.progreso++;
      if (t.estado === "Completada") acc.completadas++;
      if (t.estado === "Verificada") acc.verificadas++;
      if (t.estado === "Cancelada") acc.canceladas++;
      return acc;
    }, { total: 0, porHacer: 0, progreso: 0, completadas: 0, verificadas: 0, canceladas: 0 });
  }, [tareas]);

  // ... dentro de MisTareas, antes del return ...

  const handleFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  
  // ✅ NUEVO: Helper para alternar filtros desde las cards (Igual que en Tareas.jsx)
  const toggleFiltroEstado = (estado) => {
    setFiltros(prev => ({ ...prev, estado: prev.estado === estado ? "" : estado }));
  };

  const irADetalle = (id) => navigate(`../detalleTarea/${id}`, { state: { from: location.pathname } });
  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Mis Tareas</h1>
            <p className="text-slate-500 font-medium">Gestiona tus actividades asignadas en el campo.</p>
          </div>
        </div>

       {/* ✅ CARDS INTERACTIVAS (6 Columnas) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            
            {/* 1. Total */}
            <div onClick={() => setFiltros(prev => ({...prev, estado: ""}))} className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${!filtros.estado ? "bg-slate-800 text-white border-slate-900 shadow-lg shadow-slate-200" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 mb-1 opacity-80"><ClipboardList size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Total</span></div>
                <div className="text-2xl font-black">{metricas.total}</div>
            </div>

            {/* 2. Por Hacer (Pendientes + Asignadas) */}
            <div 
                onClick={() => setFiltros(prev => ({...prev, estado: "Asignada"}))}
                className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    ["Asignada", "Pendiente"].includes(filtros.estado) 
                    ? "bg-amber-100 border-amber-200 text-amber-800 ring-2 ring-amber-100" 
                    : "bg-amber-50/50 border-amber-100 text-amber-700 hover:bg-amber-50"
                }`}
            >
                <div className="flex items-center gap-2 mb-1 text-amber-600">
                    <Clock size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Por Hacer</span>
                </div>
                {/* Usamos el nuevo contador agrupado */}
                <div className="text-2xl font-black text-amber-800">{metricas.porHacer}</div>
            </div>

            {/* 3. En Curso */}
            <div onClick={() => toggleFiltroEstado("En progreso")} className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${filtros.estado === "En progreso" ? "bg-sky-100 border-sky-200 text-sky-800 ring-2 ring-sky-200" : "bg-sky-50/50 border-sky-100 text-sky-700 hover:bg-sky-50"}`}>
                <div className="flex items-center gap-2 mb-1 text-sky-600"><PlayCircle size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">En Curso</span></div>
                <div className="text-2xl font-black text-sky-800">{metricas.progreso}</div>
            </div>

            {/* 4. Listas */}
            <div onClick={() => toggleFiltroEstado("Completada")} className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${filtros.estado === "Completada" ? "bg-emerald-100 border-emerald-200 text-emerald-800 ring-2 ring-emerald-200" : "bg-emerald-50/50 border-emerald-100 text-emerald-700 hover:bg-emerald-50"}`}>
                <div className="flex items-center gap-2 mb-1 text-emerald-600"><CheckCircle2 size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Listas</span></div>
                <div className="text-2xl font-black text-emerald-800">{metricas.completadas}</div>
            </div>

            {/* 5. Verificadas */}
            <div onClick={() => toggleFiltroEstado("Verificada")} className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${filtros.estado === "Verificada" ? "bg-violet-100 border-violet-200 text-violet-800 ring-2 ring-violet-200" : "bg-violet-50/50 border-violet-100 text-violet-700 hover:bg-violet-50"}`}>
                <div className="flex items-center gap-2 mb-1 text-violet-600"><ShieldCheck size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Verificadas</span></div>
                <div className="text-2xl font-black text-violet-800">{metricas.verificadas}</div>
            </div>

            {/* 6. Canceladas */}
            <div onClick={() => toggleFiltroEstado("Cancelada")} className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${filtros.estado === "Cancelada" ? "bg-rose-100 border-rose-200 text-rose-800 ring-2 ring-rose-100" : "bg-rose-50/50 border-rose-100 text-rose-700 hover:bg-rose-50"}`}>
                <div className="flex items-center gap-2 mb-1 text-rose-600"><XCircle size={18} /> <span className="text-[10px] uppercase font-bold tracking-wider">Canceladas</span></div>
                <div className="text-2xl font-black text-rose-800">{metricas.canceladas}</div>
            </div>
        </div>

        {/* --- 🌟 PESTAÑAS DE FINCAS (Igual que en Admin) --- */}
        {fincas.length > 0 && (
            <div className="mb-6">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setFiltros(prev => ({...prev, finca_id: ""}))}
                        className={`group flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all whitespace-nowrap
                            ${!filtros.finca_id 
                                ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200 scale-105" 
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-white"
                            }`}
                    >
                        <span>Todas</span>
                    </button>

                    {fincas.map(f => {
    const isActive = String(filtros.finca_id) === String(f.id);
    const stats = resumen.porFinca?.[f.id] || { total: 0, listas: 0 };
    
    const hayTareas = stats.total > 0;
    const todoListo = hayTareas && stats.listas === stats.total;
    
    // Base inactivo
    let btnClass = "bg-white text-slate-500 border-slate-200 hover:bg-slate-50";
    let iconClass = "text-slate-400";
    let badgeClass = "bg-slate-100 text-slate-500";

    if (isActive) {
        // --- ACTIVO (COLORES FUERTES) ---
        if (todoListo) {
            btnClass = "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100 ring-2 ring-emerald-100";
            iconClass = "text-emerald-100";
            badgeClass = "bg-emerald-700 text-emerald-50";
        } else if (hayTareas) {
            btnClass = "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-100 ring-2 ring-amber-100";
            iconClass = "text-amber-50";
            badgeClass = "bg-amber-600 text-amber-50";
        } else {
            // Default activo sin tareas
            btnClass = "bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-200";
            iconClass = "text-slate-300";
            badgeClass = "bg-slate-600 text-slate-200";
        }
    } else {
        // --- INACTIVO (Solo pistas de color) ---
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
            onClick={() => setFiltros(prev => ({...prev, finca_id: String(f.id)}))}
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
                </div>
            </div>
        )}

        {/* --- FILTROS (Estilo Card) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha</label>
                <select name="fecha_rango" className="input-card" value={filtros.fecha_rango} onChange={handleFiltro}>
                    <option value="">Todas las fechas</option>
                    <option value="hoy_atrasadas">Hoy + Atrasadas</option>
                    <option value="proximos_7">Próxima Semana</option>
                    <option value="ultimos_30">Último Mes</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Estado</label>
                <select name="estado" className="input-card" value={filtros.estado} onChange={handleFiltro}>
                    <option value="">Todos</option>
                    <option value="Asignada">Pendientes / Asignadas</option>
                    <option value="En progreso">En Progreso</option>
                    <option value="Completada">Completadas</option>
                </select>
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Lote</label>
                <select name="lote_id" className="input-card" value={filtros.lote_id} onChange={handleFiltro}>
                    <option value="">Todos los lotes</option>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
            </div>
            
            <div className="flex items-end">
                <button onClick={() => setFiltros({ estado: "", lote_id: "", finca_id: "", fecha_rango: "" })} className="input-card flex justify-center items-center font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                    <Filter size={16} className="mr-2"/> Limpiar filtros
                </button>
            </div>
        </div>

        {/* Tabla */}
        <Tabla>
            <TablaCabecera>
                <TablaHead className="w-16">ID</TablaHead>
                <TablaHead>Actividad</TablaHead>
                <TablaHead>Finca</TablaHead>
                <TablaHead>Ubicación</TablaHead>
                <TablaHead>Fecha</TablaHead>
                <TablaHead align="center">Estado</TablaHead>
                <TablaHead align="right">Acción</TablaHead>
            </TablaCabecera>

            <TablaCuerpo>
                {loading ? [...Array(5)].map((_, i) => (
                    <TablaFila key={i}><TablaCelda colSpan={7}><div className="h-4 bg-slate-100 rounded animate-pulse"/></TablaCelda></TablaFila>
                )) : tareas.length === 0 ? <TablaVacia mensaje="No tienes tareas." colSpan={7} /> : 
                tareas.map((t) => (
                    <TablaFila key={t.id} className={t.estado === "En progreso" ? "bg-blue-50/40" : ""}>
                        <TablaCelda className="text-slate-500 font-mono text-xs">#{t.id}</TablaCelda>
                        <TablaCelda>
                            <div className="font-bold text-slate-800">{t.titulo || t.tipo}</div>
                        </TablaCelda>
                        <TablaCelda><div className="flex items-center gap-1.5 text-slate-600"><Tractor size={14}/> {t.finca || "-"}</div></TablaCelda>
                        <TablaCelda><div className="flex items-center gap-1.5 text-slate-600"><MapPin size={14}/> {t.lote}</div></TablaCelda>
                        <TablaCelda><div className="flex items-center gap-1.5 text-slate-600"><Calendar size={14}/> {fmtFechaHora(t.fecha_programada)}</div></TablaCelda>
                        <TablaCelda align="center"><Badge variante={t.estado}>{t.estado}</Badge></TablaCelda>
                        <TablaCelda align="right">
<Boton variante="fantasma"
                            onClick={() => irADetalle(t.id)} 
                            className="!px-2 !py-1 text-xs font-bold border border-slate-200"
                            >Ver</Boton>                        </TablaCelda>
                    </TablaFila>
                ))}
            </TablaCuerpo>
        </Tabla>
        {tareas.length > 0 && <Paginador paginaActual={page} totalPaginas={totalPages} totalRegistros={totalRegistros} onCambiarPagina={setPage} />}
      </div>

      <style>{`
        .input-card { 
            width: 100%; 
            border-radius: 1rem; 
            border: 1px solid #e2e8f0; 
            background-color: #f8fafc; 
            padding: 0.75rem 1rem; 
            font-size: 0.875rem; 
            color: #334155;
            outline: none;
            transition: all 0.2s;
        }
        .input-card:focus { 
            background-color: white;
            border-color: #10b981; 
            box-shadow: 0 0 0 2px #d1fae5; 
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}

