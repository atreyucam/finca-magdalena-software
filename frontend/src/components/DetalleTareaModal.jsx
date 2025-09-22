import { useEffect, useState } from "react";
import { obtenerTarea } from "../api/apiClient";

export default function DetalleTareaModal({ open, onClose, tareaId }) {
  const [tarea, setTarea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !tareaId) return;

    const fetchTarea = async () => {
      try {
        setLoading(true);
        const res = await obtenerTarea(tareaId);
        setTarea(res.data);
        setError(null);
      } catch (err) {
        console.error("Error cargando tarea:", err);
        setError("No se pudo cargar la tarea");
      } finally {
        setLoading(false);
      }
    };

    fetchTarea();
  }, [open, tareaId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4">Detalle de la Tarea</h2>

        {loading && <p className="text-gray-500">Cargando...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && tarea && (
          <div className="space-y-4">
            {/* Info principal */}
            <div>
              <p><strong>ID:</strong> {tarea.id}</p>
              <p><strong>Tipo:</strong> {tarea.tipo}</p>
              <p><strong>Lote:</strong> {tarea.lote}</p>
              <p><strong>Fecha programada:</strong> {new Date(tarea.fecha_programada).toLocaleDateString()}</p>
              <p><strong>Descripción:</strong> {tarea.descripcion || "-"}</p>
              <p><strong>Cosecha:</strong> {tarea.cosecha}</p>
              <p><strong>Periodo:</strong> {tarea.periodo || "-"}</p>
              <p><strong>Estado actual:</strong> {tarea.estado}</p>
              <p><strong>Creador:</strong> {tarea.creador?.nombre}</p>
            </div>

            {/* Asignaciones */}
            <div>
              <h3 className="text-lg font-semibold">Asignaciones</h3>
              {tarea.asignaciones?.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {tarea.asignaciones.map((a) => (
                    <li key={a.id}>
                      {a.usuario?.nombre} <span className="text-sm text-gray-500">({a.rol_en_tarea})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Sin asignaciones</p>
              )}
            </div>

            {/* Estados */}
            <div>
              <h3 className="text-lg font-semibold">Historial de Estados</h3>
              {tarea.estados?.length > 0 ? (
                <ul className="space-y-2">
                  {tarea.estados.map((e, idx) => (
                    <li key={idx} className="border p-2 rounded">
                      <p><strong>{e.estado}</strong> - {new Date(e.fecha).toLocaleString()}</p>
                      <p><em>{e.comentario || "Sin comentario"}</em></p>
                      <p className="text-sm text-gray-600">Por: {e.usuario?.nombre}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Sin historial</p>
              )}
            </div>

            {/* Novedades */}
            <div>
              <h3 className="text-lg font-semibold">Novedades</h3>
              {tarea.novedades?.length > 0 ? (
                <ul className="space-y-2">
                  {tarea.novedades.map((n) => (
                    <li key={n.id} className="border p-2 rounded">
                      <p>{n.texto}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(n.created_at).toLocaleString()} - {n.autor?.nombre}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Sin novedades</p>
              )}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
