import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { listarTareas } from "../api/apiClient";
import { io } from "socket.io-client";
import DetalleTareaTrabajadorModal from "../components/DetalleTareaTrabajadorModal";

export default function MisTareas() {
      const navigate = useNavigate();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detalleTarea, setDetalleTarea] = useState(null);

  // Cargar tareas
  const fetchTareas = async () => {
    try {
      setLoading(true);
      const res = await listarTareas({ soloMias: true });
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
  }, []);

  // Stats
  const total = tareas.length;
  const completadas = tareas.filter((t) => t.estado === "Completada").length;
  const pendientes = tareas.filter((t) => t.estado === "Pendiente").length;

    // 👇 Navegar a la página DetalleTarea (ruta relativa al layout actual)
  const goToDetalle = (id) => {
    // si estás en /owner/tareas => relative "../detalleTarea/:id"
    // si estás en /tech/tareas  => relative "../detalleTarea/:id"
    // si en algún momento usas esta tabla en otro path, también funciona por ser relativo
    navigate(`../detalleTarea/${id}`, { state: { from: location.pathname } });
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Mis Tareas</h1>

      {/* Cards resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Total de tareas</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Tareas completadas</p>
          <p className="text-2xl font-bold text-green-600">{completadas}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Tareas pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{pendientes}</p>
        </div>
      </div>

      {/* Tabla */}
      {loading && <p className="text-gray-500">Cargando tareas...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && tareas.length === 0 && (
        <p className="text-gray-500">No tienes tareas asignadas.</p>
      )}

      {!loading && tareas.length > 0 && (
        <div className="overflow-x-auto border rounded-md bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Lote</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">{t.id}</td>
                  <td className="px-4 py-2">{t.tipo}</td>
                  <td className="px-4 py-2">{t.lote}</td>
                  <td className="px-4 py-2">
                    {new Date(t.fecha_programada).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        t.estado === "Pendiente"
                          ? "bg-yellow-100 text-yellow-800"
                          : t.estado === "Asignada"
                          ? "bg-blue-100 text-blue-800"
                          : t.estado === "Completada"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => goToDetalle(t.id)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <DetalleTareaTrabajadorModal
        open={!!detalleTarea}
        onClose={() => setDetalleTarea(null)}
        tareaId={ detalleTarea}
        onUpdated={fetchTareas}
      />
    </section>
  );
}
