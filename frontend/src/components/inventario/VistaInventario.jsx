import { useEffect, useState } from "react";
import {
  Search,
  Package,
  Settings,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { listarItemsInventario } from "../../api/apiClient";
import useListado from "../../hooks/useListado";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../ui/Tabla";
import Paginador from "../ui/Paginador";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Boton from "../ui/Boton";

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toISOString().slice(0, 10);
}

function fmtQty(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n ?? "0";
  return num.toFixed(2);
}

// ✅ “campo completo” del lote: proveedor + sistema
function loteLabel(l) {
  const proveedor = l?.codigo_lote_proveedor;
  return proveedor ? `#${proveedor}` : "S/N";
}

export default function VistaInventario({ categoria, onAjustar }) {
  const {
    datos: items,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
  } = useListado(listarItemsInventario, { q: "", categoria, activos: "true" });

  // ✅ Solo 1 abierto a la vez (más limpio)
  const [openId, setOpenId] = useState(null);

  const toggleOpen = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    actualizarFiltro("categoria", categoria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  // ✅ Item abierto (para pintar FEFO fuera de la tabla)
  const itemAbierto = items?.find((x) => x.id === openId) || null;

  // ✅ Lotes ordenados del item abierto
  const lotesOrdenados = (itemAbierto?.lotes || [])
    .slice()
    .sort((a, b) => {
      const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : 0;
      const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : 0;
      return da - db;
    });

  const totalLotes = lotesOrdenados.reduce(
    (acc, l) => acc + (Number(l.cantidad_actual) || 0),
    0
  );

  const prox = lotesOrdenados.find((l) => !!l.fecha_vencimiento) || null;
  const proxVence = prox?.fecha_vencimiento ? fmtDate(prox.fecha_vencimiento) : "—";
  const proxLote = prox ? loteLabel(prox) : "—";

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            icono={Search}
            placeholder={`Buscar ${categoria.toLowerCase()}...`}
            value={filtros.q}
            onChange={(e) => actualizarFiltro("q", e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filtros.activos}
            onChange={(e) => actualizarFiltro("activos", e.target.value)}
          >
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {/* Tabla principal */}
      <Tabla>
        <TablaCabecera>
          <TablaHead>Ítem</TablaHead>
          <TablaHead align="right">Stock Total</TablaHead>
          <TablaHead>Unidad</TablaHead>
          <TablaHead align="center">Lotes</TablaHead>
          <TablaHead align="center">Estado</TablaHead>
          <TablaHead align="right">Acciones</TablaHead>
        </TablaCabecera>

        <TablaCuerpo>
          {cargando ? (
            [...Array(5)].map((_, i) => (
              <TablaFila key={i}>
                <TablaCelda colSpan={6} className="py-6">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                </TablaCelda>
              </TablaFila>
            ))
          ) : items.length === 0 ? (
            <TablaVacia
              mensaje={`No hay ${categoria.toLowerCase()}s registrados.`}
              colSpan={6}
            />
          ) : (
            items.map((item) => {
              const stockBajo = Number(item.stock_actual) < Number(item.stock_minimo);
              const tieneLotes = Array.isArray(item.lotes) && item.lotes.length > 0;
              const isOpen = openId === item.id;

              return (
                <TablaFila key={item.id}>
                  {/* Ítem */}
                  <TablaCelda>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => tieneLotes && toggleOpen(item.id)}
                        disabled={!tieneLotes}
                        className={[
                          "h-9 w-9 grid place-items-center rounded-xl border transition",
                          tieneLotes
                            ? "border-slate-200 hover:bg-white hover:shadow-sm"
                            : "border-slate-100 opacity-40 cursor-not-allowed",
                        ].join(" ")}
                        title={
                          tieneLotes
                            ? isOpen
                              ? "Ocultar lotes (FEFO)"
                              : "Ver lotes (FEFO)"
                            : "Sin lotes"
                        }
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      <div
                        className={`p-2 rounded-lg ${
                          stockBajo ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {stockBajo ? <AlertTriangle size={18} /> : <Package size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {item.nombre}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {item.tipo || "General"}
                        </div>
                      </div>
                    </div>
                  </TablaCelda>

                  {/* Stock */}
                  <TablaCelda align="right">
                    <span
                      className={`font-mono font-bold ${
                        stockBajo ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {fmtQty(item.stock_actual)}
                    </span>
                  </TablaCelda>

                  {/* Unidad */}
                  <TablaCelda>{item.unidad}</TablaCelda>

                  {/* Lotes */}
                  <TablaCelda align="center">
                    {tieneLotes ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 text-[11px] font-semibold border border-indigo-100">
                        {item.lotes.length} Lote(s)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TablaCelda>

                  {/* Estado */}
                  <TablaCelda align="center">
                    <Badge variante={item.activo ? "activo" : "inactivo"}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TablaCelda>

                  {/* Acciones */}
                  <TablaCelda align="right">
                    <div className="inline-flex items-center gap-2">
                      <Boton
                        variante="fantasma"
                        onClick={() => onAjustar(item)}
                        className="!px-3 !py-1.5 text-xs border-slate-200"
                      >
                        <Settings size={14} className="mr-1.5" /> Ajustar
                      </Boton>
                    </div>
                  </TablaCelda>
                </TablaFila>
              );
            })
          )}
        </TablaCuerpo>
      </Tabla>

      {/* ✅ FEFO FULL WIDTH fuera de la tabla (HTML válido) */}
      {itemAbierto && lotesOrdenados.length > 0 && (
        <div className="w-full px-2 sm:px-4 pb-6 pt-2">
          <div className="w-full max-w-6xl mx-auto">
            <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header + mini métricas */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Desglose por Lote (FEFO)
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {itemAbierto.nombre} · Ordenado por vencimiento
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto lg:min-w-[420px]">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Total lotes
                      </div>
                      <div className="mt-1 font-mono font-bold text-slate-800">
                        {fmtQty(totalLotes)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {itemAbierto.unidad || ""}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Próx. venc.
                      </div>
                      <div className="mt-1 font-mono font-bold text-slate-800">
                        {proxVence}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Lote FEFO
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 font-mono text-xs">
                          {proxLote}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla FEFO */}
              <div className="w-full overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-slate-500">
                      <th className="px-4 py-3 text-left font-semibold">
                        Lote (Proveedor · Sistema)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Vencimiento
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Cantidad
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {lotesOrdenados.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 font-mono text-xs">
                            {loteLabel(l)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {fmtDate(l.fecha_vencimiento)}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {fmtQty(l.cantidad_actual)}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            {itemAbierto.unidad || ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Total
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {fmtQty(totalLotes)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          {itemAbierto.unidad || ""}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <Paginador
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        onCambiarPagina={setPagina}
      />
    </div>
  );
}
