// src/components/InsumosRequerimientosModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";
import {
  listarInsumosTarea,
  configurarInsumosTarea,
  listarItemsInventario,
  listarRequerimientosTarea,
  configurarRequerimientos,
} from "../api/apiClient";

export default function InsumosRequerimientosModal({ tareaId, open, onClose, onSaved }) {
  const [tab, setTab] = useState("Insumo"); // Insumo | Herramienta | Equipo
  const [busqueda, setBusqueda] = useState("");
  const [inventario, setInventario] = useState([]);

  // estados internos
  const [insumos, setInsumos] = useState([]);
  const [reqHerr, setReqHerr] = useState([]); // [{item_id, nombre, cantidad}]
  const [reqEq, setReqEq] = useState([]);     // idem

  // carga inicial de insumos + requerimientos
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [iRes, rRes] = await Promise.all([
          listarInsumosTarea(tareaId),
          listarRequerimientosTarea(tareaId),
        ]);

        setInsumos(
          (iRes.data || []).map((i) => ({
            item_id: i.item_id,
            item: i.item,
            cantidad: Number(i.cantidad),
            unidad: i.unidad,
          }))
        );

        const reqs = rRes?.data || [];
        setReqHerr(
          reqs
            .filter((r) => r.categoria === "Herramienta")
            .map((r) => ({ item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1 }))
        );
        setReqEq(
          reqs
            .filter((r) => r.categoria === "Equipo")
            .map((r) => ({ item_id: r.item_id, nombre: r.item, cantidad: Number(r.cantidad) || 1 }))
        );
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar insumos/requerimientos");
      }
    })();
  }, [open, tareaId]);

  // inventario por pestaña
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const invRes = await listarItemsInventario({ categoria: tab, activos: true });
        setInventario(invRes.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [open, tab]);

  const filtered = useMemo(
    () => (inventario || []).filter((i) =>
      i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    ),
    [inventario, busqueda]
  );

  const agregarItem = (it) => {
    if (tab === "Insumo") {
      if (insumos.some((x) => x.item_id === it.id)) return;
      setInsumos((prev) => [
        ...prev,
        {
          item_id: it.id,
          item: it.nombre,
          cantidad: 1,
          unidad: it.unidad,
        },
      ]);
    } else if (tab === "Herramienta") {
      if (reqHerr.some((x) => x.item_id === it.id)) return;
      setReqHerr((p) => [...p, { item_id: it.id, nombre: it.nombre, cantidad: 1 }]);
    } else {
      if (reqEq.some((x) => x.item_id === it.id)) return;
      setReqEq((p) => [...p, { item_id: it.id, nombre: it.nombre, cantidad: 1 }]);
    }
  };

  const guardarTodo = async () => {
    try {
      // 1) requerimientos (herramienta/equipo)
      const payloadReq = {
        requerimientos: [
          ...reqHerr.map((r) => ({
            item_id: r.item_id,
            categoria: "Herramienta",
            cantidad: Number(r.cantidad) || 1,
            unidad_codigo: "unidad",
          })),
          ...reqEq.map((r) => ({
            item_id: r.item_id,
            categoria: "Equipo",
            cantidad: Number(r.cantidad) || 1,
            unidad_codigo: "unidad",
          })),
        ],
      };
      await configurarRequerimientos(tareaId, payloadReq);

      // 2) insumos
      const payloadIns = {
        insumos: insumos.map((i) => ({
          item_id: i.item_id,
          cantidad: Number(i.cantidad),
          unidad_codigo: i.unidad,
        })),
      };
      await configurarInsumosTarea(tareaId, payloadIns);

      toast.success("Insumos y requerimientos guardados ✅");
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "No se pudo guardar");
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-5xl">
      <h3 className="font-semibold text-lg mb-3">Insumos y herramientas de la tarea</h3>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {["Insumo", "Herramienta", "Equipo"].map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`px-3 py-1.5 rounded border text-sm ${
              tab === c ? "bg-blue-50 border-blue-400" : "bg-white border-gray-300"
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
        className="w-full border rounded p-2 text-sm mb-3"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventario */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">
            {tab === "Insumo"
              ? "Inventario de insumos"
              : tab === "Herramienta"
              ? "Inventario de herramientas"
              : "Inventario de equipos"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Nombre</th>
                  {tab === "Insumo" && (
                    <>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-left">Formulación</th>
                      <th className="p-2 text-left">Proveedor</th>
                    </>
                  )}
                  <th className="p-2 text-right">Disponible</th>
                  <th className="p-2 text-left">Unidad</th>
                  <th className="p-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const disabled =
                    (tab === "Insumo" && insumos.some((x) => x.item_id === i.id)) ||
                    (tab === "Herramienta" && reqHerr.some((x) => x.item_id === i.id)) ||
                    (tab === "Equipo" && reqEq.some((x) => x.item_id === i.id));
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="p-2">{i.id}</td>
                      <td className="p-2">{i.nombre}</td>
                      {tab === "Insumo" && (
                        <>
                          <td className="p-2">{i.tipo || "—"}</td>
                          <td className="p-2">{i.formulacion || "—"}</td>
                          <td className="p-2">{i.proveedor || "—"}</td>
                        </>
                      )}
                      <td className="p-2 text-right">{Number(i.stock_actual).toLocaleString()}</td>
                      <td className="p-2">{i.unidad || "—"}</td>
                      <td className="p-2 text-right">
                        <button
                          className={`px-2 py-1 rounded text-sm ${
                            disabled
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                          disabled={disabled}
                          onClick={() => agregarItem(i)}
                        >
                          Agregar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={tab === "Insumo" ? 8 : 6}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seleccionados */}
        <div className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">
            {tab === "Insumo"
              ? "Insumos asignados a la tarea"
              : tab === "Herramienta"
              ? "Herramientas requeridas"
              : "Equipos requeridos"}
          </div>

          {tab === "Insumo" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Insumo</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-left">Unidad</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((i) => (
                    <tr key={i.item_id} className="border-t">
                      <td className="p-2">{i.item}</td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={i.cantidad}
                          onChange={(e) =>
                            setInsumos((prev) =>
                              prev.map((x) =>
                                x.item_id === i.item_id ? { ...x, cantidad: Number(e.target.value) } : x
                              )
                            )
                          }
                          className="w-24 border rounded p-1 text-sm text-right"
                        />
                      </td>
                      <td className="p-2">{i.unidad}</td>
                      <td className="p-2 text-right">
                        <button
                          className="px-2 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => setInsumos((p) => p.filter((x) => x.item_id !== i.item_id))}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {insumos.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={4}>
                        No hay insumos seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-right">Cantidad</th>
                    <th className="p-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "Herramienta" ? reqHerr : reqEq).map((r) => (
                    <tr key={`${tab}-${r.item_id}`} className="border-t">
                      <td className="p-2">{r.item_id}</td>
                      <td className="p-2">{r.nombre}</td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={r.cantidad}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            if (tab === "Herramienta") {
                              setReqHerr((p) => p.map((x) => (x.item_id === r.item_id ? { ...x, cantidad: v } : x)));
                            } else {
                              setReqEq((p) => p.map((x) => (x.item_id === r.item_id ? { ...x, cantidad: v } : x)));
                            }
                          }}
                          className="w-20 border rounded p-1 text-sm text-right"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <button
                          className="px-2 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() =>
                            tab === "Herramienta"
                              ? setReqHerr((p) => p.filter((x) => x.item_id !== r.item_id))
                              : setReqEq((p) => p.filter((x) => x.item_id !== r.item_id))
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(tab === "Herramienta" ? reqHerr : reqEq).length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={4}>
                        No hay requerimientos configurados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="px-3 py-2 text-[11px] text-gray-500">
                * Herramientas y equipos no consumen stock al guardar; el consumo ocurre al verificar la tarea.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end mt-4">
        <button onClick={guardarTodo} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Guardar
        </button>
      </div>
    </Modal>
  );
}
