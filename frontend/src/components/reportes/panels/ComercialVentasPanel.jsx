import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Clock3, ShoppingCart, Users } from "lucide-react";

import { reporteComercialVentas } from "../../../api/apiClient";
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

export default function ComercialVentasPanel({ filters }) {
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
        const payload = await reporteComercialVentas({
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
        setError(err?.response?.data?.message || err?.message || "No se pudo cargar el reporte comercial.");
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

  const estadoOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      labels: (data?.graficos?.ventas_por_estado || []).map((item) => item.estado),
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
    }),
    [data]
  );

  const fincaOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 8, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: (data?.graficos?.ventas_por_finca || []).map((item) => item.finca) },
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

  return (
    <ReportPanelLayout
      title="Comercial"
      description="Indicadores, rankings y detalle operativo de ventas."
      meta={[
        { label: "Fincas", value: data?.meta?.fincas?.length || 0 },
        { label: "Rango", value: `${filters?.desde || "-"} — ${filters?.hasta || "-"}` },
      ]}
      wrapResults={false}
      resultsClassName="space-y-4"
    >
      {error ? <ReportEmptyState variant="error" title="No se pudo cargar ventas">{error}</ReportEmptyState> : null}
      {loading && !data ? <ReportEmptyState variant="idle" title="Cargando ventas">Consultando indicadores comerciales.</ReportEmptyState> : null}
      {!loading && !error && !data ? <ReportEmptyState variant="empty" /> : null}

      {data ? (
        <>
          <LimitacionesReporte items={data?.meta?.limitaciones || []} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <TarjetaDato titulo="Total vendido" valor={money(data.kpis.total_vendido)} icono={CircleDollarSign} color="verde" />
            <TarjetaDato titulo="Ventas del período" valor={number(data.kpis.ventas_periodo)} icono={ShoppingCart} color="azul" />
            <TarjetaDato titulo="Ticket promedio" valor={money(data.kpis.ticket_promedio)} icono={CircleDollarSign} color="violeta" />
            <TarjetaDato titulo="Clientes únicos" valor={number(data.kpis.clientes_unicos)} icono={Users} color="gris" />
            <TarjetaDato titulo="Pendientes de liquidar" valor={number(data.kpis.ventas_pendientes_liquidar)} icono={Clock3} color="ambar" />
            <TarjetaDato titulo="Pendientes de pago" valor={number(data.kpis.ventas_liquidadas_pendientes_pago)} icono={Clock3} color="ambar" />
            <TarjetaDato titulo="Ventas pagadas" valor={number(data.kpis.ventas_pagadas)} icono={CircleDollarSign} color="verde" />
            <TarjetaDato
              titulo="Entrega → Pago"
              valor={`${number(data.extras?.metricas_ciclo?.entrega_a_pago_dias_promedio, 2)} días`}
              icono={Clock3}
              color="gris"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Ventas por estado</div>
                <Badge variante="info">{(data.graficos.ventas_por_estado || []).length}</Badge>
              </div>
              {(data.graficos.ventas_por_estado || []).length ? (
                <ApexChart
                  type="donut"
                  height={300}
                  series={(data.graficos.ventas_por_estado || []).map((item) => Number(item.total || 0))}
                  options={estadoOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Ventas por finca</div>
                <Badge variante="info">{(data.graficos.ventas_por_finca || []).length}</Badge>
              </div>
              {(data.graficos.ventas_por_finca || []).length ? (
                <ApexChart
                  type="bar"
                  height={300}
                  series={[{ name: "Total", data: (data.graficos.ventas_por_finca || []).map((item) => Number(item.monto_total || 0)) }]}
                  options={fincaOptions}
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
                  series={[{ name: "Total vendido", data: (data.graficos.evolucion_por_fecha || []).map((item) => Number(item.monto_total || 0)) }]}
                  options={evolucionOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top clientes</div>
                <Badge variante="info">{(data.rankings.top_clientes || []).length}</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Cliente</TablaHead>
                  <TablaHead align="right">Ventas</TablaHead>
                  <TablaHead align="right">Monto</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {(data.rankings.top_clientes || []).length ? (
                    data.rankings.top_clientes.map((item) => (
                      <TablaFila key={item.cliente_id || item.cliente}>
                        <TablaCelda className="font-semibold text-slate-900">{item.cliente}</TablaCelda>
                        <TablaCelda align="right">{number(item.ventas)}</TablaCelda>
                        <TablaCelda align="right">{money(item.monto_total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin clientes en el rango." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top lotes por monto</div>
                <Badge variante="info">{(data.rankings.top_lotes_por_monto || []).length}</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Lote</TablaHead>
                  <TablaHead>Finca</TablaHead>
                  <TablaHead align="right">Monto</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {(data.rankings.top_lotes_por_monto || []).length ? (
                    data.rankings.top_lotes_por_monto.map((item) => (
                      <TablaFila key={item.lote_id || item.lote}>
                        <TablaCelda className="font-semibold text-slate-900">{item.lote}</TablaCelda>
                        <TablaCelda>{item.finca || "-"}</TablaCelda>
                        <TablaCelda align="right">{money(item.monto_total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin lotes en el rango." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="font-extrabold text-slate-900">Detalle de ventas</div>
              <Badge variante="info">Total: {data.tablas.ventas.total}</Badge>
            </div>

            <Tabla className="border-0 shadow-none rounded-none">
              <TablaCabecera>
                <TablaHead>Fecha</TablaHead>
                <TablaHead>Cliente</TablaHead>
                <TablaHead>Finca / Lote</TablaHead>
                <TablaHead>Tipo</TablaHead>
                <TablaHead>Estado</TablaHead>
                <TablaHead>Recibo</TablaHead>
                <TablaHead align="right">Total</TablaHead>
                <TablaHead>Pago</TablaHead>
              </TablaCabecera>
              <TablaCuerpo>
                {(data.tablas.ventas.rows || []).length ? (
                  data.tablas.ventas.rows.map((item) => (
                    <TablaFila key={item.id}>
                      <TablaCelda>{item.fecha_entrega}</TablaCelda>
                      <TablaCelda className="font-semibold text-slate-900">{item.cliente?.nombre || "-"}</TablaCelda>
                      <TablaCelda nowrap={false}>
                        <div>{item.lote?.finca_nombre || "-"}</div>
                        <div className="text-xs text-slate-500">{item.lote?.nombre || "-"}</div>
                      </TablaCelda>
                      <TablaCelda>{item.tipo_venta}</TablaCelda>
                      <TablaCelda><Badge variante={item.estado}>{item.estado}</Badge></TablaCelda>
                      <TablaCelda>{item.numero_recibo || "-"}</TablaCelda>
                      <TablaCelda align="right">{money(item.total)}</TablaCelda>
                      <TablaCelda>{item.fecha_pago || "-"}</TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="No hay ventas para mostrar." colSpan={8} />
                )}
              </TablaCuerpo>
            </Tabla>

            <Paginador
              paginaActual={data.tablas.ventas.page}
              totalPaginas={data.tablas.ventas.totalPages}
              totalRegistros={data.tablas.ventas.total}
              onCambiarPagina={setPage}
              mostrarSiempre
            />
          </div>
        </>
      ) : null}
    </ReportPanelLayout>
  );
}
