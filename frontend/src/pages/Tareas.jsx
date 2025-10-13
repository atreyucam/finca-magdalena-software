import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import {
  listarTareas,
  listarLotes,
  listarCosechas,
} from "../api/apiClient";
import CrearTareaModal from "../components/CrearTareaModal";
// import DetalleTareaModal from "../components/DetalleTareaModal";
import VerificarTareaModal from "../components/VerificarTareaModal";

import { io } from "socket.io-client";

export default function Tareas() {
    const navigate = useNavigate();
  const location = useLocation();
  const [tareas, setTareas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  // const [detalleId, setDetalleId] = useState(null);
  // const [verificarId, setVerificarId] = useState(null);

  const [filtros, setFiltros] = useState({
    lote_id: "",
    periodo_id: "",
    estado: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

// 🔹 Cargar tareas desde API
  const fetchTareas = async () => {
    try {
      setLoading(true);
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

 // 🔹 Cargar lotes y cosechas
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

  // 🔹 Inicializar y escuchar sockets
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
  }, []);

// 🔹 Cuando cambia filtro, recargar tareas
  useEffect(() => {
    fetchTareas();
  }, [filtros]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  // 👇 Navegar a la página DetalleTarea (ruta relativa al layout actual)
  const goToDetalle = (id) => {
    // si estás en /owner/tareas => relative "../detalleTarea/:id"
    // si estás en /tech/tareas  => relative "../detalleTarea/:id"
    // si en algún momento usas esta tabla en otro path, también funciona por ser relativo
    navigate(`../detalleTarea/${id}`, { state: { from: location.pathname } });
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-gray-600">Gestión y seguimiento de tareas.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <select
          name="lote_id"
          value={filtros.lote_id}
          onChange={handleFiltroChange}
          className="border rounded-md p-2"
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
          className="border rounded-md p-2"
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
          className="border rounded-md p-2"
        >
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Asignada">Asignada</option>
          <option value="Completada">Completada</option>
          <option value="Verificada">Verificada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      </div>

      {/* Lista de tareas */}
      {loading && <p className="text-gray-500">Cargando tareas...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && tareas.length === 0 && (
        <p className="text-gray-500">No hay tareas registradas.</p>
      )}

      {!loading && tareas.length > 0 && (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Título</th> 
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Lote</th>
                    <th className="px-4 py-2 text-left">Programada</th>        {/* 👈 con hora */}
    <th className="px-4 py-2 text-left">Creada</th> 
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Asignados</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">{t.id}</td>
                  <td className="px-4 py-2">{t.titulo || t.tipo}</td>
                  <td className="px-4 py-2">{t.tipo}</td>
                  <td className="px-4 py-2">{t.lote}</td>
                  <td className="px-4 py-2">
        {t.fecha_programada
          ? new Date(t.fecha_programada).toLocaleString()
          : "-"}
      </td>
      <td className="px-4 py-2">
        {t.creada
          ? new Date(t.creada).toLocaleString()
          : "-"}
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
                          : t.estado === "Verificada"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">
  {t.asignados?.length > 0 ? (
    <div className="flex flex-col gap-1">
      {t.asignados.map((a) => (
        <span
          key={a.id}
          className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
        >
          {a.nombreCompleto}
        </span>
      ))}
    </div>
  ) : (
    "-"
  )}
</td>


                  <td className="px-4 py-2 space-x-2">
  <button
    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
    onClick={() => goToDetalle(t.id)}
  >
    Ver
  </button>

  {t.estado === "Pendiente" && (
    <button className="px-2 py-1 bg-blue-200 rounded hover:bg-blue-300">
      Asignar
    </button>
  )}
  {t.estado === "Asignada" && (
    <button className="px-2 py-1 bg-green-200 rounded hover:bg-green-300">
      Completar
    </button>
  )}
  {t.estado === "Completada" && (
  <button
    className="px-2 py-1 bg-purple-200 rounded hover:bg-purple-300"
    // onClick={() => setVerificarId(t.id)}
  >
    Verificar
  </button>
)}

  <button className="px-2 py-1 bg-red-200 rounded hover:bg-red-300">
    Eliminar
  </button>
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
    </section>
  );
}
