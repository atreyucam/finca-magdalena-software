import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import useToast from "../hooks/useToast";
import usePageTitle from "../hooks/usePageTitle";

import { 
  ArrowLeft, Calendar, MapPin, Tag, 
  CheckCircle, User, ShieldCheck, 
  Package, Edit2, Play, Clock, Sprout, Tractor,
  AlertTriangle, XCircle,
  Link
} from "lucide-react";

import { obtenerTarea, listarNovedadesTarea, crearNovedadTarea, iniciarTarea, cancelarTarea} from "../api/apiClient";
import useAuthStore from "../store/authStore";
import { connectSocket, getSocket } from "../lib/socket";

// --- Componentes ---
import Avatar from "../components/Avatar";
import TaskBadge from "../components/tareas/TaskBadge"; 
import TaskSpecificDetails from "../components/tareas/TaskSpecificDetails"; 
import Boton from "../components/ui/Boton"; 

// --- Modales ---
import CompletarVerificarTareaModal from "../components/CompletarVerificarTareaModal";
import AsignarTrabajadoresModal from "../components/AsignarTrabajadoresModal"; 
import TareaItemsModal from "../components/GestionarItemsTareaModal"; 
import LinkVolver from "../components/ui/LinkVolver";

// --- Helpers de Formato ---
const fmtDT = (v) => (v ? new Date(v).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' }) : "—");
const fmtFechaHora = (v) => (v ? new Date(v).toLocaleString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : "—");

const formatQty = (val, unitName) => {
    const num = Number(val);
    if (isNaN(num)) return "0";
    const u = unitName?.toLowerCase() || "";
    const formatNumber = (value, maxDecimals = 2) =>
      new Intl.NumberFormat("es-EC", {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals,
      }).format(value);

    if (u === "unidad" || u === "unidades" || u === "u") {
        return `${formatNumber(Math.trunc(num), 0)} ${num === 1 ? 'unidad' : 'unidades'}`;
    }
    return `${formatNumber(num, 3)} ${unitName}`;
};

const nombreUsuario = (u) => {
  if (!u) return "Usuario";
  if (u.nombre) return u.nombre; // si backend manda "nombre"
  const full = [u.nombres, u.apellidos].filter(Boolean).join(" ").trim();
  return full || u.username || u.email || "Usuario";
};

const normalizarNovedad = (n) => {
  const usuarioRaw = n?.usuario || n?.Usuario || null;
  return {
    ...n,
    usuario: usuarioRaw
      ? {
          ...usuarioRaw,
          nombre: nombreUsuario(usuarioRaw),
        }
      : null,
  };
};


const CONTAINER_STYLES = {
  page: "mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-slate-50 min-h-screen",
  card: "space-y-6"
};


export default function DetalleTarea() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  usePageTitle(`Tarea #${id}`);
  const tareaId = Number(id);

  const { user } = useAuthStore();
  const role = (user?.role || "").toLowerCase();
  const isOwnerOrTech = ["propietario", "tecnico"].includes(role);
  const isWorker = role === "trabajador";

  const [loading, setLoading] = useState(true);
  const [tarea, setTarea] = useState(null);
  const [novedades, setNovedades] = useState([]);
  const [textoNovedad, setTextoNovedad] = useState("");

  const notify = useToast();

  
  const [modals, setModals] = useState({ items: false, asign: false, cosecha: false, action: false, actionKind: null });

  const toggleModal = (name, value = true, kind = null) => {
    setModals(prev => ({ ...prev, [name]: value, actionKind: kind || prev.actionKind }));
  };

  const cargarDetalle = async () => {
    try {
      const [resTarea, resNov] = await Promise.all([
        obtenerTarea(tareaId),
        listarNovedadesTarea(tareaId)
      ]);

      if (!resTarea) throw new Error("Tarea no encontrada");
      setTarea(resTarea.data || resTarea);
      setNovedades((resNov.data || []).map(normalizarNovedad));
      setLoading(false);
    } catch (e) {
      console.error(e);
      notify.error("Error cargando tarea");
      navigate(-1);
    }
  };

const handleCancelar = async () => {
    if (!window.confirm("⚠️ ¿Estás seguro de que deseas CANCELAR esta tarea? Esta acción no se puede deshacer.")) return;
    
    // Pedimos motivo simple
    const motivo = window.prompt("Por favor, ingresa el motivo de la cancelación:");
    if (motivo === null) return; // Usuario canceló el prompt

    try {
      await cancelarTarea(tareaId, { motivo: motivo || "Sin motivo" });
      notify.success("Tarea cancelada correctamente");
      cargarDetalle();
    } catch (e) {
      console.error(e);
      notify.error(e?.response?.data?.message || "Error al cancelar");
    }
  };

  // --- Lógica de Tiempo Real (Socket) ---
  useEffect(() => {
    setLoading(true);
    cargarDetalle();

    connectSocket();
    const socket = getSocket();
    socket.emit("join:tarea", tareaId);
    
    // Función centralizada de recarga
    const refresh = () => {
        console.log("🔄 Actualizando datos en tiempo real...");
        cargarDetalle();
    };

    const onNovedad = (payload) => {
        if(payload.novedad) {
            const novedad = normalizarNovedad(payload.novedad);
            setNovedades(prev => {
                if (prev.some(n => n.id === novedad.id)) return prev;
                return [novedad, ...prev];
            });
        }
        refresh(); // Refrescamos todo por si cambió el estado también
    };

    // Listeners
    socket.on("tarea:novedad", onNovedad);
    socket.on("tarea:estado", refresh);
    socket.on("tareas:update", refresh);      
    socket.on("tarea:actualizada", refresh);  
    socket.on("tarea:detalles", refresh);     
    socket.on("tarea:insumos", refresh);
    socket.on("tarea:asignaciones", refresh);

    return () => {
      socket.emit("leave:tarea", tareaId);
      socket.off("tarea:novedad", onNovedad);
      socket.off("tarea:estado", refresh);
      socket.off("tareas:update", refresh);
      socket.off("tarea:actualizada", refresh);
      socket.off("tarea:detalles", refresh);
      socket.off("tarea:insumos", refresh);
      socket.off("tarea:asignaciones", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  const handleIniciar = async () => {
    try {
      await iniciarTarea(tareaId);
      notify.success("Tarea iniciada 🚀");
      cargarDetalle();
    } catch (e) {
      notify.error(e?.response?.data?.message || "Error al iniciar");
    }
  };

const handleEnviarNovedad = async () => {
  if (!textoNovedad.trim()) return;

  const texto = textoNovedad.trim();

  // ✅ Optimistic: se ve de una, con el usuario logueado
  const temp = {
    id: `tmp-${Date.now()}`,
    texto,
    created_at: new Date().toISOString(),
    usuario: user ? { ...user, nombre: nombreUsuario(user) } : null,
  };

  setNovedades(prev => [temp, ...prev]);
  setTextoNovedad("");

  try {
    const res = await crearNovedadTarea(tareaId, { texto });

    // si backend devuelve la novedad real
    if (res?.data) {
      const real = normalizarNovedad({
        ...res.data,
        // ✅ si no viene usuario poblado, lo “pegamos” con el logueado
        usuario: res.data.usuario ?? (user ? { ...user } : null),
      });

      setNovedades((prev) => {
        const sinTemp = prev.filter((n) => n.id !== temp.id);
        const sinDuplicadoReal = sinTemp.filter((n) => n.id !== real.id);
        return [real, ...sinDuplicadoReal];
      });
    } else {
      // fallback
      await cargarDetalle();
    }

    notify.success("Comentario agregado");
  } catch {
    // revertir optimistic
    setNovedades(prev => prev.filter(n => n.id !== temp.id));
    setTextoNovedad(texto);
    notify.error("Error al enviar");
  }
};


  if (loading) return <div className="min-h-screen grid place-content-center text-slate-400 animate-pulse">Cargando...</div>;
  if (!tarea) return null;

  // Lógica de permisos
  const esAsignado = tarea.asignaciones?.some(a => Number(a.usuario?.id) === Number(user.id));
  const puedeIniciar = (isWorker && esAsignado) || isOwnerOrTech;
  const puedeCompletar = (isWorker && esAsignado) || isOwnerOrTech;
  const puedeGestionarRecursosPlanificados =
    isOwnerOrTech && !["Completada", "Verificada", "Cancelada"].includes(tarea.estado);

  // --- SUBCOMPONENTE: Panel de Acciones ---
// --- SUBCOMPONENTE: Panel de Acciones ---
  // --- SUBCOMPONENTE: Panel de Acciones ---
  const PanelAcciones = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit">
        <h4 className="text-xs font-bold text-slate-800 uppercase mb-4 tracking-wider">Acciones</h4>

        {/* CASO 1: TAREA VERIFICADA */}
        {tarea.estado === "Verificada" && (
            <div className="text-center p-6 bg-violet-50 border border-violet-100 rounded-xl">
                <ShieldCheck size={32} className="mx-auto text-violet-500 mb-2"/>
                <p className="font-bold text-violet-800">Tarea Verificada</p>
                <p className="text-xs text-violet-600 mt-1">El técnico ha validado esta labor.</p>
            </div>
        )}

        {/* CASO 2: TAREA CANCELADA */}
        {tarea.estado === "Cancelada" && (
            <div className="text-center p-6 bg-rose-50 border border-rose-100 rounded-xl">
                <XCircle size={32} className="mx-auto text-rose-500 mb-2"/>
                <p className="font-bold text-rose-800">Tarea Cancelada</p>
                <p className="text-xs text-rose-600 mt-1">Esta labor fue suspendida.</p>
                {/* Opcional: Mostrar motivo si viene en la data */}
            </div>
        )}

        {/* CASO 3: FLUJO ACTIVO */}
        {tarea.estado !== "Verificada" && tarea.estado !== "Cancelada" && (
            <div className="flex flex-col gap-3">
                
                {/* BOTÓN INICIAR */}
                {(tarea.estado === "Pendiente" || tarea.estado === "Asignada") && puedeIniciar && (
                    <Boton onClick={handleIniciar} className="w-full py-3 text-base shadow-md bg-amber-500 text-white hover:bg-amber-600 border-none">
                        <Play size={20} fill="currentColor" className="mr-2" /> 
                        {isOwnerOrTech ? "INICIAR JORNADA (SUPERVISOR)" : "INICIAR MI TAREA"}
                    </Boton>
                )}

                {/* BOTÓN COMPLETAR */}
                {tarea.estado === "En progreso" && puedeCompletar && (
                    <Boton onClick={() => toggleModal("action", true, "completar")} variante="primario" className="w-full py-3 text-base shadow-md">
                        <CheckCircle size={20} className="mr-2" /> 
                        {isOwnerOrTech ? "REGISTRAR AVANCE Y CERRAR" : "COMPLETAR TAREA"}
                    </Boton>
                )}

                {/* BOTÓN VERIFICAR (Solo Dueño/Técnico) */}
                {tarea.estado === "Completada" && isOwnerOrTech && (
                    <Boton onClick={() => toggleModal("action", true, "verificar")} className="w-full py-3 text-base shadow-md bg-violet-600 text-white hover:bg-violet-700 border-none">
                        <ShieldCheck size={20} className="mr-2" /> VERIFICAR TAREA
                    </Boton>
                )}

                {/* MENSAJE PARA TRABAJADOR ESPERANDO VERIFICACIÓN */}
                {tarea.estado === "Completada" && isWorker && (
                    <div className="text-center p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <Clock size={24} className="mx-auto text-amber-500 mb-2 animate-pulse"/>
                        <p className="font-bold text-amber-800 text-sm">Esperando verificación</p>
                        <p className="text-xs text-amber-600 mt-1">El técnico debe revisar tu trabajo.</p>
                    </div>
                )}
                
                
                {/* ✅ BOTÓN CANCELAR (Visible y Sólido) */}
                {isOwnerOrTech && (
                    <Boton 
                        onClick={handleCancelar} 
                        className="w-full py-3 mt-1 bg-rose-600 text-white hover:bg-rose-700 shadow-md border-none"
                    >
                        <XCircle size={18} className="mr-2" /> Cancelar Tarea
                    </Boton>
                )}
                
                {/* Fallback */}
                {!(puedeIniciar || puedeCompletar || (isOwnerOrTech && tarea.estado === "Completada") || (isWorker && tarea.estado === "Completada")) && !isOwnerOrTech && (
                    <div className="text-center text-sm text-slate-400 italic py-2">
                        Sin acciones pendientes.
                    </div>
                )}
                
            </div>
        )}
    </div>

  );

  return (
    <section className={CONTAINER_STYLES.page}>
      <div className={CONTAINER_STYLES.card}>
        
        {/* HEADER: Botón Regresar */}
        <div className="flex items-center justify-between">
          {/* <Boton variante="primario" onClick={() => navigate(location.state?.from || -1)}>
             <ArrowLeft size={16} className="mr-2"/> Regresar
          </Boton> */}
          <LinkVolver  label="Volver a tareas" onClick={() => navigate(location.state?.from || -1)} />
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-6">
            
            {/* === COLUMNA IZQUIERDA (Info + Detalles + Insumos + Chat) === */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. INFO CARD (2 Columnas) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      ID: #{tarea.id}
                    </span>
                    <TaskBadge status={tarea.estado} />
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 border-l pl-3 border-slate-200">
                      <Tag size={12}/> {(tarea.tipo_codigo || tarea.TipoActividad?.codigo || "N/A").toUpperCase()}
                    </span>
                  </div>

                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">
                    {tarea.titulo || tarea.tipo}
                  </h1>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      {/* Columna Izquierda: Ubicación y Tiempo */}
                      <div className="space-y-4">
                          <div className="flex items-start gap-3">
                              <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Tractor size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Finca</p>
                                  <p className="font-bold text-slate-800 text-sm">{tarea.finca_nombre || "No definida"}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><MapPin size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lote / Ubicación</p>
                                  <p className="font-medium text-slate-800 text-sm">{tarea.Lote?.nombre || tarea.lote}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Calendar size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha Programada</p>
                                  <p className="font-medium text-slate-800 text-sm capitalize">
                                      {fmtFechaHora(tarea.fecha_programada)}
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* Columna Derecha: Contexto Agronómico */}
                      <div className="space-y-4">
                          <div className="flex items-start gap-3">
                              <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Sprout size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cosecha</p>
                                  <p className="font-medium text-slate-800 text-sm">{tarea.Cosecha?.nombre || "N/A"}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="bg-sky-50 p-2 rounded-lg text-sky-600"><Clock size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Etapa / Periodo</p>
                                  <p className="font-medium text-slate-800 text-sm">{tarea.PeriodoCosecha?.nombre || "General"}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="bg-slate-50 p-2 rounded-lg text-slate-400"><User size={18}/></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Creado por</p>
                                  <p className="font-medium text-slate-800 text-sm">{tarea.creador?.nombre}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  {(tarea.metodologia || tarea.descripcion) && (
                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-600 text-sm leading-relaxed">
                       <span className="block font-bold text-slate-700 mb-1 text-xs uppercase">Metodología:</span>
                       {tarea.metodologia || tarea.descripcion}
                    </div>
                  )}
              </div>

              {/* ✅ MÓVIL: Panel de Acciones (Entre Info y Detalles) */}
              <div className="block lg:hidden">
                 <PanelAcciones />
              </div>
                
              {/* 2. DETALLES DE EJECUCIÓN */}
              {/* 2. DETALLES DE EJECUCIÓN */}
<section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">

  {/* HEADER tipo MODAL */}
  <div className="px-6 pt-6 pb-4 border-b border-slate-100">
    <div className="flex items-center gap-3">
      <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
        <CheckCircle size={18} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">
          Detalles de Ejecución
        </h3>
        <p className="text-xs text-slate-500">
          Registro real de avance, controles y validaciones en campo
        </p>
      </div>
    </div>

    {/* Banda informativa (igual al modal) */}
    {isOwnerOrTech && (
      <div className="mt-4 flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold">
        <ShieldCheck size={14} />
        MODO SUPERVISOR
      </div>
    )}
  </div>

  {/* CONTENIDO con padding REAL */}
  <div className="px-6 py-6">
    {/* Metadatos rápidos */}
    <div className="flex flex-wrap gap-2 mb-6">
      <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-xs flex items-center gap-2">
        <span className="text-slate-500 font-bold">INICIO</span>
        <span className="font-mono text-slate-700">
          {tarea.fecha_inicio_real
            ? new Date(tarea.fecha_inicio_real).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </span>
      </div>

      <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-xs flex items-center gap-2">
        <span className="text-slate-500 font-bold">FIN</span>
        <span className="font-mono text-slate-700">
          {tarea.fecha_fin_real
            ? new Date(tarea.fecha_fin_real).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </span>
      </div>

      <div className="bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 text-xs text-emerald-800 font-bold flex items-center gap-1">
        <Clock size={12} /> {tarea.duracion_real_min || 0} min
      </div>
    </div>

    {/* 🔹 CONTENIDO REAL */}
    <TaskSpecificDetails tarea={tarea} onRefresh={cargarDetalle} />
  </div>
</section>


              {/* 3. INSUMOS */}
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800">Insumos y Recursos</h3>
                      {puedeGestionarRecursosPlanificados && (
                          <Boton variante="secundario" onClick={() => toggleModal("items", true)} className="!px-3 !py-1.5 !text-xs !bg-emerald-50 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-100 border">
                              Gestionar Recursos
                          </Boton>
                      )}
                  </div>
                  {(!tarea.items || tarea.items.length === 0) ? (
                      <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-sm text-slate-400">No se registraron insumos para esta tarea.</p>
                      </div>
                  ) : (
                      <div className="overflow-hidden rounded-xl border border-slate-200">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                                  <tr>
                                      <th className="px-4 py-3">Ítem</th>
                                      <th className="px-4 py-3 text-right">Plan</th>
                                      <th className="px-4 py-3 text-right">Real</th>
                                      <th className="px-4 py-3 font-bold">Lote</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {tarea.items.map((it) => (
                                      <tr key={it.id} className="hover:bg-slate-50/50">
                                          <td className="px-4 py-3">
                                              <div className="font-medium text-slate-800">{it.nombre}</div>
                                              <div className="text-[10px] text-slate-400 uppercase">{it.categoria}</div>
                                          </td>
                                          <td className="px-4 py-3 text-right text-slate-500 font-mono">
                                              {formatQty(it.cantidad_planificada, it.unidad)}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                              {(() => {
                                                  const plan = Number(it.cantidad_planificada) || 0;
                                                  const real = Number(it.cantidad_real) || 0;
                                                  const isLow = real < plan; 
                                                  const isZero = real === 0;
                                                  let colorClass = "text-slate-800"; 
                                                  if (isZero && tarea.estado !== 'Completada' && tarea.estado !== 'Verificada') colorClass = "text-slate-300";
                                                  else if (isLow) colorClass = "text-rose-600 font-bold";
                                                  else colorClass = "text-emerald-600 font-bold";

                                                  return (
                                                      <span className={`font-mono ${colorClass}`}>
                                                          {formatQty(it.cantidad_real, it.unidad)}
                                                          {isLow && !isZero && <span className="ml-1 text-[10px]">▼</span>}
                                                      </span>
                                                  );
                                              })()}
                                          </td>
                                          <td className="px-4 py-3">
                                              {it.lote_insumo_manual ? (
                                                  <span className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-[11px] px-2 py-0.5 rounded font-mono">{it.lote_insumo_manual}</span>
                                              ) : <span className="text-slate-300 text-xs">-</span>}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </section>

              {/* 4. COMENTARIOS */}
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Comentarios y Novedades</h3>
                  <div className="space-y-6 mb-8">
                      {novedades.length === 0 && (
                          <p className="text-center text-slate-400 text-sm italic py-4">No hay comentarios aún.</p>
                      )}
                      {novedades.map((n) => (
                          <div key={n.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
<Avatar user={n.usuario} name={nombreUsuario(n.usuario)} size={40} className="shrink-0 mt-1 shadow-xs border border-white" />                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
<span className="text-sm font-bold text-slate-900">{nombreUsuario(n.usuario)}</span>                                      <span className="text-slate-300 text-xs">|</span>
                                      <span className="text-xs text-slate-400">{fmtDT(n.created_at)}</span>
                                  </div>
                                  <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl rounded-tl-none inline-block">
                                      {n.texto}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                      <div className="flex gap-3">
                          <textarea 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm p-3 min-h-[50px] resize-none transition-all"
                              placeholder="Escribe una novedad..."
                              value={textoNovedad}
                              onChange={(e) => setTextoNovedad(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleEnviarNovedad())}
                          />
                          <Boton 
    onClick={handleEnviarNovedad} 
    // Agregamos clases para forzar el verde esmeralda
    className="h-fit self-end shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-100" 
    disabled={!textoNovedad.trim()}
>
    Enviar
</Boton>
                      </div>
                  </div>
              </section>
            </div>

            {/* === COLUMNA DERECHA (Panel Lateral) === */}
            <div className="space-y-6 lg:self-start">
                 {/* 1. Panel de Acciones (Solo Desktop) */}
                 <div className="hidden lg:block  top-6 self-start">
  <PanelAcciones />
</div>


                 {/* EQUIPO ASIGNADO */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Equipo</h4>
                        {isOwnerOrTech && tarea.estado !== "Verificada" && tarea.estado !== "Cancelada" && (
                            <button onClick={() => toggleModal("asign", true)} className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors">
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-3">
                        {tarea.asignaciones?.length > 0 ? (
                            tarea.asignaciones.map(a => {
                                // Construimos el texto del rol
                                const tipo = a.usuario?.tipo || "";
                                // Asumimos que si tiene tipo es Trabajador, sino usamos un genérico o el rol si viniera
                                const descripcionRol = tipo ? `Trabajador ${tipo}` : "Técnico / Supervisor";

                                return (
                                    <div key={a.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                        <Avatar user={a.usuario} size={36} className="bg-slate-100 text-slate-600 border border-slate-200" />
                                        <div className="flex-1">
                                            <div className="flex flex-col">
                                                <span className="text-s font-bold text-slate-800">{a.usuario?.nombre}</span>
                                                {/* ✅ ROL VISIBLE */}
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                    {descripcionRol}
                                                </span>
                                            {a.rol_en_tarea && (
                                                <div className="mt-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded w-fit">
                                                    {a.rol_en_tarea}
                                                </div>
                                            )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <p className="text-sm text-slate-400 italic">Sin asignaciones.</p>}
                    </div>
                </div>

                {/* 3. BITÁCORA */}
<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
  <h4 className="text-lg font-bold text-slate-800 mb-6">Bitácora</h4>
  <div className="space-y-0">
    {tarea.estados?.slice().reverse().map((e, idx) => {
      const fechaObj = new Date(e.fecha);
      
      // ✅ Lógica de colores para el texto del estado
      let colorEstado = "text-slate-800";
      if (e.estado === "Completada") colorEstado = "text-emerald-700";
      if (e.estado === "Verificada") colorEstado = "text-violet-700";
      if (e.estado === "En progreso") colorEstado = "text-blue-700";
      if (e.estado === "Cancelada") colorEstado = "text-rose-700";
      if (e.estado === "Asignada") colorEstado = "text-amber-700";

      return (
        <div key={idx} className="relative pl-10 pb-6 last:pb-0">
          {idx !== tarea.estados.length - 1 && <div className="absolute left-[1.1rem] top-3 bottom-0 w-px bg-slate-200" />}
          <div className="absolute left-0 top-0">
            <Avatar user={e.usuario} size={36} className="border-2 border-white shadow-sm" />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <div>
              <span className="block text-sm font-bold text-slate-900">{e.usuario?.nombre}</span>
              <span className="block text-xs text-slate-400">{fechaObj.toLocaleDateString()} {fechaObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="text-sm text-slate-600 mt-1">
               Cambió estado a <span className={`font-bold ${colorEstado} uppercase tracking-wide text-xs`}>{e.estado}</span>
            </div>
            {e.comentario && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 italic">
                "{e.comentario}"
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
</div>
            </div>

        </div>

        {/* --- MODALES --- */}
        <CompletarVerificarTareaModal open={modals.action} modo={modals.actionKind} tarea={tarea} onClose={() => toggleModal("action", false)} onRefrescar={cargarDetalle} />
        <AsignarTrabajadoresModal open={modals.asign} tareaId={tareaId} onClose={() => toggleModal("asign", false)} onSaved={cargarDetalle} />
        <TareaItemsModal open={modals.items} tareaId={tareaId} onClose={() => toggleModal("items", false)} onSaved={cargarDetalle} />

      </div>
    </section>
  );
}
