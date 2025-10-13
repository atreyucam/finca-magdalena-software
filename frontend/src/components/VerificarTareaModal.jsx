import { useState } from "react";
import { verificarTarea } from "../api/apiClient";
import toast from "react-hot-toast";

export default function VerificarTareaModal({ open, onClose, tareaId, onVerified }) {
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleVerificar = async () => {
    try {
      setLoading(true);
      await verificarTarea(tareaId, { comentario });
      toast.success("Tarea verificada correctamente ✅");
      onVerified?.(); // refresca lista
      onClose(); // cierra modal
    } catch (err) {
      console.error("Error verificando tarea:", err);
      toast.error(err.response?.data?.message || "No se pudo verificar la tarea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Verificar tarea</h2>

        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Escribe un comentario..."
          className="w-full border rounded-md p-2 mb-4"
          rows={3}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleVerificar}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Verificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
