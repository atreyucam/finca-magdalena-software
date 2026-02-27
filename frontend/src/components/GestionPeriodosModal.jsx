// src/components/GestionPeriodosModal.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  crearPeriodosCosecha,
  eliminarPeriodoCosecha,
  obtenerCosecha,
} from "../api/apiClient";

// Opciones válidas según el ENUM del backend
const OPCIONES_PERIODOS = [
  "Pre-Floración",
  "Floración",
  "Desarrollo",
  "Cosecha",
];

export default function GestionPeriodosModal({
  open,
  onClose,
  cosecha,
  onUpdated, // callback para que Produccion.jsx recargue datos
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [errors, setErrors] = useState({});

  // formulario de nuevo periodo (solo selecciona entre los disponibles)
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    if (open && cosecha) {
      cargarPeriodos(cosecha.id);
      resetNewForm();
    }
    if (!open) {
      setPeriodos([]);
      setErrors({});
      setLoading(false);
      setSaving(false);
      resetNewForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cosecha?.id]);

  const resetNewForm = () => {
    setNombre("");
    setErrors({});
  };

  const cargarPeriodos = async (cosechaId) => {
    if (!cosechaId) return;
    try {
      setLoading(true);
      const res = await obtenerCosecha(cosechaId);
      const data = res?.data || res;
      const list = data?.PeriodoCosechas || data?.PeriodoCosecha || [];
      setPeriodos(list);
    } catch (err) {
      console.error("Error cargando periodos", err);
      toast.error(
        err?.response?.data?.message || "No se pudieron cargar los periodos"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open || !cosecha) return null;

  /* =========== NUEVO PERIODO =========== */

  const validarNuevo = () => {
    const e = {};
    if (!nombre.trim()) {
      e.nombre = "Selecciona un periodo para agregar";
    }

    // Evitar duplicar nombre en la misma cosecha
    const yaExiste = periodos.some((p) => p.nombre === nombre);
    if (yaExiste) {
      e.nombre = "Este periodo ya existe en esta cosecha";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCrearPeriodo = async (ev) => {
    ev.preventDefault();
    if (!validarNuevo()) return;
    if (!cosecha?.id) return;

    const payload = [
      {
        nombre: nombre.trim(),
      },
    ];

    try {
      setSaving(true);
      await crearPeriodosCosecha(cosecha.id, payload);
      toast.success("Periodo agregado correctamente");
      resetNewForm();
      await cargarPeriodos(cosecha.id);
      onUpdated?.();
    } catch (err) {
      console.error("Error creando periodo", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo agregar el periodo";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* =========== ELIMINAR =========== */

  const handleEliminar = async (p) => {
    if (!p?.id) return;
    const ok = window.confirm(
      `¿Eliminar el periodo "${p.nombre}" de esta cosecha?`
    );
    if (!ok) return;

    try {
      setSaving(true);
      await eliminarPeriodoCosecha(p.id);
      toast.success("Periodo eliminado");
      await cargarPeriodos(cosecha.id);
      onUpdated?.();
    } catch (err) {
      console.error("Error eliminando periodo", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo eliminar el periodo";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* =========== OPCIONES DISPONIBLES PARA NUEVO =========== */

  const opcionesDisponiblesNuevo = OPCIONES_PERIODOS.filter(
    (opt) => !periodos.some((p) => p.nombre === opt)
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-3">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gestionar periodos de cosecha
            </h2>
            <p className="text-sm text-slate-500">
              Cosecha:{" "}
              <span className="font-semibold text-slate-800">
                {cosecha.nombre}
              </span>{" "}
              {cosecha.anio_agricola && (
                <>
                  · Año agrícola:{" "}
                  <span className="font-mono">{cosecha.anio_agricola}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
  {/* Separador entre filtros y contenido */}
        <div className="mb-4 h-px w-full bg-slate-200" />
        {/* Contenido */}
        <div className="grid gap-6 md:grid-cols-[1.3fr,1fr]">
          {/* Lista de periodos */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Periodos registrados
            </h3>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando periodos…</p>
            ) : periodos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                Aún no hay periodos registrados para esta cosecha.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {periodos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-800">
                        {p.nombre}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleEliminar(p)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        disabled={saving}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Periodos disponibles */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 text-xs">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Periodos disponibles
            </h3>
            <p className="mb-3 text-[11px] text-slate-500">
              Los periodos representan etapas fenológicas de la cosecha
              (pre-floración, floración, crecimiento y cosecha/recuperación).
              Puedes agregar los periodos base que faltan para esta cosecha.
            </p>

            <form onSubmit={handleCrearPeriodo} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Nombre del periodo *
                </label>
                <select
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Selecciona un periodo…</option>
                  {opcionesDisponiblesNuevo.length === 0 ? (
                    <option disabled>No hay más periodos disponibles</option>
                  ) : (
                    opcionesDisponiblesNuevo.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  )}
                </select>
                {errors.nombre && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {errors.nombre}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || opcionesDisponiblesNuevo.length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Agregar periodo"}
                </button>
              </div>
            </form>

            {opcionesDisponiblesNuevo.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Esta cosecha ya tiene registrados todos los periodos base.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
