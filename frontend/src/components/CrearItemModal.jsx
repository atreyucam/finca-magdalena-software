import { useEffect, useMemo, useState } from "react";
import { crearItemInventario } from "../api/apiClient";
import toast from "react-hot-toast";

const UNIDADES_INSUMO = ["kg", "g", "l", "ml", "gal"];
const UNIDADES_PZA = ["unidad"]; // para Herramienta y Equipo

export default function CrearItemModal({ open, onClose, onCreated, unidades = [] }) {
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

  // Filtra las unidades que se pueden mostrar según la categoría
  const unidadesFiltradas = useMemo(() => {
    const dict = new Map(unidades.map(u => [u.codigo, u]));
    if (form.categoria === "Insumo") {
      return UNIDADES_INSUMO.map(c => dict.get(c)).filter(Boolean);
    } else {
      return UNIDADES_PZA.map(c => dict.get(c)).filter(Boolean);
    }
  }, [unidades, form.categoria]);

  // Set defaults al abrir o al cambiar de categoría
  useEffect(() => {
    if (!open) return;
    setForm(prev => ({
      ...prev,
      nombre: "",
      categoria: "Insumo",
      unidad_codigo: "", // se setea más abajo cuando haya unidades
      stock_inicial: 0,
      stock_minimo: 0,
      activo: true,
    }));
    setMetaInsumo({ tipo: "", formulacion: "", proveedor: "", vencimiento: "" });
  }, [open]);

  // cuando cambia la categoría o llegan unidades, fijamos la unidad por defecto
  useEffect(() => {
    if (!open) return;
    const first = unidadesFiltradas[0]?.codigo || "";
    setForm(prev => ({ ...prev, unidad_codigo: first }));
  }, [open, unidadesFiltradas]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleMetaChange = (e) => {
    const { name, value } = e.target;
    setMetaInsumo(prev => ({ ...prev, [name]: value }));
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
          ...(vencimiento && { vencimiento }) // ej: 2026-07
        };
      }

      await crearItemInventario(payload);
      toast.success("Ítem creado con éxito ✅");
      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Error creando ítem:", err);
      toast.error(err.response?.data?.message || "No se pudo crear el ítem");
    }
  };

  if (!open) return null;

  const esInsumo = form.categoria === "Insumo";
  const sinUnidades = unidadesFiltradas.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Crear nuevo ítem</h2>

        {sinUnidades && (
          <div className="mb-3 text-sm text-red-600">
            ⚠️ No se encontraron unidades desde el backend. Verifica el endpoint <code>/unidades</code>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="mt-1 block w-full border rounded-md p-2"
              placeholder={esInsumo ? "Ej: SCORE" : "Ej: Machete"}
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium">Categoría</label>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className="mt-1 block w-full border rounded-md p-2"
            >
              <option value="Insumo">Insumo</option>
              <option value="Herramienta">Herramienta</option>
              <option value="Equipo">Equipo</option>
            </select>
          </div>

          {/* Unidad (filtrada por categoría) */}
          <div>
            <label className="block text-sm font-medium">Unidad</label>
            <select
              name="unidad_codigo"
              value={form.unidad_codigo}
              onChange={handleChange}
              required
              disabled={sinUnidades}
              className="mt-1 block w-full border rounded-md p-2 disabled:bg-gray-100"
            >
              {unidadesFiltradas.map(u => (
                <option key={u.codigo} value={u.codigo}>
                  {u.nombre} ({u.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Stock inicial / mínimo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Stock inicial</label>
              <input
                type="number"
                name="stock_inicial"
                value={form.stock_inicial}
                onChange={handleChange}
                min="0"
                step="0.001"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock mínimo</label>
              <input
                type="number"
                name="stock_minimo"
                value={form.stock_minimo}
                onChange={handleChange}
                min="0"
                step="0.001"
                className="mt-1 block w-full border rounded-md p-2"
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
              className="h-4 w-4"
            />
            <label className="text-sm">Activo</label>
          </div>

          {/* Campos adicionales SOLO para Insumo */}
          {esInsumo && (
            <div className="border-t pt-3">
              <h3 className="text-sm font-semibold mb-2">Ficha del insumo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Tipo</label>
                  <input
                    name="tipo"
                    value={metaInsumo.tipo}
                    onChange={handleMetaChange}
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="Fungicida agrícola"
                  />
                </div>
                <div>
                  <label className="block text-sm">Formulación</label>
                  <input
                    name="formulacion"
                    value={metaInsumo.formulacion}
                    onChange={handleMetaChange}
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="EC, WG, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm">Proveedor</label>
                  <input
                    name="proveedor"
                    value={metaInsumo.proveedor}
                    onChange={handleMetaChange}
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="Ecuaquímica"
                  />
                </div>
                <div>
                  <label className="block text-sm">Vencimiento</label>
                  <input
                    type="month"
                    name="vencimiento"
                    value={metaInsumo.vencimiento}
                    onChange={handleMetaChange}
                    className="mt-1 w-full border rounded-md p-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sinUnidades}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
