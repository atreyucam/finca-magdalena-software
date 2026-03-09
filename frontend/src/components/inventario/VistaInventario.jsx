import { useEffect, useMemo } from "react";
import {
  Search,
  Package,
  Settings,
  AlertTriangle,
  Pencil,
  XCircle,
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

function fmtQty(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n ?? "0";
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

function severityStock(item) {
  const actual = Number(item?.stock_actual ?? 0);
  const minimo = Number(item?.stock_minimo ?? 0);
  if (actual <= 0) return 2;
  if (actual < minimo) return 1;
  return 0;
}

export default function VistaInventario({ categoria, activosFiltro = "true", onAjustar, onEditar }) {
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

  useEffect(() => {
    actualizarFiltro("categoria", categoria);
  }, [categoria, actualizarFiltro]);

  useEffect(() => {
    actualizarFiltro("activos", activosFiltro);
  }, [activosFiltro, actualizarFiltro]);

  const itemsOrdenados = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => {
      const sa = severityStock(a);
      const sb = severityStock(b);
      if (sb !== sa) return sb - sa;
      return String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es", {
        sensitivity: "base",
      });
    });
    return arr;
  }, [items]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
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

      <Tabla>
        <TablaCabecera>
          <TablaHead className="w-16">#</TablaHead>
          <TablaHead>Item</TablaHead>
          <TablaHead align="right">Stock total</TablaHead>
          <TablaHead align="right">Stock minimo</TablaHead>
          <TablaHead>Unidad</TablaHead>
          <TablaHead align="center">Estado</TablaHead>
          <TablaHead align="right">Acciones</TablaHead>
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
            itemsOrdenados.map((item, idx) => {
              const sev = severityStock(item);
              const esAgotado = sev === 2;
              const esBajo = sev === 1;

              const rowCls = [
                "transition",
                esAgotado ? "bg-rose-50" : "",
                esBajo ? "bg-amber-50" : "",
                "hover:bg-slate-50/70",
              ].join(" ");

              return (
                <TablaFila key={item.id} className={rowCls}>
                  <TablaCelda className="font-mono text-xs text-slate-500">
                    {(pagina - 1) * 15 + idx + 1}
                  </TablaCelda>
                  <TablaCelda>
                    <div className="flex items-center gap-3">
                      <div
                        className={[
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
                        {item.categoria === "Insumo" && item.fabricante ? (
                          <div className="text-xs text-slate-500 truncate">Fabricante: {item.fabricante}</div>
                        ) : null}
                      </div>
                    </div>
                  </TablaCelda>
                  <TablaCelda align="right">
                    <span className={["font-mono font-black", esAgotado ? "text-rose-700" : esBajo ? "text-amber-800" : "text-slate-700"].join(" ")}>
                      {fmtQty(item.stock_total ?? item.stock_actual)}
                    </span>
                  </TablaCelda>
                  <TablaCelda align="right">
                    <span className="font-mono font-bold text-slate-700">{fmtQty(item.stock_minimo)}</span>
                  </TablaCelda>
                  <TablaCelda>{item.unidad}</TablaCelda>
                  <TablaCelda align="center">
                    <Badge variante={item.activo ? "activo" : "inactivo"}>{item.activo ? "Activo" : "Inactivo"}</Badge>
                  </TablaCelda>
                  <TablaCelda align="right">
                    <div className="inline-flex items-center gap-2">
                      <Boton
                        variante="fantasma"
                        onClick={() => onAjustar(item)}
                        className={["!px-3 !py-1.5 text-xs border-slate-200", esAgotado ? "!border-rose-200 !bg-rose-100/50 hover:!bg-rose-100" : "", esBajo ? "!border-amber-200 !bg-amber-100/50 hover:!bg-amber-100" : ""].join(" ")}
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
              );
            })
          )}
        </TablaCuerpo>
      </Tabla>

      <Paginador paginaActual={pagina} totalPaginas={totalPaginas} totalRegistros={totalRegistros} onCambiarPagina={setPagina} />
    </div>
  );
}
