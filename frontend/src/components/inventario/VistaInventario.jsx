import { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Package,
  Settings,
  AlertTriangle,
  Eye,
  Pencil,
  XCircle,
  X,
  Layers
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

// --- HELPERS ---
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

function loteLabel(l) {
  const proveedor = l?.codigo_lote_proveedor;
  return proveedor ? `#${proveedor}` : "S/N";
}

function severityStock(item) {
  const actual = Number(item?.stock_actual ?? 0);
  const minimo = Number(item?.stock_minimo ?? 0);
  if (actual <= 0) return 2;
  if (actual < minimo) return 1; 
  return 0; 
}

export default function VistaInventario({
  categoria,
  activosFiltro = "true",
  onAjustar,
  onEditar,
  onEditarLote,
  modalEdicionAbierto,
}) {
  const {
    datos: items,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
  } = useListado(listarItemsInventario, { q: "", categoria, activos: activosFiltro, pageSize: 15 });

  // Estado para el modal de detalle de lotes
  const [itemVerLotes, setItemVerLotes] = useState(null);

  useEffect(() => {
    actualizarFiltro("categoria", categoria);
  }, [categoria]);

  useEffect(() => {
    actualizarFiltro("activos", activosFiltro);
  }, [activosFiltro]);

  const itemsOrdenados = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => {
      const sa = severityStock(a);
      const sb = severityStock(b);
      if (sb !== sa) return sb - sa;
      return String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es", { sensitivity: "base" });
    });
    return arr;
  }, [items]);

  // Manejador seguro para cerrar modal
  const handleCloseDetalle = () => {
    if (!modalEdicionAbierto) {
      setItemVerLotes(null);
    }
  };

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

      {/* Tabla */}
      <Tabla>
        <TablaCabecera>
          <TablaHead className="w-[30%] min-w-[220px]">Ítem</TablaHead>
          <TablaHead className="w-[12%] min-w-[100px]" align="right">Stock Total</TablaHead>
          <TablaHead className="w-[12%] min-w-[100px]" align="right">Stock mínimo</TablaHead>
          <TablaHead className="w-[8%] min-w-[80px]">Unidad</TablaHead>
          <TablaHead className="w-[10%] min-w-[100px]" align="center">Lotes</TablaHead>
          <TablaHead className="w-[10%] min-w-[100px]" align="center">Estado</TablaHead>
          <TablaHead className="w-[18%] min-w-[180px]" align="right">Acciones</TablaHead>
        </TablaCabecera>

        <TablaCuerpo>
          {cargando ? (
            [...Array(5)].map((_, i) => (
              <TablaFila key={i}>
                <TablaCelda colSpan={7} className="py-6">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                </TablaCelda>
              </TablaFila>
            ))
          ) : itemsOrdenados.length === 0 ? (
            <TablaVacia mensaje={`No hay ${categoria.toLowerCase()}s registrados.`} colSpan={7} />
          ) : (
            itemsOrdenados.map((item) => {
              const sev = severityStock(item);
              const esAgotado = sev === 2;
              const esBajo = sev === 1;
              const tieneLotes = Array.isArray(item.lotes) && item.lotes.length > 0;

              const rowCls = [
                "transition",
                esAgotado ? "bg-rose-50" : "",
                esBajo ? "bg-amber-50" : "",
                "hover:bg-slate-50/70",
              ].join(" ");

              const cellBorder = esAgotado
                ? "border-t border-rose-200"
                : esBajo
                ? "border-t border-amber-200"
                : "";

              return (
                <FragmentRow key={item.id}>
                  <TablaFila className={`${rowCls} ${cellBorder}`}>
                    <TablaCelda>
                      <div className="flex items-center gap-3">
                        {/* Botón para ver detalles (lotes) */}
                        <button
                          type="button"
                          onClick={() => tieneLotes && setItemVerLotes(item)}
                          disabled={!tieneLotes}
                          title={tieneLotes ? "Ver desglose de lotes" : "Sin lotes"}
                          className={[
                            "h-9 w-9 grid place-items-center rounded-xl border transition",
                            tieneLotes
                              ? "border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm"
                              : "border-slate-100 opacity-40 cursor-not-allowed bg-slate-50",
                          ].join(" ")}
                        >
                          <Eye size={18} />
                        </button>
                        
                        <div className={[
                            "p-2 rounded-lg",
                            esAgotado ? "bg-rose-100 text-rose-700" : "",
                            esBajo ? "bg-amber-100 text-amber-800" : "",
                            !esAgotado && !esBajo ? "bg-slate-50 text-slate-500" : "",
                          ].join(" ")}
                        >
                          {esAgotado ? <XCircle size={18} /> : esBajo ? <AlertTriangle size={18} /> : <Package size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className={["font-bold truncate", esAgotado ? "text-rose-800" : esBajo ? "text-amber-900" : "text-slate-800"].join(" ")}>
                            {item.nombre}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{item.tipo || "General"}</div>
                          {(esAgotado || esBajo) && (
                            <div className={["mt-1 text-[11px] font-black uppercase tracking-wide", esAgotado ? "text-rose-700" : "text-amber-800"].join(" ")}>
                              {esAgotado ? "STOCK AGOTADO" : "STOCK BAJO (REPOSICIÓN)"}
                            </div>
                          )}
                        </div>
                      </div>
                    </TablaCelda>

                    <TablaCelda align="right">
                      <span className={["font-mono font-black", esAgotado ? "text-rose-700" : esBajo ? "text-amber-800" : "text-slate-700"].join(" ")}>
                        {fmtQty(item.stock_actual)}
                      </span>
                    </TablaCelda>
                    <TablaCelda align="right">
                      <span className="font-mono font-bold text-slate-700">{fmtQty(item.stock_minimo)}</span>
                    </TablaCelda>
                    <TablaCelda>{item.unidad}</TablaCelda>
                    <TablaCelda align="center">
                      {tieneLotes ? (
                        <button
                          onClick={() => setItemVerLotes(item)}
                          className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 text-[11px] font-semibold border border-indigo-100 hover:bg-indigo-100 transition cursor-pointer"
                        >
                          {item.lotes.length} Lote(s)
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TablaCelda>
                    <TablaCelda align="center">
                      <Badge variante={item.activo ? "activo" : "inactivo"}>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TablaCelda>
                    <TablaCelda align="right">
                      <div className="inline-flex items-center gap-2">
                        <Boton
                          variante="fantasma"
                          onClick={() => onAjustar(item)}
                          className={[
                            "!px-3 !py-1.5 text-xs border-slate-200",
                            esAgotado ? "!border-rose-200 !bg-rose-100/50 hover:!bg-rose-100" : "",
                            esBajo ? "!border-amber-200 !bg-amber-100/50 hover:!bg-amber-100" : "",
                          ].join(" ")}
                        >
                          <Settings size={14} className="mr-1.5" /> Ajustar
                        </Boton>
                        <Boton
                          variante="fantasma"
                          onClick={() => onEditar?.(item)}
                          className="!px-3 !py-1.5 text-xs border-slate-200"
                        >
                          <Pencil size={14} className="mr-1.5" /> Editar
                        </Boton>
                      </div>
                    </TablaCelda>
                  </TablaFila>
                </FragmentRow>
              );
            })
          )}
        </TablaCuerpo>
      </Tabla>

      <Paginador
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        onCambiarPagina={setPagina}
      />

      {/* ✅ MODAL AUTÓNOMO: Detalle de Lotes */}
      {itemVerLotes && (
        <ModalDetalleLotes
          item={itemVerLotes}
          onClose={handleCloseDetalle}
          onEditarLote={onEditarLote}
        />
      )}

    </div>
  );
}

// --- SUB-COMPONENTE: MODAL DE DETALLE (Con nuevo diseño) ---
function ModalDetalleLotes({ item, onClose, onEditarLote }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      html.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const lotesOrdenados = useMemo(() => {
    return (item?.lotes || [])
      .slice()
      .sort((a, b) => {
        const da = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : 0;
        const db = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : 0;
        return da - db;
      });
  }, [item?.lotes]);

  const totalLotes = lotesOrdenados.reduce(
    (acc, l) => acc + (Number(l.cantidad_actual) || 0),
    0
  );

  const prox = lotesOrdenados.find((l) => !!l.fecha_vencimiento) || null;
  const proxVence = prox?.fecha_vencimiento ? fmtDate(prox.fecha_vencimiento) : "—";
  const proxLote = prox ? loteLabel(prox) : "—";

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm p-0 sm:p-4 flex sm:items-center sm:justify-center">
      <div ref={panelRef} className="w-full max-w-none sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)] bg-white shadow-[0_24px_60px_rgba(0,0,0,.18)] sm:rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
               <Layers size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Detalle de Lotes
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Desglose FEFO para: <span className="font-semibold text-slate-700">{item.nombre}</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Stock en Lotes
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                    {fmtQty(totalLotes)} <span className="text-sm font-normal text-slate-400">{item.unidad}</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Próximo Vencimiento
                    </div>
                    <div className={`text-xl font-bold ${prox ? "text-rose-600" : "text-slate-800"}`}>
                    {proxVence}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Lote FEFO (Prioritario)
                    </div>
                    <div>
                    <span className="inline-flex items-center rounded-lg bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 font-mono font-bold text-sm">
                        {proxLote}
                    </span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">Lote</th>
                        <th className="px-4 py-3">Proveedor</th>
                        <th className="px-4 py-3">Ingrediente activo</th>
                        <th className="px-4 py-3">Vencimiento</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                    {lotesOrdenados.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 font-mono text-xs font-bold">
                            {loteLabel(l)}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item?.proveedor || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item?.ingrediente_activo || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{fmtDate(l.fecha_vencimiento)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                            {fmtQty(l.cantidad_actual)} <span className="text-xs font-normal text-slate-400">{item.unidad}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <Boton
                            variante="fantasma"
                            size="sm"
                            className="border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                            onClick={() =>
                                onEditarLote?.({
                                lote: l,
                                item,
                                lotesExistentes: lotesOrdenados,
                                })
                            }
                            >
                            <Pencil size={14} className="mr-1.5" /> Editar
                            </Boton>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex justify-end gap-3">
            <Boton onClick={onClose} className="bg-slate-800 text-white hover:bg-slate-700">
              Cerrar Detalle
            </Boton>
          </div>
        </div>

      </div>
    </div>
  );
}

function FragmentRow({ children }) {
  return <>{children}</>;
}