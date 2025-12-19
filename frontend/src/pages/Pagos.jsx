import { useMemo, useState } from "react";
import {
  DollarSign,
  Calendar,
  FileCheck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  History,
  Filter,
  Download,
  Eye,
  Search,
  RotateCcw,
  UserCheck,
  ArrowRight // Icono para el botón de ir al borrador
} from "lucide-react";
import usePagos from "../hooks/usePagos";
import useAuthStore from "../store/authStore";

// UI Components
import { Tabla, TablaCabecera, TablaHead, TablaCuerpo, TablaFila, TablaCelda } from "../components/ui/Tabla";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import TarjetaDato from "../components/ui/TarjetaDato";
import Input from "../components/ui/input";
import Paginador from "../components/ui/Paginador"; 

// Pagos Components
import FilaPago from "../components/pagos/FilaPago";
import ModalDetallePago from "../components/pagos/ModalDetallePago";
import ModalSemanaHistorial from "../components/pagos/ModalSemanaHistorial";

function fmtFechaES(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default function Pagos() {
  const { accessToken } = useAuthStore(); 
  const { user } = useAuthStore(); 
  const esPropietario = user?.role?.nombre === "Propietario";

  // --- Estados Locales ---
  const [tab, setTab] = useState("nomina"); 
  const [mostrarExcluidos, setMostrarExcluidos] = useState(true);
  
  // Paginación Tab 2
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 20;

  // Modales
  const [modalSemana, setModalSemana] = useState({ open: false, nominaId: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleActivo, setDetalleActivo] = useState(null);

  // Filtros Tab 2
  const [fHist, setFHist] = useState({ semana_iso: "" });

  const {
    semanaIso,
    setSemanaIso,
    nomina,
    borradores,
    loadingNomina,
    procesando,
    consolidar,
    guardarBorradorBulk,
    toggleExcluir,
    aprobar,
    eliminar,
    generarReciboPago,
    pending,
    pendientesCount,
    setPendiente,
    cargarDetalleTareas,
    historial,
    loadingHistorial,
    cargarHistorial,
    recargarNomina,
    cargarNomina // Asegúrate de exponer esto en usePagos si no lo está
  } = usePagos();

  const esBorrador = nomina?.estado === "Borrador";

  // --- Handlers ---

  const abrirModal = (detalleId) => {
    setDetalleActivo(detalleId);
    setModalOpen(true);
  };

  const onToggleExcluidos = () => {
    const next = !mostrarExcluidos;
    setMostrarExcluidos(next);
    recargarNomina(next);
  };

  // Función para ir al borrador desde el banner
  const irABorrador = (semanaBorrador) => {
      setSemanaIso(semanaBorrador);
      // Forzamos la carga de esa semana (asumiendo que recargarNomina usa el estado o acepta parámetro)
      // Si recargarNomina usa el estado 'semanaIso', podría necesitar un useEffect o pasar el parametro directo
      // Aquí asumimos que al cambiar setSemanaIso, el usuario luego puede dar click o se dispara un efecto.
      // O mejor, llamamos directamente a la función de carga si el hook lo permite.
      // En tu hook original `recargarNomina` llama a `cargarNomina(semanaIso)`.
      // Como el estado `semanaIso` no se actualiza inmediatamente en este ciclo, pasamos el valor directo.
      
      // NOTA: Si tu hook tiene un useEffect que escucha `semanaIso`, esto se hará solo.
      // Si no, forzamos la carga:
      // cargarNomina(semanaBorrador, true); 
  };

  // ✅ Descarga PDF (Botón Rojo)
  const descargarReporteSemana = async (nominaId) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
      
      const res = await fetch(`${baseUrl}/pagos/semana/${nominaId}/reporte`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        }
      });

      if (!res.ok) throw new Error("No se pudo generar el PDF");

      const json = await res.json(); 
      if (!json?.url) throw new Error("Respuesta inválida: falta url");

      window.open(`${baseUrl}${json.url}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("No se pudo descargar el informe semanal.");
    }
  };

  const aplicarFiltrosHistorial = async () => {
    setPaginaActual(1);
    await cargarHistorial({ semana_iso: fHist.semana_iso });
  };

  const limpiarFiltrosHistorial = async () => {
    setFHist({ semana_iso: "" });
    setPaginaActual(1);
    await cargarHistorial({});
  };

  // --- Lógica de Paginación ---
  const totalRegistros = historial.length;
  const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA);
  const historialPaginado = historial.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA
  );

  // --- Memos UI ---
  const headerSemanaLabel = useMemo(() => {
    if (!nomina) return semanaIso;
    return `${nomina.semana_iso} — ${fmtFechaES(nomina.fecha_inicio)} al ${fmtFechaES(nomina.fecha_fin)}`;
  }, [nomina, semanaIso]);

  const pagoProgramadoLabel = useMemo(() => {
    if (!nomina?.pago_programado) return "-";
    return `martes ${fmtFechaES(nomina.pago_programado)}`;
  }, [nomina?.pago_programado]);

  const totales = nomina?.totales || {};
  const totalNomina = Number(totales.total_nomina || 0);
  const totalTareas = Number(totales.tareas_completadas || 0);

  // Componente interno para Card Manual (Tab 1)
  const CardInfo = ({ titulo, valor, color, icono: Icono, className = "" }) => {
      const colors = {
          verde: "bg-emerald-50 border-emerald-100 text-emerald-900",
          azul: "bg-sky-50 border-sky-100 text-sky-900",
          violeta: "bg-violet-50 border-violet-100 text-violet-900",
          ambar: "bg-amber-50 border-amber-100 text-amber-900",
          gris: "bg-slate-50 border-slate-100 text-slate-800"
      };
      const iconColors = {
          verde: "text-emerald-600",
          azul: "text-sky-600",
          violeta: "text-violet-600",
          ambar: "text-amber-600",
          gris: "text-slate-400"
      };

      return (
          <div className={`p-4 rounded-xl border flex items-center justify-between ${colors[color] || colors.gris}`}>
              <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{titulo}</p>
                  <p className={`text-2xl font-black ${className}`}>{valor}</p> 
              </div>
              <div className={`p-2 bg-white rounded-lg shadow-sm ${iconColors[color] || iconColors.gris}`}>
                  <Icono size={20} />
              </div>
          </div>
      );
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        
        {/* === CONTENEDOR PRINCIPAL BLANCO === */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
            
            {/* CABECERA (TÍTULO + SWITCH) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {tab === "nomina" ? "Gestión de Nómina" : "Pagos Realizados"}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {tab === "nomina" 
                            ? "Consolidación semanal basada en tareas completadas." 
                            : "Historial completo de pagos aprobados y borradores."}
                    </p>
                </div>

                {/* BOTÓN CONSOLIDAR (TAB 1) */}
                {tab === "nomina" && (
                    <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 px-3 uppercase tracking-wide">SEMANA:</span>
                        <input
                            type="week"
                            value={semanaIso}
                            onChange={(e) => setSemanaIso(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-900 focus:ring-0 outline-none p-0 h-auto w-36 mr-2"
                        />
                        <Boton
                            onClick={consolidar}
                            disabled={loadingNomina || (nomina && !esBorrador)}
                            cargando={procesando && !nomina}
                            variante="primario"
                            className="h-8 text-xs font-bold px-4 shadow-sm"
                        >
                            {nomina ? "Recalcular" : "Consolidar"}
                        </Boton>
                    </div>
                )}
            </div>

            {/* Switch de Tabs */}
            <div className="flex border-b border-slate-100 pb-1">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setTab("nomina")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === "nomina" 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                    >
                        Gestión de nómina
                    </button>
                    <button
                        onClick={() => {
                            setTab("historial");
                            if (historial.length === 0) cargarHistorial({});
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === "historial" 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                    >
                        Pagos realizados
                    </button>
                </div>
            </div>

            {/* ==========================
                CONTENIDO TAB 1: NOMINA
               ========================== */}
            {tab === "nomina" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Info Semana */}
                {nomina && (
                    <div className="flex flex-col gap-1 pb-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Semana Seleccionada</div>
                        <div className="text-lg font-bold text-slate-900">{headerSemanaLabel}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            <span>Pago programado:</span>
                            <span className="font-mono text-slate-700 font-medium">{pagoProgramadoLabel}</span>
                        </div>
                    </div>
                )}

                {/* Banner Borradores (CON BOTON DE ACCION) */}
                {borradores.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-full text-amber-700">
                            <AlertCircle size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900">
                              Tienes {borradores.length} {borradores.length === 1 ? "borrador pendiente" : "borradores pendientes"}
                            </p>
                            <p className="text-xs text-amber-700">
                              Semanas: {borradores.map((b) => b.semana_iso).join(", ")}
                            </p>
                          </div>
                      </div>
                      
                      {/* Botón para ir al primer borrador */}
                      <Boton 
                        variante="fantasma" 
                        className="text-xs text-amber-800 border-amber-300 bg-amber-100/50 hover:bg-amber-100 h-8"
                        onClick={() => irABorrador(borradores[0].semana_iso)}
                      >
                          Ir al borrador <ArrowRight size={14} className="ml-1"/>
                      </Boton>
                  </div>
                )}

                {/* Resumen Cards (TAB 1) */}
                {nomina && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <CardInfo
                      titulo="Estado"
                      valor={nomina.estado}
                      color={esBorrador ? "ambar" : "verde"}
                      icono={esBorrador ? FileCheck : CheckCircle2}
                    />
                    
                    {/* CARD APROBADOR */}
                    <CardInfo
                      titulo="Aprobado por"
                      valor={nomina.aprobado_por_nombre || "Pendiente"}
                      color={esBorrador ? "gris" : "verde"}
                      icono={UserCheck}
                      // Si el nombre es muy largo, bajamos la fuente
                      className={nomina.aprobado_por_nombre?.length > 15 ? "!text-lg" : ""}
                    />

                    <CardInfo
                      titulo="Trabajadores"
                      valor={totales.trabajadores_incluidos || 0}
                      color="azul"
                      icono={Calendar}
                    />
                    <CardInfo
                      titulo="Tareas"
                      valor={totalTareas}
                      color="violeta"
                      icono={CheckCircle2}
                    />
                    <CardInfo
                      titulo="Total Nómina"
                      valor={`$${totalNomina.toFixed(2)}`}
                      color="verde"
                      icono={DollarSign}
                    />
                  </div>
                )}

                {/* Tabla Nómina */}
                {nomina ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Consolidación por trabajador</h3>

                      <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 select-none cursor-pointer hover:text-slate-900">
                            <input
                              type="checkbox"
                              checked={mostrarExcluidos}
                              onChange={onToggleExcluidos}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Mostrar excluidos
                          </label>

                          {esBorrador && (
                            <div className="flex items-center gap-2">
                                <Boton variante="fantasma" onClick={guardarBorradorBulk} disabled={procesando} className="h-8 text-xs bg-white border border-slate-200 shadow-sm">
                                    <FileCheck size={14} className="mr-1.5"/> Guardar borrador
                                </Boton>
                                
                                {esPropietario && (
                                    <Boton variante="primario" onClick={aprobar} cargando={procesando} className="h-8 text-xs shadow-sm">
                                        Aprobar nómina
                                    </Boton>
                                )}
                                
                                <Boton variante="peligro" onClick={() => eliminar(nomina.id)} disabled={procesando} className="h-8 w-8 !p-0 flex items-center justify-center" title="Descartar borrador">
                                    <Trash2 size={14}/>
                                </Boton>
                            </div>
                          )}
                          
                          {/* BOTON REPORTE ROJO EN TAB 1 (Si está aprobada) */}
                          {!esBorrador && (
                              <Boton 
                                  variante="fantasma" 
                                  className="h-8 px-3 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 shadow-sm"
                                  onClick={() => descargarReporteSemana(nomina.id)}
                              >
                                  <Download size={14} className="mr-1.5" /> Reporte
                              </Boton>
                          )}
                      </div>
                    </div>

                    <Tabla>
                      <TablaCabecera>
                        <TablaHead>Trabajador</TablaHead>
                        <TablaHead>Cargo</TablaHead>
                        <TablaHead align="right">Días</TablaHead>
                        <TablaHead align="right">#Tareas</TablaHead>
                        <TablaHead align="right">Salario base</TablaHead>
                        <TablaHead align="right">Ajustes</TablaHead>
                        <TablaHead>Motivo</TablaHead>
                        <TablaHead align="right">Total</TablaHead>
                        <TablaHead>Método</TablaHead>
                        <TablaHead align="right">Acciones</TablaHead>
                      </TablaCabecera>

                      <TablaCuerpo>
                        {(nomina.detalles || [])
                          .filter(Boolean)
                          .filter(d => d && d.id)
                          .map(det => (
                            <FilaPago
                              key={det.id}
                              detalle={det}
                              esBorrador={esBorrador}
                              pendientes={pending}
                              onSetPendiente={setPendiente}
                              onToggleExcluir={toggleExcluir}
                              onAbrirModal={abrirModal}
                              onRecibo={generarReciboPago}
                            />
                          ))}
                      </TablaCuerpo>
                    </Tabla>
                  </div>
                ) : (
                  !loadingNomina && (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <div className="mx-auto w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm border border-slate-100">
                        <Calendar size={28} />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">Semana sin consolidar</h3>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                        No hay nómina generada para la semana <strong>{semanaIso}</strong>.
                        Selecciona "Consolidar" arriba a la derecha.
                      </p>
                    </div>
                  )
                )}

                {loadingNomina && (
                  <div className="py-20 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Cargando datos de la nómina...</p>
                  </div>
                )}

                {/* Modal Detalle */}
                <ModalDetallePago
                  open={modalOpen}
                  onClose={() => setModalOpen(false)}
                  nominaId={nomina?.id}
                  detalleId={detalleActivo}
                  cargarDetalleTareas={cargarDetalleTareas}
                  onSetPendiente={setPendiente}
                  pendientes={pending}
                />
              </div>
            )}

            {/* ==========================
                CONTENIDO TAB 2: HISTORIAL
               ========================== */}
            {tab === "historial" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Filtros Compactos */}
                <div className="flex flex-col gap-3 pb-2">
                    <div className="flex items-center gap-2 text-slate-800 mb-1">
                        <Filter size={18} className="text-slate-400" />
                        <h3 className="font-bold text-sm uppercase tracking-wide">Filtros de búsqueda</h3>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input 
                                type="week"
                                placeholder="Ej: 2025-W01"
                                value={fHist.semana_iso}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFHist({ semana_iso: val });
                                    setPaginaActual(1);
                                    cargarHistorial({ semana_iso: val });
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                            />
                        </div>
                        
                        <Boton 
                            variante="fantasma" 
                            onClick={limpiarFiltrosHistorial} 
                            className="h-10 px-4 text-slate-500 border border-slate-200 bg-white hover:bg-slate-50" 
                            title="Limpiar filtros"
                        >
                            Limpiar filtros
                        </Boton>
                    </div>
                </div>

                {/* Tabla Historial */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Listado de Pagos</h3>
                    <Badge color="gris">{totalRegistros} registros</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Semana</th>
                                <th className="px-6 py-4 text-center">Trabajadores</th>
                                <th className="px-6 py-4 text-center">Tareas</th>
                                <th className="px-6 py-4 text-right">Total Nómina</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4">Aprobado por</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {historialPaginado.map((h) => (
                                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                    {/* Semana */}
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-base">{h.semana_iso}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {fmtFechaES(h.fecha_inicio)} al {fmtFechaES(h.fecha_fin)}
                                        </div>
                                    </td>

                                    {/* Métricas */}
                                    <td className="px-6 py-4 text-center font-medium text-slate-700">{h.trabajadores}</td>
                                    <td className="px-6 py-4 text-center font-medium text-slate-700">{h.tareas}</td>
                                    
                                    {/* Total */}
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-emerald-600 text-base">
                                            ${Number(h.total_nomina || 0).toFixed(2)}
                                        </span>
                                    </td>

                                    {/* Estado */}
                                    <td className="px-6 py-4 text-center">
                                        <Badge 
                                            color={h.estado === "Aprobada" ? "verde" : "ambar"}
                                            className={h.estado === "Aprobada" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}
                                        >
                                            {h.estado}
                                        </Badge>
                                    </td>

                                    {/* Aprobador */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-medium ${h.aprobado_por_nombre === 'Pendiente' ? 'text-slate-400' : 'text-slate-900'}`}>
                                                {h.aprobado_por_nombre}
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                                                {h.aprobado_por_nombre === 'Pendiente' ? "-" : "PROPIETARIO"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Boton 
                                                variante="fantasma" 
                                                className="!px-3 !py-1.5 text-xs border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 hover:border-slate-300"
                                                onClick={() => setModalSemana({ open: true, nominaId: h.id })}
                                            >
                                                <Eye size={14} className="mr-1.5" /> Ver
                                            </Boton>
                                            
                                            {/* BOTÓN REPORTE ROJO */}
                                            <Boton 
                                                variante="fantasma" 
                                                className="!px-3 !py-1.5 text-xs border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                                onClick={() => descargarReporteSemana(h.id)}
                                            >
                                                <Download size={14} className="mr-1.5" /> Reporte
                                            </Boton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  <Paginador 
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    onCambiarPagina={setPaginaActual}
                    totalRegistros={totalRegistros}
                    className="border-t border-slate-100 bg-white"
                  />

                  {loadingHistorial && (
                    <div className="py-10 text-center text-slate-400 animate-pulse">Cargando historial…</div>
                  )}
                  {!loadingHistorial && historial.length === 0 && (
                    <div className="py-16 text-center text-slate-500">
                        <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Search size={24} className="text-slate-300"/>
                        </div>
                        <p>No se encontraron resultados.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {modalSemana.open && (
        <ModalSemanaHistorial
            open={modalSemana.open}
            nominaId={modalSemana.nominaId}
            onClose={() => setModalSemana({ open: false, nominaId: null })}
        />
      )}

    </section>
  );
}