// src/components/AsignacionesModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { listarUsuarios, actualizarAsignaciones, obtenerTarea } from "../api/apiClient";

export default function AsignacionesModal({ tareaId, open, onClose, onSaved }) {
  const [usuarios, setUsuarios] = useState([]);
  const [selAsign, setSelAsign] = useState([]); // ids string
  const [selPick, setSelPick] = useState([]);   // selección temporal
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [uRes, tRes] = await Promise.all([
          listarUsuarios({ estado: "Activo", pageSize: 200 }),
          obtenerTarea(tareaId),
        ]);
        const us = (uRes.data?.data || []).filter((u) =>
          ["Trabajador", "Tecnico"].includes(u.role)
        );
        setUsuarios(us);
        setSelAsign(
          (tRes.data?.asignaciones || [])
            .map((a) => String(a.usuario?.id))
            .filter(Boolean)
        );
        setSelPick([]);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar usuarios/asignaciones");
      }
    })();
  }, [open, tareaId]);

  const usuariosFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = (usuarios || []).filter(
      (u) => u.estado === "Activo" && ["Trabajador", "Tecnico"].includes(u.role)
    );
    if (!s) return base;
    return base.filter((u) =>
      `${u.nombres} ${u.apellidos} ${u.email || ""}`.toLowerCase().includes(s)
    );
  }, [usuarios, q]);

  const pickToggle = (id) =>
    setSelPick((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const asignarSeleccionados = () => {
    if (selPick.length === 0) return;
    setSelAsign((prev) => Array.from(new Set([...prev, ...selPick])));
    setSelPick([]);
  };

  const quitarAsignado = (id) => setSelAsign((p) => p.filter((x) => x !== String(id)));

  const guardar = async () => {
    try {
      await actualizarAsignaciones(tareaId, { usuarios: selAsign.map(Number) });
      toast.success("Asignaciones actualizadas ✅");
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudieron actualizar las asignaciones");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-semibold text-lg mb-3">Editar trabajadores asignados</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* izquierda */}
        <div className="border rounded-xl p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="w-full border rounded p-2 text-sm mb-2"
          />
          <div className="text-xs text-gray-500 mb-2">{usuariosFiltrados.length} usuarios activos</div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {usuariosFiltrados.map((u) => {
              const idStr = String(u.id);
              const yaAsignado = selAsign.includes(idStr);
              return (
                <label
                  key={u.id}
                  className={`flex items-center justify-between gap-2 py-2 ${
                    yaAsignado ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                  title={yaAsignado ? "Ya está asignado" : ""}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selPick.includes(idStr)}
                      onChange={() => pickToggle(idStr)}
                      disabled={yaAsignado}
                    />
                    <div className="text-sm">
                      {u.nombres} {u.apellidos} <span className="text-gray-500">({u.role})</span>
                    </div>
                  </div>
                  {u.email && <div className="text-[11px] text-gray-500">{u.email}</div>}
                </label>
              );
            })}
            {usuariosFiltrados.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">Sin resultados</div>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={asignarSeleccionados}
              disabled={selPick.length === 0}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Asignar seleccionados
            </button>
          </div>
        </div>
        {/* derecha */}
        <div className="border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Asignados</div>
            <div className="text-xs text-gray-500">{selAsign.length} en total</div>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {selAsign.map((idStr) => {
              const u = usuarios.find((x) => String(x.id) === idStr);
              return (
                <div key={idStr} className="flex items-center justify-between py-2">
                  <div className="text-sm">
                    {u ? (
                      <>
                        {u.nombres} {u.apellidos} <span className="text-gray-500">({u.role})</span>
                      </>
                    ) : (
                      <>ID {idStr}</>
                    )}
                  </div>
                  <button onClick={() => quitarAsignado(idStr)} className="text-red-600 text-sm hover:underline">
                    Quitar
                  </button>
                </div>
              );
            })}
            {selAsign.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">Aún no hay asignados</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-gray-500">
          Selecciona usuarios y pulsa <strong>Asignar seleccionados</strong>. Luego <strong>Guardar</strong>.
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={guardar} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Guardar cambios
          </button>
        </div>
      </div>
    </Modal>
  );
}
