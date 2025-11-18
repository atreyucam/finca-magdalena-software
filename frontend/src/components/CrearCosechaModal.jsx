// src/components/CrearCosechaModal.jsx
import { useState, useEffect } from "react";
import { crearCosecha } from "../api/apiClient";
import toast from "react-hot-toast";

export default function CrearCosechaModal({ open, onClose, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setNombre("");
      setNumero("");
      setFechaInicio("");
      setErrors({});
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!numero || Number(numero) <= 0) {
      e.numero = "Ingrese el número de cosecha (1, 2, 3...)";
    }
    if (!fechaInicio) e.fechaInicio = "La fecha de inicio es obligatoria";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;

    const payload = {
      nombre: nombre.trim(),
      numero: Number(numero),
      fecha_inicio: fechaInicio, // 👈 sólo esto; anio_agricola y codigo los calcula el backend
    };

    try {
      setSaving(true);
      await crearCosecha(payload);
      toast.success("Cosecha creada correctamente");
      onClose?.();
      onCreated?.();
    } catch (err) {
      console.error("Error creando cosecha", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo crear la cosecha";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-3">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Nueva cosecha
            </h2>
            <p className="text-sm text-slate-500">
              Define un nuevo período de cosecha para la finca. El año agrícola y
              el código se generarán automáticamente a partir de la fecha de inicio.
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
        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre de la cosecha *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej. Cosecha 1, Enero–Julio"
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-rose-600">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número de cosecha *
              </label>
              <input
                type="number"
                min="1"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="1"
              />
              {errors.numero && (
                <p className="mt-1 text-xs text-rose-600">{errors.numero}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {errors.fechaInicio && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.fechaInicio}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar cosecha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
