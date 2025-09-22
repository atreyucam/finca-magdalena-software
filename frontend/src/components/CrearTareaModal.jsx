import { useEffect, useState } from "react";
import {
  crearTarea,
  listarLotes,
  listarCosechas,
  listarUsuarios,
  listarTiposActividad,
} from "../api/apiClient";

export default function CrearTareaModal({ open, onClose, onCreated }) {
  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);

  const [form, setForm] = useState({
    tipo_codigo: "",
    lote_id: "",
    fecha_programada: new Date().toISOString().split("T")[0],
    descripcion: "",
    cosecha_id: "",
    periodo_id: "",
    asignados: [],
  });

  // 🔹 Cargar datos iniciales
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        // Tipos de actividad
        const tiposRes = await listarTiposActividad();
        setTiposActividad(tiposRes.data || []);

        // Lotes
        const lotesRes = await listarLotes();
        setLotes(lotesRes.data || []);
        if (lotesRes.data?.length > 0) {
          setForm((f) => ({ ...f, lote_id: String(lotesRes.data[0].id) }));
        }

        // Cosechas activas
        const cosechasRes = await listarCosechas();
        const activas = (cosechasRes.data || []).filter((c) => c.estado === "Activa");
        setCosechas(activas);
        if (activas.length === 1) {
          setForm((f) => ({ ...f, cosecha_id: String(activas[0].id) }));
          setPeriodos(activas[0].PeriodoCosechas || []);
        }

        // Usuarios activos (Trabajador/Tecnico)
        const usuariosRes = await listarUsuarios({ estado: "Activo", pageSize: 100 });
        setUsuarios(
          (usuariosRes.data?.data || []).filter(
            (u) => u.role === "Trabajador" || u.role === "Tecnico"
          )
        );
      } catch (err) {
        console.error("Error cargando datos para crear tarea:", err);
      }
    })();
  }, [open]);

  // 🔹 Cuando cambia cosecha, cargar periodos
  useEffect(() => {
    if (!form.cosecha_id) return;
    const selected = cosechas.find((c) => String(c.id) === String(form.cosecha_id));
    if (selected) setPeriodos(selected.PeriodoCosechas || []);
  }, [form.cosecha_id, cosechas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAsignados = (e) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setForm((f) => ({ ...f, asignados: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        lote_id: Number(form.lote_id),
        cosecha_id: Number(form.cosecha_id),
        periodo_id: form.periodo_id ? Number(form.periodo_id) : null,
        asignados: form.asignados.map((id) => Number(id)),
        detalles: {},
      };
      const res = await crearTarea(payload);
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      console.error("Error creando tarea:", err);
      alert("No se pudo crear la tarea");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Crear nueva tarea</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium">Tipo de actividad</label>
            <select
              name="tipo_codigo"
              value={form.tipo_codigo}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
            >
              <option value="">Seleccione un tipo</option>
              {tiposActividad.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Lote */}
          <div>
            <label className="block text-sm font-medium">Lote</label>
            <select
              name="lote_id"
              value={form.lote_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
            >
              {lotes.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium">Fecha programada</label>
            <input
              type="date"
              name="fecha_programada"
              value={form.fecha_programada}
              onChange={handleChange}
              min={new Date().toISOString().split("T")[0]}
              required
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              className="mt-1 block w-full border rounded-md p-2"
            />
          </div>

          {/* Cosecha */}
          <div>
            <label className="block text-sm font-medium">Cosecha</label>
            <select
              name="cosecha_id"
              value={form.cosecha_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
            >
              {cosechas.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre} ({c.anio_agricola})
                </option>
              ))}
            </select>
          </div>

          {/* Periodo */}
          <div>
            <label className="block text-sm font-medium">Periodo</label>
            <select
              name="periodo_id"
              value={form.periodo_id}
              onChange={handleChange}
              className="mt-1 block w-full border rounded-md p-2"
            >
              <option value="">Seleccione el periodo</option>
              {periodos.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Asignados */}
          <div>
            <label className="block text-sm font-medium">Asignar a</label>
            <select
              multiple
              name="asignados"
              value={form.asignados}
              onChange={handleAsignados}
              className="mt-1 block w-full border rounded-md p-2 h-32"
            >
              {usuarios.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nombres} {u.apellidos} ({u.role})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar varios.
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
