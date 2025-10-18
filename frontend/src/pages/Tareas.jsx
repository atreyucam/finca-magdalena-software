import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
  listarTareas,
  listarLotes,
  listarCosechas,
} from "../api/apiClient";
import CrearTareaModal from "../components/CrearTareaModal";
// import VerificarTareaModal from "../components/VerificarTareaModal";

export default function Tareas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tareas, setTareas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [periodos, setPeriodos] = useState([]);

  const [filtros, setFiltros] = useState({
    lote_id: "",
    periodo_id: "",
    estado: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ---------- helpers UI (consistentes con Usuarios) ----------
  const badgeByEstado = (estado) => {
    switch (estado) {
      case "Pendiente":
        return "bg-amber-100 text-amber-700";
      case "Asignada":
        return "bg-sky-100 text-sky-700";
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

  // ---------- data ----------
  const fetchTareas = async () => {
    try {
      setLoading(true);
      // periodo_id no lo usas en el endpoint (como en tu código original)
      const q = Object.fromEntries(
        Object.entries(filtros).filter(([k, v]) => v !== "" && k !== "periodo_id")
      );
      const res = await listarTareas(q);
      setTareas(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error("Error cargando tareas:", err);
      setError("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltrosData = async () => {
    try {
      const lotesRes = await listarLotes();
      setLotes(lotesRes.data || []);

      const cosechasRes = await listarCosechas();
      const activas = (cosechasRes.data || []).filter((c) => c.estado === "Activa");
      setCosechas(activas);
      if (activas.length === 1) {
        setPeriodos(activas[0].PeriodoCosechas || []);
      }
    } catch (err) {
      console.error("Error cargando lotes/cosechas:", err);
    }
  };

  useEffect(() => {
    fetchFiltrosData();
    fetchTareas();

    const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3001", {
      withCredentials: false,
    });

    socket.on("tareas:update", () => {
      console.log("Evento tareas:update recibido, refrescando...");
      fetchTareas();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const goToDetalle = (id) => {
    navigate(`../detalleTarea/${id}`, { state: { from: location.pathname } });
  };

  // ---------- métricas (igual patrón que Usuarios) ----------
  const total = tareas.length;
  const pendientes = tareas.filter((t) => t.estado === "Pendiente").length;
  const completadas = tareas.filter((t) => t.estado === "Completada").length;

  return (
    // Fondo y padding como en Usuarios
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Card contenedora */}
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
            <p className="text-slate-500">Gestión y seguimiento de tareas.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowModal(true)} className={btnPrimary}>
              Crear tarea
            </button>
          </div>
        </div>

        {/* Cards métricas (mismo look & feel) */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Tareas registradas</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 sm:p-5">
            <div className="text-slate-600">Pendientes</div>
            <div className="mt-1 text-3xl font-bold text-amber-700">{pendientes}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Completadas</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">{completadas}</div>
          </div>
        </div>

        {/* Filtros (misma línea visual que Usuarios) */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <select
            name="periodo_id"
            value={filtros.periodo_id}
            onChange={handleFiltroChange}
            className={inputBase}
          >
            <option value="">Todos los periodos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            name="estado"
            value={filtros.estado}
            onChange={handleFiltroChange}
            className={inputBase}
          >
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Asignada">Asignada</option>
            <option value="Completada">Completada</option>
            <option value="Verificada">Verificada</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          <button
            onClick={() =>
              setFiltros({ lote_id: "", periodo_id: "", estado: "" })
            }
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Tabla (mismo patrón visual) */}
        {loading && <p className="text-slate-500">Cargando tareas…</p>}
        {error && <p className="text-rose-600">{error}</p>}
        {!loading && tareas.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            No hay tareas registradas.
          </div>
        )}

        {!loading && tareas.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Título</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Lote</th>
                  <th className="px-4 py-3 text-left font-medium">Programada</th>
                  <th className="px-4 py-3 text-left font-medium">Creada</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Asignados</th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tareas.map((t) => (
                  <tr key={t.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{t.id}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {t.titulo || t.tipo}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.tipo}</td>
                    <td className="px-4 py-3 text-slate-700">{t.lote}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.fecha_programada
                        ? new Date(t.fecha_programada).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.creada ? new Date(t.creada).toLocaleString() : "-"}
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
                        <button onClick={() => goToDetalle(t.id)} className={btnGhost}>
                          Ver
                        </button>

                        {t.estado === "Pendiente" && (
                          <button className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                            Asignar
                          </button>
                        )}
                        {t.estado === "Asignada" && (
                          <button className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                            Completar
                          </button>
                        )}
                        {t.estado === "Completada" && (
                          <button className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
                            Verificar
                          </button>
                        )}

                        <button className="rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-200">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Crear Tarea */}
        <CrearTareaModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={() => fetchTareas()}
        />
      </div>
    </section>
  );
}
