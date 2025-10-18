import { useEffect, useMemo, useRef, useState } from "react";
import { crearItemInventario } from "../api/apiClient";
import toast from "react-hot-toast";
import { X } from "lucide-react";

const UNIDADES_INSUMO = ["kg", "g", "l", "ml", "gal"];
const UNIDADES_PZA = ["unidad"]; // para Herramienta y Equipo

export default function CrearItemModal({ open, onClose, onCreated, unidades = [] }) {
  const panelRef = useRef(null);

  const [form, setForm] = useState({
    nombre: "",
    categoria: "Insumo", // Insumo | Herramienta | Equipo
    unidad_codigo: "",
    stock_inicial: 0,
    stock_minimo: 0,
    activo: true,
  });

  // meta SOLO para insumo
  const [metaInsumo, setMetaInsumo] = useState({
    tipo: "",
    formulacion: "",
    proveedor: "",
    vencimiento: "", // YYYY-MM
  });

  // ===== estilos compartidos
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const textareaBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700 disabled:opacity-60";
  const btnGhost =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  // ===== unidades filtradas por categoría
  const unidadesFiltradas = useMemo(() => {
    const dict = new Map(unidades.map((u) => [u.codigo, u]));
    if (form.categoria === "Insumo") {
      return UNIDADES_INSUMO.map((c) => dict.get(c)).filter(Boolean);
    } else {
      return UNIDADES_PZA.map((c) => dict.get(c)).filter(Boolean);
    }
  }, [unidades, form.categoria]);

  // ===== reset al abrir
  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: "",
      categoria: "Insumo",
      unidad_codigo: "",
      stock_inicial: 0,
      stock_minimo: 0,
      activo: true,
    });
    setMetaInsumo({ tipo: "", formulacion: "", proveedor: "", vencimiento: "" });

    // enfoque inicial
    setTimeout(() => {
      panelRef.current?.querySelector("input[name='nombre']")?.focus();
    }, 0);
  }, [open]);

  // ===== unidad por defecto cuando cambian categoría/unidades
  useEffect(() => {
    if (!open) return;
    const first = unidadesFiltradas[0]?.codigo || "";
    setForm((prev) => ({ ...prev, unidad_codigo: first }));
  }, [open, unidadesFiltradas]);

  // ===== UX accesibilidad: cerrar con Esc / click fuera + bloquear scroll de fondo
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);

    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      html.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setMetaInsumo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.unidad_codigo) {
      toast.error("Primero carga las unidades desde el backend.");
      return;
    }

    try {
      const payload = { ...form };

      if (form.categoria === "Insumo") {
        const { tipo, formulacion, proveedor, vencimiento } = metaInsumo;
        payload.meta = {
          ...(tipo && { tipo }),
          ...(formulacion && { formulacion }),
          ...(proveedor && { proveedor }),
          ...(vencimiento && { vencimiento }),
        };
      }

      await crearItemInventario(payload);
      toast.success("Ítem creado con éxito ✅");
      onCreated?.();
      onClose?.();
    } catch (err) {
      console.error("Error creando ítem:", err);
      toast.error(err?.response?.data?.message || "No se pudo crear el ítem");
    }
  };

  if (!open) return null;

  const esInsumo = form.categoria === "Insumo";
  const sinUnidades = unidadesFiltradas.length === 0;

  return (
    // móvil: full-screen, desktop: centrado
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Crear nuevo ítem"
        className={[
          "w-full max-w-none sm:max-w-[min(720px,calc(100vw-1rem))]",
          "h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]",
          "rounded-none sm:rounded-2xl sm:border border-slate-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)]",
          "grid grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden",
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Crear nuevo ítem</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Registra insumos, herramientas o equipos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div
          className="min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {sinUnidades && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ No se encontraron unidades desde el backend. Verifica el endpoint
              <span className="font-mono"> /unidades</span>.
            </div>
          )}

          <form id="crearItemForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                className={`${inputBase} mt-1`}
                placeholder={esInsumo ? "Ej: SCORE" : "Ej: Machete"}
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Categoría</label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className={`${inputBase} mt-1`}
              >
                <option value="Insumo">Insumo</option>
                <option value="Herramienta">Herramienta</option>
                <option value="Equipo">Equipo</option>
              </select>
            </div>

            {/* Unidad */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Unidad</label>
              <select
                name="unidad_codigo"
                value={form.unidad_codigo}
                onChange={handleChange}
                required
                disabled={sinUnidades}
                className={`${inputBase} mt-1 disabled:bg-slate-100`}
              >
                {unidadesFiltradas.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    {u.nombre} ({u.codigo})
                  </option>
                ))}
              </select>
            </div>

            {/* Stock inicial / mínimo */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock inicial</label>
                <input
                  type="number"
                  name="stock_inicial"
                  value={form.stock_inicial}
                  onChange={handleChange}
                  min="0"
                  step="0.001"
                  className={`${inputBase} mt-1`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock mínimo</label>
                <input
                  type="number"
                  name="stock_minimo"
                  value={form.stock_minimo}
                  onChange={handleChange}
                  min="0"
                  step="0.001"
                  className={`${inputBase} mt-1`}
                />
              </div>
            </div>

            {/* Activo */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="activo"
                checked={form.activo}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
              />
              <label className="text-sm text-slate-700">Activo</label>
            </div>

            {/* Ficha del insumo (solo Insumo) */}
            {esInsumo && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Ficha del insumo</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tipo</label>
                    <input
                      name="tipo"
                      value={metaInsumo.tipo}
                      onChange={handleMetaChange}
                      className={`${inputBase} mt-1`}
                      placeholder="Fungicida agrícola"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Formulación</label>
                    <input
                      name="formulacion"
                      value={metaInsumo.formulacion}
                      onChange={handleMetaChange}
                      className={`${inputBase} mt-1`}
                      placeholder="EC, WG, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Proveedor</label>
                    <input
                      name="proveedor"
                      value={metaInsumo.proveedor}
                      onChange={handleMetaChange}
                      className={`${inputBase} mt-1`}
                      placeholder="Ecuaquímica"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Vencimiento</label>
                    <input
                      type="month"
                      name="vencimiento"
                      value={metaInsumo.vencimiento}
                      onChange={handleMetaChange}
                      className={`${inputBase} mt-1`}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer fijo */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-200 bg-white">
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" form="crearItemForm" disabled={sinUnidades} className={btnPrimary}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
