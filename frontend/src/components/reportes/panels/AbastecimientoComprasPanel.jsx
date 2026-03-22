import { useEffect, useMemo, useState } from "react";
import { FileText, PackageSearch, Receipt, TrendingUp } from "lucide-react";

import { reporteAbastecimientoCompras } from "../../../api/apiClient";
import ReportPanelLayout from "../ui/ReportPanelLayout";
import ReportEmptyState from "../ui/ReportEmptyState";
import TarjetaDato from "../../ui/TarjetaDato";
import ApexChart from "../../ui/ApexChart";
import Badge from "../../ui/Badge";
import Paginador from "../../ui/Paginador";
import LimitacionesReporte from "../common/LimitacionesReporte";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../../ui/Tabla";

const money = (value) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(value || 0));

const number = (value, digits = 0) =>
  new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));

export default function AbastecimientoComprasPanel({ filters }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(filters || {});

  useEffect(() => {
    setPage(1);
  }, [filtersKey]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await reporteAbastecimientoCompras({
          finca_ids: (filters?.finca_ids || []).join(","),
          desde: filters?.desde,
          hasta: filters?.hasta,
          page,
          pageSize: 12,
        });
        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || "No se pudo cargar el reporte de compras.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [filters, page]);

  const proveedorOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 8, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: (data?.graficos?.compras_por_proveedor || []).map((item) => item.proveedor) },
      yaxis: { labels: { formatter: (value) => money(value) } },
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [data]
  );

  const evolucionOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      stroke: { curve: "smooth", width: 3 },
      dataLabels: { enabled: false },
      xaxis: { categories: (data?.graficos?.evolucion_por_fecha || []).map((item) => item.fecha) },
      yaxis: { labels: { formatter: (value) => money(value) } },
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [data]
  );

  const categoriaOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      labels: (data?.graficos?.monto_por_categoria || []).map((item) => item.categoria),
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [data]
  );

  return (
    <ReportPanelLayout
      title="Abastecimiento"
      description="Indicadores de gasto, proveedores e ítems comprados."
      meta={[
        { label: "Fincas", value: data?.meta?.fincas?.length || 0 },
        { label: "Rango", value: `${filters?.desde || "-"} — ${filters?.hasta || "-"}` },
      ]}
      wrapResults={false}
      resultsClassName="space-y-4"
    >
      {error ? <ReportEmptyState variant="error" title="No se pudo cargar compras">{error}</ReportEmptyState> : null}
      {loading && !data ? <ReportEmptyState variant="idle" title="Cargando compras">Consultando indicadores de abastecimiento.</ReportEmptyState> : null}
      {!loading && !error && !data ? <ReportEmptyState variant="empty" /> : null}

      {data ? (
        <>
          <LimitacionesReporte items={data?.meta?.limitaciones || []} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <TarjetaDato titulo="Monto comprado" valor={money(data.kpis.monto_total_comprado)} icono={Receipt} color="ambar" />
            <TarjetaDato titulo="Compras del período" valor={number(data.kpis.compras_periodo)} icono={FileText} color="azul" />
            <TarjetaDato titulo="Ticket promedio" valor={money(data.kpis.ticket_promedio)} icono={TrendingUp} color="violeta" />
            <TarjetaDato titulo="Proveedores activos" valor={number(data.kpis.proveedores_activos)} icono={PackageSearch} color="gris" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Compras por proveedor</div>
                <Badge variante="info">{(data.graficos.compras_por_proveedor || []).length}</Badge>
              </div>
              {(data.graficos.compras_por_proveedor || []).length ? (
                <ApexChart
                  type="bar"
                  height={300}
                  series={[{ name: "Monto", data: (data.graficos.compras_por_proveedor || []).map((item) => Number(item.monto_total || 0)) }]}
                  options={proveedorOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Evolución temporal</div>
                <Badge variante="info">{(data.graficos.evolucion_por_fecha || []).length}</Badge>
              </div>
              {(data.graficos.evolucion_por_fecha || []).length ? (
                <ApexChart
                  type="line"
                  height={300}
                  series={[{ name: "Monto comprado", data: (data.graficos.evolucion_por_fecha || []).map((item) => Number(item.monto_total || 0)) }]}
                  options={evolucionOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Monto por categoría</div>
                <Badge variante="info">{(data.graficos.monto_por_categoria || []).length}</Badge>
              </div>
              {(data.graficos.monto_por_categoria || []).length ? (
                <ApexChart
                  type="donut"
                  height={300}
                  series={(data.graficos.monto_por_categoria || []).map((item) => Number(item.monto_total || 0))}
                  options={categoriaOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top proveedores</div>
                <Badge variante="info">{(data.rankings.top_proveedores || []).length}</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Proveedor</TablaHead>
                  <TablaHead align="right">Compras</TablaHead>
                  <TablaHead align="right">Monto</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {(data.rankings.top_proveedores || []).length ? (
                    data.rankings.top_proveedores.map((item) => (
                      <TablaFila key={item.proveedor_id || item.proveedor}>
                        <TablaCelda className="font-semibold text-slate-900">{item.proveedor}</TablaCelda>
                        <TablaCelda align="right">{number(item.compras)}</TablaCelda>
                        <TablaCelda align="right">{money(item.monto_total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin proveedores en el rango." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top ítems por monto</div>
                <Badge variante="info">{(data.rankings.top_items_por_monto || []).length}</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Ítem</TablaHead>
                  <TablaHead>Categoría</TablaHead>
                  <TablaHead align="right">Monto</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {(data.rankings.top_items_por_monto || []).length ? (
                    data.rankings.top_items_por_monto.map((item) => (
                      <TablaFila key={item.item_id || item.item}>
                        <TablaCelda className="font-semibold text-slate-900">{item.item}</TablaCelda>
                        <TablaCelda>{item.categoria || "-"}</TablaCelda>
                        <TablaCelda align="right">{money(item.monto_total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin ítems comprados." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="font-extrabold text-slate-900">Detalle de compras</div>
              <Badge variante="info">Total: {data.tablas.compras.total}</Badge>
            </div>
            <Tabla className="border-0 shadow-none rounded-none">
              <TablaCabecera>
                <TablaHead>Fecha</TablaHead>
                <TablaHead>Factura</TablaHead>
                <TablaHead>Proveedor</TablaHead>
                <TablaHead>Usuario</TablaHead>
                <TablaHead align="right">Subtotal</TablaHead>
                <TablaHead align="right">Total</TablaHead>
              </TablaCabecera>
              <TablaCuerpo>
                {(data.tablas.compras.rows || []).length ? (
                  data.tablas.compras.rows.map((item) => (
                    <TablaFila key={item.id}>
                      <TablaCelda>{item.fecha_compra}</TablaCelda>
                      <TablaCelda className="font-semibold text-slate-900">{item.numero_factura}</TablaCelda>
                      <TablaCelda>{item.proveedor?.nombre || "-"}</TablaCelda>
                      <TablaCelda>{item.creador?.nombre || "-"}</TablaCelda>
                      <TablaCelda align="right">{money(item.subtotal)}</TablaCelda>
                      <TablaCelda align="right">{money(item.total)}</TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="No hay compras para mostrar." colSpan={6} />
                )}
              </TablaCuerpo>
            </Tabla>

            <Paginador
              paginaActual={data.tablas.compras.page}
              totalPaginas={data.tablas.compras.totalPages}
              totalRegistros={data.tablas.compras.total}
              onCambiarPagina={setPage}
              mostrarSiempre
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Variación de costos unitarios</div>
              <Badge variante="warning">Sin finca directa</Badge>
            </div>
            <Tabla>
              <TablaCabecera>
                <TablaHead>Ítem</TablaHead>
                <TablaHead>Categoría</TablaHead>
                <TablaHead align="right">Costo promedio</TablaHead>
                <TablaHead align="right">Último costo</TablaHead>
                <TablaHead align="right">Variación</TablaHead>
              </TablaCabecera>
              <TablaCuerpo>
                {(data.tablas.variacion_costos || []).length ? (
                  data.tablas.variacion_costos.map((item) => (
                    <TablaFila key={item.item_id || item.item}>
                      <TablaCelda className="font-semibold text-slate-900">{item.item}</TablaCelda>
                      <TablaCelda>{item.categoria || "-"}</TablaCelda>
                      <TablaCelda align="right">{number(item.costo_promedio_unitario, 4)}</TablaCelda>
                      <TablaCelda align="right">{number(item.ultimo_costo_unitario, 4)}</TablaCelda>
                      <TablaCelda align="right">
                        <Badge variante={Number(item.variacion_pct || 0) >= 0 ? "warning" : "info"}>
                          {number(item.variacion_pct, 2)}%
                        </Badge>
                      </TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="Sin variación de costos disponible." colSpan={5} />
                )}
              </TablaCuerpo>
            </Tabla>
          </div>
        </>
      ) : null}
    </ReportPanelLayout>
  );
}
