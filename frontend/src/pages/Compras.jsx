import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Search } from "lucide-react";
import { listarCompras } from "../api/apiClient";
import useListado from "../hooks/useListado";
import Input from "../components/ui/Input";
import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import Paginador from "../components/ui/Paginador";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

function fmtMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC");
}

export default function Compras() {
  const navigate = useNavigate();
  const {
    datos: compras,
    cargando,
    pagina,
    setPagina,
    totalPaginas,
    totalRegistros,
    filtros,
    actualizarFiltro,
  } = useListado(listarCompras, {
    q: "",
    desde: "",
    hasta: "",
    pageSize: 15,
  });

  const lista = useMemo(() => (Array.isArray(compras) ? compras : []), [compras]);

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compras</h1>
            <p className="text-slate-500 font-medium">
              Registro formal de entradas de stock por factura.
            </p>
          </div>
          <Boton onClick={() => navigate("/owner/compras/nueva")} icono={Plus}>
            Nueva compra
          </Boton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Input
            icono={Search}
            label="Buscar"
            placeholder="Factura o proveedor..."
            value={filtros.q}
            onChange={(e) => actualizarFiltro("q", e.target.value)}
          />
          <Input
            label="Desde"
            type="date"
            value={filtros.desde}
            onChange={(e) => actualizarFiltro("desde", e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={filtros.hasta}
            onChange={(e) => actualizarFiltro("hasta", e.target.value)}
          />
        </div>

        <Tabla>
          <TablaCabecera>
            <TablaHead className="w-16">N°</TablaHead>
            <TablaHead>Factura</TablaHead>
            <TablaHead>Fecha</TablaHead>
            <TablaHead>Proveedor</TablaHead>
            <TablaHead align="right">Subtotal</TablaHead>
            <TablaHead align="right">Total</TablaHead>
            <TablaHead align="center">Estado</TablaHead>
            <TablaHead align="right">Acciones</TablaHead>
          </TablaCabecera>

          <TablaCuerpo>
            {cargando ? (
              [...Array(6)].map((_, i) => (
                <TablaFila key={i}>
                  <TablaCelda colSpan={8} className="py-6">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </TablaCelda>
                </TablaFila>
              ))
            ) : lista.length === 0 ? (
              <TablaVacia mensaje="No hay compras registradas." colSpan={8} />
            ) : (
              lista.map((c, idx) => (
                <TablaFila key={c.id}>
                  <TablaCelda className="font-mono text-xs text-slate-500">
                    {(pagina - 1) * 15 + idx + 1}
                  </TablaCelda>
                  <TablaCelda className="font-semibold text-slate-800">{c.numero_factura}</TablaCelda>
                  <TablaCelda>{fmtDate(c.fecha_compra)}</TablaCelda>
                  <TablaCelda>{c.proveedor?.nombre || "—"}</TablaCelda>
                  <TablaCelda align="right" className="font-mono">
                    {fmtMoney(c.subtotal)}
                  </TablaCelda>
                  <TablaCelda align="right" className="font-mono font-bold text-slate-900">
                    {fmtMoney(c.total)}
                  </TablaCelda>
                  <TablaCelda align="center">
                    <Badge variante="confirmada">{c.estado}</Badge>
                  </TablaCelda>
                  <TablaCelda align="right">
                    <Boton
                      variante="fantasma"
                      className="!px-3 !py-1.5 text-xs border-slate-200"
                      onClick={() => navigate(`/owner/compras/${c.id}`)}
                    >
                      <Eye size={14} className="mr-1.5" />
                      Ver detalle
                    </Boton>
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>

        <Paginador
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          onCambiarPagina={setPagina}
          totalRegistros={totalRegistros}
          mostrarSiempre
        />
      </div>
    </section>
  );
}
