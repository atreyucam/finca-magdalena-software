// src/components/InsumosRequerimientosModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import {
  listarItemsInventario,
  listarTareaItems,      // GET /tareas/:id/items
  configurarTareaItems, // POST /tareas/:id/items
} from "../api/apiClient";

const inputNumber =
  "w-24 border rounded p-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-300";

export default function InsumosRequerimientosModal({ tareaId, open, onClose, onSaved }) {
  const [tab, setTab] = useState("Insumo"); // 'Insumo' | 'Herramienta' | 'Equipo'
  const [busqueda, setBusqueda] = useState("");
  const [inventario, setInventario] = useState([]);

  // items unificados de la tarea
  const [items, setItems] = useState([]); // {id?, item_id, nombre, categoria, unidad, cantidad_planificada}

  // ---- cargar items actuales cuando se abre ----
  useEffect(() => {
    if (!open || !tareaId) return;
    (async () => {
      try {
        const res = await listarTareaItems(tareaId);
        const data = res.data || res.data?.data || [];
        setItems(
          (data || []).map((i) => ({
            id: i.id,
            item_id: i.item_id,
            nombre: i.nombre,
            categoria: i.categoria,
            unidad: i.unidad, // código de unidad
            cantidad_planificada: Number(i.cantidad_planificada) || 0,
          }))
        );
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar los ítems de la tarea");
      }
    })();
  }, [open, tareaId]);

  // ---- cargar inventario según tab ----
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await listarItemsInventario({
          categoria: tab,
          activos: true,
        });
        setInventario(res.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open, tab]);

  const filteredInventario = useMemo(
    () =>
      (inventario || []).filter((i) =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [inventario, busqueda]
  );

  // helpers derivados
  const itemsInsumo = useMemo(
    () => items.filter((i) => i.categoria === "Insumo"),
    [items]
  );
  const itemsHerr = useMemo(
    () => items.filter((i) => i.categoria === "Herramienta"),
    [items]
  );
  const itemsEq = useMemo(
    () => items.filter((i) => i.categoria === "Equipo"),
    [items]
  );

  const yaExiste = (itemId, categoria) =>
    items.some((i) => i.item_id === itemId && i.categoria === categoria);

  const agregarItem = (it) => {
    const categoria = tab; // actual
    if (yaExiste(it.id, categoria)) return;

    setItems((prev) => [
      ...prev,
      {
        item_id: it.id,
        nombre: it.nombre,
        categoria,
        unidad: it.unidad || it.unidad_codigo || "UND",
        cantidad_planificada: categoria === "Insumo" ? 1 : 1,
      },
    ]);
  };

  const actualizarCantidad = (itemId, categoria, valor) => {
    const num = Number(valor);
    setItems((prev) =>
      prev.map((i) =>
        i.item_id === itemId && i.categoria === categoria
          ? { ...i, cantidad_planificada: num >= 0 ? num : 0 }
          : i
      )
    );
  };

  const eliminarItem = (itemId, categoria) => {
    setItems((prev) =>
      prev.filter(
        (i) => !(i.item_id === itemId && i.categoria === categoria)
      )
    );
  };

  const guardarTodo = async () => {
    try {
      const payload = {
        items: items
          .map((i, idx) => ({
            item_id: i.item_id,
            categoria: i.categoria,
            cantidad_planificada: Number(i.cantidad_planificada) || 0,
            unidad_codigo: i.unidad || "UND",
            idx,
          }))
          .filter((i) => i.cantidad_planificada > 0),
      };

      await configurarTareaItems(tareaId, payload);
      toast.success("Ítems de tarea guardados ✅");
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || "No se pudieron guardar los ítems"
      );
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
      <h3 className="font-semibold text-lg mb-3">
        Insumos, herramientas y equipos de la tarea
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {["Insumo", "Herramienta", "Equipo"].map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`px-3 py-1.5 rounded-xl border text-sm ${
              tab === c
                ? "bg-sky-50 border-sky-400 text-sky-800"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Buscador */}
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={`Buscar ${tab.toLowerCase()}…`}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventario */}
        <div className="border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium bg-slate-50 border-b">
            {tab === "Insumo"
              ? "Inventario de insumos"
              : tab === "Herramienta"
              ? "Inventario de herramientas"
              : "Inventario de equipos"}
          </div>
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-right">Disponible</th>
                  <th className="p-2 text-left">Unidad</th>
                  <th className="p-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventario.map((i) => {
                  const disabled = yaExiste(i.id, tab);
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="p-2">{i.id}</td>
                      <td className="p-2">{i.nombre}</td>
                      <td className="p-2 text-right">
                        {Number(i.stock_actual ?? 0).toLocaleString()}
                      </td>
                      <td className="p-2">{i.unidad || i.unidad_codigo || "—"}</td>
                      <td className="p-2 text-right">
                        <button
                          className={`px-2 py-1 rounded text-xs ${
                            disabled
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                          disabled={disabled}
                          onClick={() => agregarItem(i)}
                        >
                          {disabled ? "Agregado" : "Agregar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredInventario.length === 0 && (
                  <tr>
                    <td
                      className="p-3 text-center text-slate-500"
                      colSpan={5}
                    >
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seleccionados */}
        <div className="border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium bg-slate-50 border-b">
            {tab === "Insumo"
              ? "Insumos planificados"
              : tab === "Herramienta"
              ? "Herramientas requeridas"
              : "Equipos requeridos"}
          </div>

          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-right">Cantidad</th>
                  <th className="p-2 text-left">
                    {tab === "Insumo" ? "Unidad" : ""}
                  </th>
                  <th className="p-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "Insumo"
                  ? itemsInsumo
                  : tab === "Herramienta"
                  ? itemsHerr
                  : itemsEq
                ).map((i) => (
                  <tr
                    key={`${i.categoria}-${i.item_id}`}
                    className="border-t"
                  >
                    <td className="p-2">{i.nombre}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min={tab === "Insumo" ? "0.001" : "1"}
                        step={tab === "Insumo" ? "0.001" : "1"}
                        value={
                          i.cantidad_planificada === 0
                            ? ""
                            : i.cantidad_planificada
                        }
                        onChange={(e) =>
                          actualizarCantidad(
                            i.item_id,
                            i.categoria,
                            e.target.value
                          )
                        }
                        className={inputNumber}
                      />
                    </td>
                    <td className="p-2 text-left">
                      {tab === "Insumo" ? i.unidad || "—" : ""}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        className="px-2 py-1 rounded text-xs bg-rose-50 text-rose-700 hover:bg-rose-100"
                        onClick={() => eliminarItem(i.item_id, i.categoria)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {(
                  tab === "Insumo"
                    ? itemsInsumo
                    : tab === "Herramienta"
                    ? itemsHerr
                    : itemsEq
                ).length === 0 && (
                  <tr>
                    <td
                      className="p-3 text-center text-slate-500"
                      colSpan={4}
                    >
                      No hay ítems configurados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-3 py-2 text-[10px] text-slate-500">
              * Los insumos reservan stock al guardar; el consumo real se
              registra al verificar la tarea. Herramientas/equipos no mueven
              stock automáticamente.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          onClick={guardarTodo}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
        >
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}
