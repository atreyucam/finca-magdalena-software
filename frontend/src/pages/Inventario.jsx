// src/pages/Inventario.jsx
import { useEffect, useState, useMemo } from "react";
import {
  listarItemsInventario,
  listarMovimientosInventario,
  alertasStockBajo,
  editarItemInventario,
} from "../api/apiClient";
import toast from "react-hot-toast";
import CrearItemModal from "../components/CrearItemModal";
import AjustarStockModal from "../components/AjustarStockModal";
import useUnidades from "../hooks/useUnidades";

export default function Inventario() {
  const [tab, setTab] = useState(() => {
  if (typeof window === "undefined") return "Insumo";
  return localStorage.getItem("inventarioTab") || "Insumo";
}); // Insumo | Herramienta | Equipo | Historial

  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [showCrearItem, setShowCrearItem] = useState(false);
  const [showAjustar, setShowAjustar] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { unidades } = useUnidades();

  const [filtroActivos, setFiltroActivos] = useState("all"); // "true" | "false" | "all"

  // —— estilos compartidos
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-700";
  const btnGhost =
    "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

  const cargar = async () => {
    try {
      if (tab === "Historial") {
        const res = await listarMovimientosInventario({ pageSize: 50 });
        setMovimientos(res.data?.data || []);
      } else {
        const params = { categoria: tab, q: busqueda };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, busqueda, filtroActivos]);
  useEffect(() => {
  if (typeof window === "undefined") return;
  localStorage.setItem("inventarioTab", tab);
}, [tab]);


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

  // para mostrar total por pestaña arriba
  const headerBadge = useMemo(() => {
    if (tab === "Historial") return movimientos.length;
    return items.length;
  }, [tab, items.length, movimientos.length]);

  return (
    // Fondo gris y padding consistente con “Usuarios”
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Card contenedora */}
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Inventario <span className="text-slate-400 text-base font-medium">({headerBadge})</span>
            </h1>
            <p className="text-slate-500">Insumos, herramientas y equipos.</p>
          </div>

          {tab !== "Historial" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCrearItem(true)}
                className={btnPrimary}
              >
                Nuevo ítem
              </button>
            </div>
          )}
        </div>
{/* Tabs: segmented control */}
<div className="mb-2">
  <h2 className="text-md font-semibold text-slate-600">Categorías</h2>
</div>

<div className="mb-6 flex items-center gap-3">
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-1 inline-flex">
    {["Insumo", "Herramienta", "Equipo", "Historial"].map((t) => (
      <button
        key={t}
        onClick={() => setTab(t)}
        className={[
          "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
          tab === t
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-800",
        ].join(" ")}
      >
        {t}
      </button>
    ))}
  </div>
</div>


        {/* Acciones / filtros (no en Historial) */}
        {tab !== "Historial" && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre…"
                className={inputBase}
              />
              <select
                value={filtroActivos}
                onChange={(e) => setFiltroActivos(e.target.value)}
                className={inputBase}
                title="Estado"
              >
                <option value="all">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>
        )}

        {/* Alertas de stock bajo */}
        {tab !== "Historial" && alertas.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 text-amber-800 font-semibold">
              ⚠️ Alertas de stock bajo
            </div>
            <ul className="grid gap-1 text-sm text-amber-800 sm:grid-cols-2 lg:grid-cols-3">
              {alertas.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="truncate">
                    {a.nombre}
                    <span className="text-slate-500"> — mín {a.stock_minimo}</span>
                  </span>
                  <span className="ml-3 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                    {a.stock_actual} {a.unidad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tablas */}
        {tab === "Historial" ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Ítem</th>
                  <th className="px-4 py-3 text-left font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-left font-medium">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium">Stock resultante</th>
                  <th className="px-4 py-3 text-left font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movimientos.map((m) => (
                  <tr key={m.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(m.fecha).toLocaleString()}</td>
                    <td className="px-4 py-3">{m.tipo}</td>
                    <td className="px-4 py-3">{m.item}</td>
                    <td className="px-4 py-3">{m.cantidad}</td>
                    <td className="px-4 py-3">{m.unidad}</td>
                    <td className="px-4 py-3">{m.stock_resultante}</td>
                    <td className="px-4 py-3">{m.motivo || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium">Mínimo</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((i) => {
                  const low = Number(i.stock_actual) < Number(i.stock_minimo);
                  return (
                    <tr key={i.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{i.nombre}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800">{i.stock_actual}</span>
                          {low && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Bajo stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700">{i.unidad}</td>
                      <td className="px-4 py-3 text-slate-700">{i.stock_minimo}</td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            i.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700",
                          ].join(" ")}
                        >
                          {i.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(i);
                              setShowAjustar(true);
                            }}
                            className={btnGhost}
                          >
                            Ajustar
                          </button>

                          <button
                            onClick={() => toggleActivo(i)}
                            className={[
                              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
                              i.activo
                                ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                : "bg-emerald-600 text-white hover:bg-emerald-700",
                            ].join(" ")}
                            title={i.activo ? "Desactivar" : "Activar"}
                          >
                            {i.activo ? "Desactivar" : "Activar"}
                          </button>

                          {tab === "Herramienta" && (
                            <>
                              <button
                                onClick={() => toast("Abrir modal Prestar")}
                                className="inline-flex items-center justify-center rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
                              >
                                Prestar
                              </button>
                              <button
                                onClick={() => toast("Abrir modal Devolver")}
                                className="inline-flex items-center justify-center rounded-xl bg-violet-100 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-200"
                              >
                                Devolver
                              </button>
                            </>
                          )}
                        </div>
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
      </div>
    </section>
  );
}
