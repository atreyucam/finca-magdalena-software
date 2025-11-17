// src/Tareas.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
  listarTareas,
  listarLotes,
  listarTiposActividad,
  resumenTareas,
} from "../api/apiClient";
import CrearTareaModal from "../components/CrearTareaModal";

export default function Tareas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tareas, setTareas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);

  const [filtros, setFiltros] = useState(() => {
  // Filtros base por defecto
  const base = {
    lote_id: "",
    tipo_codigo: "",
    estado: "",
    texto: "",
    // 👇 Vista por defecto: HOY + ATRASADAS
    fecha_rango: "hoy_atrasadas",
    fecha_desde: "",
    fecha_hasta: "",
  };

  if (typeof window === "undefined") return base;

  const stored = localStorage.getItem("tareasFiltros");
  if (!stored) return base;

  try {
    const parsed = JSON.parse(stored);
    return {...base, ...parsed };
  } catch {
    return base;
  }
});



  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

// Vista: lista o tablero (persistida en localStorage)
const [vista, setVista] = useState(() => {
  if (typeof window === "undefined") return "lista";
  return localStorage.getItem("tareasVista") || "lista";
});


  // Paginación (solo para vista lista)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Resumen global (total, porEstado, porGrupo)
  const [resumen, setResumen] = useState(null);

  // ---------- helpers UI ----------
  const badgeByEstado = (estado) => {
    switch (estado) {
      case "Pendiente":
        return "bg-amber-100 text-amber-700";
      case "Asignada":
        return "bg-sky-100 text-sky-700";
      case "En progreso":
        return "bg-indigo-100 text-indigo-700";
      case "Completada":
        return "bg-emerald-100 text-emerald-700";
      case "Verificada":
        return "bg-violet-100 text-violet-700";
      case "Cancelada":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";

  const btnGhost =
    "rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

  const cardBase =
    "rounded-2xl border border-slate-200 p-4 sm:p-5 cursor-pointer transition-all";

  // Orden de estados para el listado
  const ordenEstado = {
    Cancelada: 1,
    Pendiente: 2,
    Asignada: 3,
    "En progreso": 4,
    Completada: 5,
    Verificada: 6,
  };

  const ordenarTareasPorEstado = (arr) => {
    return [...arr].sort((a, b) => {
      const oa = ordenEstado[a.estado] ?? 99;
      const ob = ordenEstado[b.estado] ?? 99;
      if (oa !== ob) return oa - ob;

      // desempate por fecha programada (más próxima primero)
      const da = a.fecha_programada
        ? new Date(a.fecha_programada).getTime()
        : 0;
      const db = b.fecha_programada
        ? new Date(b.fecha_programada).getTime()
        : 0;
      return da - db;
    });
  };

  // ---------- llamadas a API ----------
  const fetchTareas = async () => {
  try {
    setLoading(true);

    const { estado, ...rest } = filtros;

    // Solo mandamos al backend los filtros que sabemos que soporta (por ahora, lote_id).
    const q = Object.fromEntries(
      Object.entries(rest).filter(
        ([key, v]) => key !== "tipo_codigo" && v !== ""
      )
    );

    const res = await listarTareas(q);
    const tareasData = res.data?.data || [];

    // --- Filtros en frontend (lote y tipo) ---
    let filtradas = tareasData;

    // Filtro por lote (usamos String() para evitar problemas número/string)
    if (filtros.lote_id) {
      filtradas = filtradas.filter(
        (t) => String(t.lote_id) === String(filtros.lote_id)
      );
    }

    // Filtro por tipo de actividad usando tipo_codigo
    if (filtros.tipo_codigo) {
      filtradas = filtradas.filter(
        (t) => t.tipo_codigo === filtros.tipo_codigo
      );
    }

    // --- Filtro por grupo de estado (Pendientes, En progreso, etc.) ---
    switch (estado) {
      case "Pendientes": // Pendiente + Asignada
        filtradas = filtradas.filter((t) =>
          ["Pendiente", "Asignada"].includes(t.estado)
        );
        break;
      case "En progreso":
        filtradas = filtradas.filter(
          (t) => t.estado === "En progreso"
        );
        break;
      case "Completadas":
        filtradas = filtradas.filter(
          (t) => t.estado === "Completada"
        );
        break;
      case "Verificadas":
        filtradas = filtradas.filter(
          (t) => t.estado === "Verificada"
        );
        break;
      case "Canceladas":
        filtradas = filtradas.filter(
          (t) => t.estado === "Cancelada"
        );
        break;
      default:
        // sin filtro de estado extra
        break;
    }

    // Filtro por rango de fechas (sobre fecha_programada)
// Filtro por rango de fechas (sobre fecha_programada)
if (filtros.fecha_rango) {
  let desde = null;
  let hasta = null;

  // Helper: inicio y fin de hoy
  const hoy = new Date();
  const inicioHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    0, 0, 0, 0
  );
  const finHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    23, 59, 59, 999
  );

  switch (filtros.fecha_rango) {
    case "hoy_atrasadas":
      // Desde hace 30 días hasta hoy (incluye atrasadas)
      desde = new Date(inicioHoy);
      desde.setDate(desde.getDate() - 30); // puedes ajustar este 30 si quieres
      hasta = finHoy;
      break;

    case "proximos_7":
      // Desde hoy hasta dentro de 7 días
      desde = inicioHoy;
      hasta = new Date(finHoy);
      hasta.setDate(hasta.getDate() + 7);
      break;

    case "ultimos_7":
      hasta = finHoy;
      desde = new Date(inicioHoy);
      desde.setDate(desde.getDate() - 7);
      break;

    case "ultimos_14":
      hasta = finHoy;
      desde = new Date(inicioHoy);
      desde.setDate(desde.getDate() - 14);
      break;

    case "ultimos_30":
      hasta = finHoy;
      desde = new Date(inicioHoy);
      desde.setDate(desde.getDate() - 30);
      break;

    case "personalizado":
      if (filtros.fecha_desde) {
        const d = new Date(filtros.fecha_desde);
        desde = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      }
      if (filtros.fecha_hasta) {
        const h = new Date(filtros.fecha_hasta);
        hasta = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59, 999);
      }
      break;

    default:
      break;
  }

  if (desde || hasta) {
    filtradas = filtradas.filter((t) => {
      if (!t.fecha_programada) return false;
      const f = new Date(t.fecha_programada);
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    });
  }
}



    const ordenadas = ordenarTareasPorEstado(filtradas);

    setTareas(ordenadas);
    setError(null);
  } catch (err) {
    console.error("Error cargando tareas:", err);
    setError("No se pudieron cargar las tareas");
  } finally {
    setLoading(false);
  }
};


  const fetchResumen = async () => {
    try {
      const res = await resumenTareas();
      setResumen(res.data || null);
    } catch (err) {
      console.error("Error cargando resumen de tareas:", err);
    }
  };

  const fetchFiltrosData = async () => {
    try {
      const lotesRes = await listarLotes();
      setLotes(lotesRes.data || []);

      const tiposRes = await listarTiposActividad();
      setTiposActividad(tiposRes.data || []);
    } catch (err) {
      console.error("Error cargando lotes/tipos de actividad:", err);
    }
  };
  useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  // ---------- efectos ----------
  useEffect(() => {
    fetchFiltrosData();
    fetchTareas();
    fetchResumen();

    const socket = io(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
      {
        withCredentials: false,
      }
    );

    socket.on("tareas:update", () => {
      console.log("Evento tareas:update recibido, refrescando.");
      fetchTareas();
      fetchResumen();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cuando cambian filtros, reseteamos página y recargamos
  useEffect(() => {
    setPage(1);
    fetchTareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  // si cambia el tamaño de página o el número de tareas, corregimos página
  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(tareas.length / pageSize) || 1
    );
    if (page > totalPages) {
      setPage(1);
    }
  }, [tareas, page, pageSize]);

  // ---------- handlers ----------
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const goToDetalle = (id) => {
    navigate(`../detalleTarea/${id}`, {
      state: { from: location.pathname },
    });
  };

  const setFiltroEstadoGrupo = (grupo) => {
    setFiltros((f) => ({ ...f, estado: grupo }));
  };

const limpiarFiltros = () => {
  const base = {
    lote_id: "",
    tipo_codigo: "",
    estado: "",
    texto: "",
    // 👇 cuando limpias, volvemos a HOY + ATRASADAS
    fecha_rango: "hoy_atrasadas",
    fecha_desde: "",
    fecha_hasta: "",
  };
  setFiltros(base);
  if (typeof window !== "undefined") {
    localStorage.setItem("tareasFiltros", JSON.stringify(base));
  }
};




  const cambiarVista = (nuevaVista) => {
  setVista(nuevaVista);
  if (typeof window !== "undefined") {
    localStorage.setItem("tareasVista", nuevaVista);
  }
};

useEffect(() => {
  if (typeof window === "undefined") return;
  localStorage.setItem("tareasFiltros", JSON.stringify(filtros));
}, [filtros]);



  // ---------- métricas para cards ----------
  // ---------- métricas para cards (sobre las tareas FILTRADAS) ----------
const total = tareas.length;

const pendientesGrupo = tareas.filter((t) =>
  ["Pendiente", "Asignada"].includes(t.estado)
).length;

const enProgresoGrupo = tareas.filter(
  (t) => t.estado === "En progreso"
).length;

const completadasGrupo = tareas.filter(
  (t) => t.estado === "Completada"
).length;

const verificadasGrupo = tareas.filter(
  (t) => t.estado === "Verificada"
).length;

const canceladasGrupo = tareas.filter(
  (t) => t.estado === "Cancelada"
).length;


  const isActiveCard = (grupo) =>
    filtros.estado === grupo
      ? "ring-2 ring-offset-2 ring-white/70"
      : "";

  // ---------- datos para paginación (vista lista) ----------
  const totalFiltradas = tareas.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalFiltradas / pageSize) || 1
  );
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltradas);
  const tareasPagina =
    vista === "lista" ? tareas.slice(startIndex, endIndex) : tareas;

  // ---------- datos para tablero Kanban ----------
  const columnasKanbanBase = {
    Pendientes: tareas.filter((t) =>
      ["Pendiente", "Asignada"].includes(t.estado)
    ),
    "En progreso": tareas.filter(
      (t) => t.estado === "En progreso"
    ),
    Completadas: tareas.filter(
      (t) => t.estado === "Completada"
    ),
    Verificadas: tareas.filter(
      (t) => t.estado === "Verificada"
    ),
    Canceladas: tareas.filter(
      (t) => t.estado === "Cancelada"
    ),
  };

  const columnasKanban =
    filtros.estado && filtros.estado in columnasKanbanBase
      ? { [filtros.estado]: columnasKanbanBase[filtros.estado] }
      : columnasKanbanBase;

  const estiloColumna = {
    Pendientes: "bg-amber-50 border-amber-200",
    "En progreso": "bg-indigo-50 border-indigo-200",
    Completadas: "bg-emerald-50 border-emerald-200",
    Verificadas: "bg-violet-50 border-violet-200",
    Canceladas: "bg-rose-50 border-rose-200",
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
            <p className="text-slate-500">
              Gestión y seguimiento de las tareas agronómicas.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className={btnPrimary}
          >
            Crear tarea
          </button>
        </div>

{/* Toggle vista lista / tablero */}
<div className="mb-2">
  <h2 className="text-md font-semibold text-slate-600">Vistas</h2>
</div>

<div className="mb-6 flex items-center gap-3">
  {/* Segmented control igual que Inventario */}
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-1 inline-flex">
    <button
      onClick={() => cambiarVista("lista")}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        vista === "lista"
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-800",
      ].join(" ")}
    >
      Lista
    </button>

    <button
      onClick={() => cambiarVista("kanban")}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        vista === "kanban"
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-800",
      ].join(" ")}
    >
      Tablero
    </button>
  </div>
</div>



        

        {/* Cards métricas */}
        {/* Cards métricas */}
<div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">

  {/* TOTAL (tono azul suave, como "Usuarios registrados") */}
  <div
    className={`${cardBase} ${
      !filtros.estado ? "ring-2 ring-offset-2 ring-emerald-200" : ""
    } bg-sky-50 text-slate-800`}
    onClick={() => setFiltroEstadoGrupo("")}
  >
    <div className="text-sm font-medium text-slate-600">
      Tareas registradas
    </div>
    <div className="mt-2 text-3xl font-bold text-slate-900">
      {total}
    </div>
    <p className="mt-1 text-xs text-slate-500">
      Click para ver todas
    </p>
  </div>

  {/* PENDIENTES (ámbar suave) */}
  <div
    className={`${cardBase} ${isActiveCard(
      "Pendientes"
    )} bg-amber-50 text-amber-800`}
    onClick={() => setFiltroEstadoGrupo("Pendientes")}
  >
    <div className="text-sm font-medium text-slate-600">
      Pendientes
    </div>
    <div className="mt-2 text-3xl font-bold">
      {pendientesGrupo}
    </div>
    <p className="mt-1 text-xs text-slate-500">
      Incluye Pendiente + Asignada
    </p>
  </div>

  {/* EN PROGRESO (índigo suave) */}
  <div
    className={`${cardBase} ${isActiveCard(
      "En progreso"
    )} bg-indigo-50 text-indigo-800`}
    onClick={() => setFiltroEstadoGrupo("En progreso")}
  >
    <div className="text-sm font-medium text-slate-600">
      En progreso
    </div>
    <div className="mt-2 text-3xl font-bold">
      {enProgresoGrupo}
    </div>
  </div>

  {/* COMPLETADAS (verde suave, mismo tono que "Usuarios activos") */}
  <div
    className={`${cardBase} ${isActiveCard(
      "Completadas"
    )} bg-emerald-50 text-emerald-800`}
    onClick={() => setFiltroEstadoGrupo("Completadas")}
  >
    <div className="text-sm font-medium text-slate-600">
      Completadas
    </div>
    <div className="mt-2 text-3xl font-bold">
      {completadasGrupo}
    </div>
  </div>

  {/* VERIFICADAS (violeta suave) */}
  <div
    className={`${cardBase} ${isActiveCard(
      "Verificadas"
    )} bg-violet-50 text-violet-800`}
    onClick={() => setFiltroEstadoGrupo("Verificadas")}
  >
    <div className="text-sm font-medium text-slate-600">
      Verificadas
    </div>
    <div className="mt-2 text-3xl font-bold">
      {verificadasGrupo}
    </div>
  </div>

  {/* CANCELADAS (rojo suave, mismo tono que "Usuarios inactivos") */}
  <div
    className={`${cardBase} ${isActiveCard(
      "Canceladas"
    )} bg-rose-50 text-rose-800`}
    onClick={() => setFiltroEstadoGrupo("Canceladas")}
  >
    <div className="text-sm font-medium text-slate-600">
      Canceladas
    </div>
    <div className="mt-2 text-3xl font-bold">
      {canceladasGrupo}
    </div>
  </div>
</div>

        
        <h2 className="mb-2 text-md font-bold text-slate-600 tracking-wide">
  Filtros
</h2>

{/* Filtro de rango de fechas */}
{/* Filtro de rango de fechas */}
<div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <select
    name="fecha_rango"
    value={filtros.fecha_rango}
    onChange={handleFiltroChange}
    className={inputBase}
  >
    <option value="">Todas las fechas</option>
    <option value="hoy_atrasadas">Hoy + atrasadas (últimos 30 días)</option>
    <option value="proximos_7">Próximos 7 días</option>
    <option value="ultimos_7">Últimos 7 días</option>
    <option value="ultimos_14">Últimas 2 semanas</option>
    <option value="ultimos_30">Último mes</option>
    <option value="personalizado">Rango personalizado</option>
  </select>

  {filtros.fecha_rango === "personalizado" && (
    <>
      <input
        type="date"
        name="fecha_desde"
        value={filtros.fecha_desde || ""}
        onChange={handleFiltroChange}
        className={inputBase}
        placeholder="Desde"
      />
      <input
        type="date"
        name="fecha_hasta"
        value={filtros.fecha_hasta || ""}
        onChange={handleFiltroChange}
        className={inputBase}
        placeholder="Hasta"
      />
    </>
  )}
</div>

<p className="mb-4 text-xs text-slate-500">
  <span className="font-semibold">Vista recomendada para el trabajo diario:</span>{" "}
  selecciona <span className="font-semibold">“Hoy + atrasadas”</span> para ver las tareas
  programadas para hoy y las que quedaron pendientes en los últimos días. 
  <br />Cambia a <span className="font-semibold">“Próximos 7 días”</span> cuando quieras planificar la semana.
</p>


{/* Resto de filtros (lote, tipo, estado, limpiar) */}
<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {/* Lote */}
  <select
    name="lote_id"
    value={filtros.lote_id}
    onChange={handleFiltroChange}
    className={inputBase}
  >
    <option value="">Todos los lotes</option>
    {lotes.map((l) => (
      <option key={l.id} value={l.id}>
        {l.nombre}
      </option>
    ))}
  </select>

  {/* Tipo de actividad */}
  <select
    name="tipo_codigo"
    value={filtros.tipo_codigo}
    onChange={handleFiltroChange}
    className={inputBase}
  >
    <option value="">Todos los tipos de actividad</option>
    {tiposActividad.map((t) => (
      <option key={t.id} value={t.codigo}>
        {t.nombre}
      </option>
    ))}
  </select>

  {/* Estado (grupo) */}
  <select
    name="estado"
    value={filtros.estado}
    onChange={handleFiltroChange}
    className={inputBase}
  >
    <option value="">Todos los estados</option>
    <option value="Pendientes">
      Pendientes (Pendiente / Asignada)
    </option>
    <option value="En progreso">En progreso</option>
    <option value="Completadas">Completadas</option>
    <option value="Verificadas">Verificadas</option>
    <option value="Canceladas">Canceladas</option>
  </select>

  {/* Limpiar */}
  <button
    onClick={limpiarFiltros}
    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    Limpiar filtros
  </button>
</div>


        {/* Separador entre filtros y contenido */}
        <div className="mb-4 h-px w-full bg-slate-200" />

        {/* CONTENIDO PRINCIPAL: LISTA o TABLERO */}
        {loading && <p className="text-slate-500">Cargando tareas…</p>}
        {error && <p className="text-rose-600">{error}</p>}

        {!loading && tareas.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            No hay tareas que coincidan con los filtros.
          </div>
        )}

        {/* VISTA LISTA */}
        {!loading && tareas.length > 0 && vista === "lista" && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Lote
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Fecha programada
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Creada
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Asignados
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tareasPagina.map((t) => (
                    <tr
                      key={t.id}
                      className="bg-white hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {t.id}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {t.titulo || t.tipo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.tipo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.lote}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.fecha_programada
                          ? new Date(
                              t.fecha_programada
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.creada
                          ? new Date(
                              t.creada
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            badgeByEstado(t.estado),
                          ].join(" ")}
                        >
                          {t.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.asignados?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {t.asignados.map((a) => (
                              <span
                                key={a.id}
                                className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800"
                              >
                                {a.nombreCompleto}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {t.estado === "Completada" ? (
                            <button
                              onClick={() => goToDetalle(t.id)}
                              className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                            >
                              Verificar
                            </button>
                          ) : (
                            <button
                              onClick={() => goToDetalle(t.id)}
                              className={btnGhost}
                            >
                              Ver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="text-xs text-slate-600">
                Mostrando{" "}
                <span className="font-semibold">
                  {totalFiltradas === 0 ? 0 : startIndex + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold">{endIndex}</span> de{" "}
                <span className="font-semibold">
                  {totalFiltradas}
                </span>{" "}
                tareas
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                >
                  <option value={10}>10 por página</option>
                  <option value={15}>15 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="px-1 text-xs text-slate-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VISTA TABLERO */}
        {!loading && tareas.length > 0 && vista === "kanban" && (
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {Object.entries(columnasKanban).map(
              ([grupo, lista]) => (
                <div
                  key={grupo}
                  className={`flex max-h-[70vh] flex-col rounded-2xl border p-3 text-sm ${
                    estiloColumna[grupo] || "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                      {grupo}
                    </h3>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {lista.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {lista.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300/70 bg-white/40 p-3 text-center text-xs text-slate-500">
                        Sin tareas en este estado.
                      </div>
                    )}

                    {lista.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => goToDetalle(t.id)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white/90 p-3 text-xs shadow-sm hover:border-emerald-300 hover:shadow-md"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">
                            #{t.id} · {t.lote}
                          </span>
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              badgeByEstado(t.estado),
                            ].join(" ")}
                          >
                            {t.estado}
                          </span>
                        </div>
                        <div className="text-[13px] font-semibold text-slate-900">
                          {t.titulo || t.tipo}
                        </div>
                        {t.fecha_programada && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Programada:{" "}
                            {new Date(
                              t.fecha_programada
                            ).toLocaleString()}
                          </div>
                        )}
                        {t.asignados?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.asignados.map((a) => (
                              <span
                                key={a.id}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-800"
                              >
                                {a.nombreCompleto}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Modal Crear Tarea */}
        <CrearTareaModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            fetchTareas();
            fetchResumen();
          }}
        />
      </div>
    </section>
  );
}
