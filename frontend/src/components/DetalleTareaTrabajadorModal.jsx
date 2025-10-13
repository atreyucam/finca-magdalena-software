import { useEffect, useState } from "react";
import { obtenerTarea, completarTarea } from "../api/apiClient";
import toast from "react-hot-toast";

export default function DetalleTareaTrabajadorModal({ open, onClose, tareaId, onUpdated }) {
  const [tarea, setTarea] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Cargar detalle completo cuando abre el modal
  useEffect(() => {
    if (!open || !tareaId) return;

    const fetchTarea = async () => {
      try {
        setLoading(true);
        const res = await obtenerTarea(tareaId);
        setTarea(res.data); // 🔹 ahora trae estados, asignaciones, novedades
      } catch (err) {
        console.error("Error cargando tarea:", err);
        toast.error("No se pudo cargar la tarea");
      } finally {
        setLoading(false);
      }
    };

    fetchTarea();
  }, [open, tareaId]);

  if (!open) return null;

  // 🔹 Completar tarea
  const handleCompletar = async () => {
    try {
      setLoading(true);
      await completarTarea(tarea.id, { comentario: "Completada por el trabajador" });

      toast.success("Tarea completada correctamente ✅");

      // 🔹 Refrescar tarea local con nuevo estado
      const res = await obtenerTarea(tarea.id);
      setTarea(res.data);

      onUpdated?.(); // refrescar tabla
    } catch (err) {
      console.error("Error completando tarea:", err);
      toast.error(err.response?.data?.message || "No se pudo completar la tarea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6">
        {loading && <p className="text-gray-500">Cargando...</p>}
        {tarea && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Detalle de Tarea #{tarea.id}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna 1 */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Información general</h3>
                  <p><strong>Tipo:</strong> {tarea.tipo}</p>
                  <p><strong>Lote:</strong> {tarea.lote}</p>
                  <p><strong>Fecha programada:</strong> {tarea.fecha_programada}</p>
                  <p><strong>Estado:</strong> {tarea.estado}</p>
                  <p><strong>Descripción:</strong> {tarea.descripcion || "Sin descripción"}</p>
                </div>

                <div>
                  <h3 className="font-semibold">Insumos / Herramientas</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    <li>Tijeras de poda</li>
                    <li>Guantes</li>
                    <li>Desinfectante</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">Novedades</h3>
                  {tarea.novedades?.length > 0 ? (
                    <ul className="text-sm text-gray-600">
                      {tarea.novedades.map((n) => (
                        <li key={n.id}>
                          {n.texto} ({new Date(n.created_at).toLocaleString()})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No hay novedades aún.</p>
                  )}
                </div>
              </div>

              {/* Columna 2 */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Asignaciones</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {tarea.asignaciones?.length > 0 ? (
                      tarea.asignaciones.map((a) => (
                        <li key={a.id}>{a.usuario?.nombre} - {a.rol_en_tarea}</li>
                      ))
                    ) : (
                      <li>No asignados</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold">Historial de estados</h3>
                  <ul className="text-sm text-gray-600">
                    {tarea.estados?.length > 0 ? (
                      tarea.estados.map((e, i) => (
                        <li key={i}>
                          <strong>{e.estado}</strong> -{" "}
                          {new Date(e.fecha).toLocaleString()} por {e.usuario?.nombre}
                        </li>
                      ))
                    ) : (
                      <li>No hay historial</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cerrar
              </button>
              {tarea.estado !== "Completada" && (
                <button
                  onClick={handleCompletar}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Completar"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
