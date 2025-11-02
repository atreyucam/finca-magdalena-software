// src/pages/MisTareas.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { listarTareas } from "../api/apiClient";
// import DetalleTareaTrabajadorModal from "../components/DetalleTareaTrabajadorModal";

export default function MisTareas() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------- filtros (solo estado para el trabajador) --------
  const [filtros, setFiltros] = useState({ estado: "" });

  // ---------- helpers UI (idénticos a la vista del técnico) ----------
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

  const btnGhost =
    "rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

  // ---------- data ----------
  const fetchTareas = async () => {
    try {
      setLoading(true);
      const q = { soloMias: true };
      if (filtros.estado) q.estado = filtros.estado;
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

  useEffect(() => {
    fetchTareas();

    const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:3001", {
      withCredentials: false,
    });
    socket.on("tareas:update", fetchTareas);
    return () => socket.disconnect();
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

  // ---------- métricas ----------
  const total = tareas.length;
  const pendientes = tareas.filter((t) => t.estado === "Pendiente").length;
  const completadas = tareas.filter((t) => t.estado === "Completada").length;

  return (
    // fondo + padding igual que en la vista del técnico
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Card contenedora */}
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis Tareas</h1>
            <p className="text-slate-500">Tareas asignadas para el trabajador.</p>
          </div>
          {/* (no hay botón Crear tarea para trabajador) */}
        </div>

        {/* Cards métricas */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 sm:p-5">
            <div className="text-slate-600">Total de tareas</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4 sm:p-5">
            <div className="text-slate-600">Tareas completadas</div>
            <div className="mt-1 text-3xl font-bold text-emerald-700">
              {completadas}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-4 sm:p-5">
            <div className="text-slate-600">Tareas pendientes</div>
            <div className="mt-1 text-3xl font-bold text-amber-700">
              {pendientes}
            </div>
          </div>
        </div>

        {/* Filtros (misma línea visual) */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            onClick={() => setFiltros({ estado: "" })}
            className={btnGhost}
          >
            Limpiar filtros
          </button>
        </div>

        {/* Tabla (idéntico patrón visual) */}
        {loading && <p className="text-slate-500">Cargando tareas…</p>}
        {error && <p className="text-rose-600">{error}</p>}
        {!loading && tareas.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
            No tienes tareas asignadas.
          </div>
        )}

        {!loading && tareas.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Lote</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tareas.map((t) => (
                  <tr key={t.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{t.id}</td>
                    <td className="px-4 py-3 text-slate-700">{t.tipo}</td>
                    <td className="px-4 py-3 text-slate-700">{t.lote}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.fecha_programada
                        ? new Date(t.fecha_programada).toLocaleString()
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => goToDetalle(t.id)}
                        className={btnGhost}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Si prefieres el modal en lugar de la página de detalle, vuelve a habilitar esto:
      <DetalleTareaTrabajadorModal
        open={!!detalleTarea}
        onClose={() => setDetalleTarea(null)}
        tareaId={detalleTarea}
        onUpdated={fetchTareas}
      /> */}
    </section>
  );
}
