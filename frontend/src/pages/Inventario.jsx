// src/pages/Inventario.jsx
import { useEffect, useState } from "react";
import {
  listarItemsInventario,
  listarMovimientosInventario,
  alertasStockBajo,
  // 🔵 importar para activar/desactivar rápidamente
  editarItemInventario,
} from "../api/apiClient";
import toast from "react-hot-toast";
import CrearItemModal from "../components/CrearItemModal";
import AjustarStockModal from "../components/AjustarStockModal";
import useUnidades from "../hooks/useUnidades";

export default function Inventario() {
  const [tab, setTab] = useState("Insumo"); // Insumo | Herramienta | Equipo | Historial
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [showCrearItem, setShowCrearItem] = useState(false);
  const [showAjustar, setShowAjustar] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { unidades } = useUnidades();

  const [filtroActivos, setFiltroActivos] = useState("all"); // "true" | "false"

  const cargar = async () => {
    try {
      if (tab === "Historial") {
        const res = await listarMovimientosInventario({ pageSize: 50 });
        setMovimientos(res.data?.data || []);
      } else {
        const params = { categoria: tab, q: busqueda };
        // 🔽 solo enviar cuando no es "all"
        if (filtroActivos !== "all") params.activos = filtroActivos;
        const res = await listarItemsInventario(params);
        setItems(res.data || []);
        const alertasRes = await alertasStockBajo();
        setAlertas(alertasRes.data || []);
      }
    } catch (err) {
      toast.error("No se pudo cargar inventario");
    }
  };

  useEffect(() => {
    cargar();
  }, [tab, busqueda, filtroActivos]);

  // 🔵 activar/desactivar sin abrir modal
  const toggleActivo = async (it) => {
    try {
      await editarItemInventario(it.id, { activo: !it.activo });
      toast.success(!it.activo ? "Ítem activado" : "Ítem desactivado");
      await cargar();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo actualizar el estado";
      toast.error(msg);
      console.error(err);
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Inventario</h1>
          <p className="text-gray-600 mb-4">Insumos, herramientas y equipos.</p>
          {tab !== "Historial" && (
            <button
              onClick={() => setShowCrearItem(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Nuevo ítem
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-4">
        {["Insumo", "Herramienta", "Equipo", "Historial"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 ${
              tab === t
                ? "border-b-2 border-blue-600 font-semibold"
                : "text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Header acciones */}
      {tab !== "Historial" && (
  <div className="flex justify-between items-center mb-4">
    <input
      type="text"
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      placeholder="Buscar..."
      className="border rounded p-2 w-64"
    />
    {/* 🔽 filtro de estado */}
    <select
      value={filtroActivos}
      onChange={(e) => setFiltroActivos(e.target.value)}
      className="border rounded p-2"
      title="Estado"
    >
      <option value="all">Todos</option>
      <option value="true">Activos</option>
      <option value="false">Inactivos</option>
    </select>
  </div>
)}


      {/* Alertas */}
      {tab !== "Historial" && alertas.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-red-600">⚠️ Alertas de stock bajo</h2>
          <ul className="list-disc pl-5 text-sm text-red-700">
            {alertas.map((a) => (
              <li key={a.id}>
                {a.nombre}: {a.stock_actual} {a.unidad} (mín {a.stock_minimo})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla principal */}
      {tab === "Historial" ? (
        // 👉 Tabla de movimientos
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Ítem</th>
                <th className="px-4 py-2">Cantidad</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Stock resultante</th>
                <th className="px-4 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(m.fecha).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{m.tipo}</td>
                  <td className="px-4 py-2">{m.item}</td>
                  <td className="px-4 py-2">{m.cantidad}</td>
                  <td className="px-4 py-2">{m.unidad}</td>
                  <td className="px-4 py-2">{m.stock_resultante}</td>
                  <td className="px-4 py-2">{m.motivo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // 👉 Tabla de items
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Mínimo</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = Number(i.stock_actual) < Number(i.stock_minimo); // 🔵 chip rojo
                return (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-2">{i.nombre}</td>

                    {/* Stock + chip rojo si está bajo */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{i.stock_actual}</span>
                        {low && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            Bajo stock
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2">{i.unidad}</td>
                    <td className="px-4 py-2">{i.stock_minimo}</td>

                    {/* Estado con colores */}
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          i.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {i.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => {
                          setSelectedItem(i);
                          setShowAjustar(true);
                        }}
                        className="px-2 py-1 bg-blue-200 rounded hover:bg-blue-300"
                      >
                        Ajustar
                      </button>

                      {/* 🔵 Botón rápido activar/desactivar */}
                      <button
                        onClick={() => toggleActivo(i)}
                        className={`px-2 py-1 rounded hover:opacity-90 ${
                          i.activo ? "bg-gray-200" : "bg-emerald-200"
                        }`}
                        title={i.activo ? "Desactivar" : "Activar"}
                      >
                        {i.activo ? "Desactivar" : "Activar"}
                      </button>

                      {/* (Opcional) acciones de herramienta */}
                      {tab === "Herramienta" && (
                        <>
                          <button
                            onClick={() => toast("Abrir modal Prestar")}
                            className="px-2 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
                          >
                            Prestar
                          </button>
                          <button
                            onClick={() => toast("Abrir modal Devolver")}
                            className="px-2 py-1 bg-purple-200 rounded hover:bg-purple-300"
                          >
                            Devolver
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      <CrearItemModal
        open={showCrearItem}
        onClose={() => setShowCrearItem(false)}
        onCreated={cargar}
        unidades={unidades}
      />
      <AjustarStockModal
        open={showAjustar}
        onClose={() => setShowAjustar(false)}
        item={selectedItem}
        unidades={unidades}
        onAdjusted={cargar}
      />
    </section>
  );
}
