// src/components/AjustarStockModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ajustarStock, editarItemInventario } from "../api/apiClient";

export default function AjustarStockModal({
  open,
  onClose,
  item,           // { id, nombre, categoria, unidad, stock_actual, stock_minimo, activo }
  unidades = [],
  onAdjusted,     // callback para recargar la lista
}) {
  const isInsumo = item?.categoria === "Insumo";
  const isHerramientaOEquipo = item && (item.categoria === "Herramienta" || item.categoria === "Equipo");

  const unidadesFiltradas = useMemo(() => {
    if (!unidades?.length) return [];
    if (isInsumo) {
      const permitidas = new Set(["kg", "g", "l", "ml", "gal"]);
      return unidades.filter(u => permitidas.has(u.codigo));
    }
    // Herramienta / Equipo -> solo "unidad"
    return unidades.filter(u => u.codigo === "unidad");
  }, [unidades, isInsumo]);

  const [ajuste, setAjuste] = useState({
    tipo: "AJUSTE_ENTRADA", // ENTRADA|SALIDA|AJUSTE_ENTRADA|AJUSTE_SALIDA|BAJA
    cantidad: "",
    unidad_codigo: "",
    motivo: "",
  });

  const [propsEdit, setPropsEdit] = useState({
    stock_minimo: 0,
    activo: true,
  });

  // Resetear al abrir
  useEffect(() => {
    if (!open || !item) return;

    setAjuste(a => ({
      ...a,
      tipo: "AJUSTE_ENTRADA",
      cantidad: "",
      // si el item tiene unidad conocida, úsala; si no, la primera válida
      unidad_codigo: item.unidad || unidadesFiltradas[0]?.codigo || "",
      motivo: "",
    }));

    setPropsEdit({
      stock_minimo: Number(item.stock_minimo ?? 0),
      activo: !!item.activo,
    });
  }, [open, item, unidadesFiltradas]);

  if (!open || !item) return null;

  const handleChangeAjuste = (e) => {
    const { name, value } = e.target;
    setAjuste(prev => ({ ...prev, [name]: value }));
  };

  const handleChangeProps = (e) => {
    const { name, value, type, checked } = e.target;
    setPropsEdit(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const doAjuste = async (e) => {
    e.preventDefault();
    try {
      if (!ajuste.unidad_codigo) {
        toast.error("Selecciona una unidad");
        return;
      }
      if (!ajuste.cantidad || Number(ajuste.cantidad) <= 0) {
        toast.error("Cantidad inválida");
        return;
      }

      await ajustarStock(item.id, {
        tipo: ajuste.tipo,
        cantidad: Number(ajuste.cantidad),
        unidad_codigo: ajuste.unidad_codigo,
        motivo: ajuste.motivo || undefined,
      });

      toast.success("Ajuste registrado ✅");
      onAdjusted?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo ajustar el stock";
      toast.error(msg);
      console.error(err);
    }
  };

  const guardarProps = async () => {
    try {
      await editarItemInventario(item.id, {
        stock_minimo: Number(propsEdit.stock_minimo),
        activo: !!propsEdit.activo,
      });
      toast.success("Propiedades guardadas ✅");
      onAdjusted?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo guardar";
      toast.error(msg);
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          Ajustar stock de <span className="font-bold">{item.nombre}</span>
        </h2>

        {/* Info actual */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="text-gray-500">Categoría</div>
            <div className="font-medium">{item.categoria}</div>
          </div>
          <div>
            <div className="text-gray-500">Unidad base</div>
            <div className="font-medium">{item.unidad}</div>
          </div>
          <div>
            <div className="text-gray-500">Stock actual</div>
            <div className="font-medium">{item.stock_actual}</div>
          </div>
          <div>
            <div className="text-gray-500">Mínimo</div>
            <div className="font-medium">{item.stock_minimo}</div>
          </div>
        </div>

        {/* Form de ajuste */}
        <form onSubmit={doAjuste} className="space-y-4 border-t pt-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium">Tipo de ajuste</label>
            <select
              name="tipo"
              value={ajuste.tipo}
              onChange={handleChangeAjuste}
              className="mt-1 block w-full border rounded-md p-2"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE_ENTRADA">Ajuste entrada</option>
              <option value="AJUSTE_SALIDA">Ajuste salida</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium">Cantidad</label>
            <input
              type="number"
              name="cantidad"
              value={ajuste.cantidad}
              onChange={handleChangeAjuste}
              min="0"
              step="0.001"
              className="mt-1 block w-full border rounded-md p-2"
              required
            />
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-sm font-medium">Unidad</label>
            <select
              name="unidad_codigo"
              value={ajuste.unidad_codigo}
              onChange={handleChangeAjuste}
              className="mt-1 block w-full border rounded-md p-2"
              disabled={isHerramientaOEquipo} // forzado a "unidad"
              required
            >
              <option value="">Selecciona unidad</option>
              {unidadesFiltradas.map((u) => (
                <option key={u.codigo} value={u.codigo}>
                  {u.nombre} ({u.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium">Motivo (opcional)</label>
            <textarea
              name="motivo"
              value={ajuste.motivo}
              onChange={handleChangeAjuste}
              className="mt-1 block w-full border rounded-md p-2"
              placeholder="Ej: compra adicional, pérdida, ajuste inventario…"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Confirmar
            </button>
          </div>
        </form>

        {/* Editar propiedades rápidas */}
        <div className="border-t mt-6 pt-4">
          <h3 className="font-semibold mb-2 text-sm">Propiedades del ítem</h3>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium">Stock mínimo</label>
              <input
                type="number"
                name="stock_minimo"
                value={propsEdit.stock_minimo}
                onChange={handleChangeProps}
                min="0"
                step="0.001"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                id="activoSwitch"
                type="checkbox"
                name="activo"
                checked={propsEdit.activo}
                onChange={handleChangeProps}
                className="h-4 w-4"
              />
              <label htmlFor="activoSwitch" className="text-sm">Activo</label>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={guardarProps}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Guardar propiedades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
