// src/components/CrearLoteModal.jsx
import { useState, useEffect } from "react";
import { crearLote } from "../api/apiClient";
import toast from "react-hot-toast";

export default function CrearLoteModal({ open, onClose, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [superficieHa, setSuperficieHa] = useState("");
  const [numeroPlantas, setNumeroPlantas] = useState("");
  const [fechaSiembra, setFechaSiembra] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // reset cuando se abre/cierra
  useEffect(() => {
    if (open) {
      setNombre("");
      setSuperficieHa("");
      setNumeroPlantas("");
      setFechaSiembra("");
      setErrors({});
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const validar = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!superficieHa || Number(superficieHa) <= 0) {
      e.superficieHa = "Ingrese una superficie mayor a 0";
    }
    if (!numeroPlantas || Number(numeroPlantas) <= 0) {
      e.numeroPlantas = "Ingrese el número de plantas";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;

    const payload = {
      nombre: nombre.trim(),
      superficie_ha: Number(superficieHa),
      numero_plantas: Number(numeroPlantas),
      fecha_siembra: fechaSiembra || null,
    };

    try {
      setSaving(true);
      await crearLote(payload);
      toast.success("Lote creado correctamente");
      onClose?.();
      onCreated?.();
    } catch (err) {
      console.error("Error creando lote", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo crear el lote";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-3">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Nuevo lote
            </h2>
            <p className="text-sm text-slate-500">
              Registra un nuevo lote permanente de la finca.
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Nombre del lote *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Ej. Lote A, Lote Palora Norte"
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-rose-600">{errors.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Superficie (ha) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={superficieHa}
                onChange={(e) => setSuperficieHa(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej. 2.50"
              />
              {errors.superficieHa && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.superficieHa}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número de plantas *
              </label>
              <input
                type="number"
                min="0"
                value={numeroPlantas}
                onChange={(e) => setNumeroPlantas(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ej. 1200"
              />
              {errors.numeroPlantas && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.numeroPlantas}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Fecha de siembra (opcional)
            </label>
            <input
              type="date"
              value={fechaSiembra}
              onChange={(e) => setFechaSiembra(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
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
              {saving ? "Guardando…" : "Guardar lote"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
