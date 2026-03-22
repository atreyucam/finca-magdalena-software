import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, DollarSign, PackageSearch, TriangleAlert } from "lucide-react";

import { reporteAltaDireccion } from "../../../api/apiClient";
import ReportPanelLayout from "../ui/ReportPanelLayout";
import ReportEmptyState from "../ui/ReportEmptyState";
import TarjetaDato from "../../ui/TarjetaDato";
import ApexChart from "../../ui/ApexChart";
import Badge from "../../ui/Badge";
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

export default function AltaDireccionPanel({ filters }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const params = useMemo(
    () => ({
      finca_ids: (filters?.finca_ids || []).join(","),
      desde: filters?.desde,
      hasta: filters?.hasta,
    }),
    [filters]
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await reporteAltaDireccion(params);
        if (!active) return;
        setData(payload);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || "No se pudo cargar alta dirección.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [params]);

  const comparativo = Array.isArray(data?.graficos?.comparativo_operativo)
    ? data.graficos.comparativo_operativo
    : [];
  const distribucion = Array.isArray(data?.graficos?.distribucion_por_finca)
    ? data.graficos.distribucion_por_finca
    : [];
  const evolucion = Array.isArray(data?.graficos?.evolucion_temporal)
    ? data.graficos.evolucion_temporal
    : [];
  const resumen = Array.isArray(data?.tablas?.resumen_ejecutivo_por_finca)
    ? data.tablas.resumen_ejecutivo_por_finca
    : [];

  const comparativoOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 8, columnWidth: "45%" } },
      xaxis: { categories: comparativo.map((item) => item.categoria) },
      yaxis: { labels: { formatter: (value) => money(value) } },
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [comparativo]
  );

  const distribucionOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      dataLabels: { enabled: true },
      legend: { position: "bottom" },
      labels: distribucion.map((item) => item.finca),
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [distribucion]
  );

  const evolucionOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      xaxis: { categories: evolucion.map((item) => item.periodo) },
      yaxis: { labels: { formatter: (value) => money(value) } },
      tooltip: { y: { formatter: (value) => money(value) } },
    }),
    [evolucion]
  );

  return (
    <ReportPanelLayout
      title="Alta Dirección"
      description="Vista ejecutiva operativa/comercial consolidada del período."
      meta={[
        { label: "Fincas", value: data?.meta?.fincas?.length || 0 },
        { label: "Rango", value: `${filters?.desde || "-"} — ${filters?.hasta || "-"}` },
      ]}
      wrapResults={false}
      resultsClassName="space-y-4"
    >
      {error ? <ReportEmptyState variant="error" title="No se pudo cargar alta dirección">{error}</ReportEmptyState> : null}
      {loading && !data ? <ReportEmptyState variant="idle" title="Cargando alta dirección">Consultando indicadores ejecutivos.</ReportEmptyState> : null}
      {!loading && !error && !data ? <ReportEmptyState variant="empty" /> : null}

      {data ? (
        <>
          <LimitacionesReporte items={data?.meta?.limitaciones || []} />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <TarjetaDato titulo="Ventas" valor={money(data.kpis.ventas_totales_periodo)} icono={DollarSign} color="verde" />
            <TarjetaDato titulo="Compras" valor={money(data.kpis.compras_totales_periodo)} icono={PackageSearch} color="ambar" />
            <TarjetaDato titulo="Nómina" valor={money(data.kpis.nomina_total_periodo)} icono={BriefcaseBusiness} color="azul" />
            <TarjetaDato
              titulo="Utilidad simple"
              valor={money(data.kpis.utilidad_operativa_simple)}
              icono={BarChart3}
              color={Number(data.kpis.utilidad_operativa_simple || 0) >= 0 ? "violeta" : "rojo"}
            />
            <TarjetaDato titulo="N° ventas" valor={number(data.kpis.numero_ventas)} icono={DollarSign} color="gris" />
            <TarjetaDato titulo="N° compras" valor={number(data.kpis.numero_compras)} icono={PackageSearch} color="gris" />
            <TarjetaDato titulo="Tareas vencidas" valor={number(data.kpis.tareas_vencidas)} icono={TriangleAlert} color="rojo" />
            <TarjetaDato titulo="Alertas inventario" valor={number(data.kpis.alertas_inventario)} icono={TriangleAlert} color="ambar" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Ventas vs Compras vs Nómina</div>
                <Badge variante="info">Comparativo</Badge>
              </div>
              <ApexChart
                type="bar"
                height={300}
                series={[{ name: "Monto", data: comparativo.map((item) => Number(item.total || 0)) }]}
                options={comparativoOptions}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Distribución por finca</div>
                <Badge variante="info">{distribucion.length} fincas</Badge>
              </div>
              {distribucion.length ? (
                <ApexChart
                  type="donut"
                  height={300}
                  series={distribucion.map((item) => Number(item.ventas_total || 0))}
                  options={distribucionOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" title="Sin distribución por finca" />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Evolución temporal</div>
                <Badge variante="info">{evolucion.length} periodos</Badge>
              </div>
              {evolucion.length ? (
                <ApexChart
                  type="line"
                  height={300}
                  series={[
                    { name: "Ventas", data: evolucion.map((item) => Number(item.ventas || 0)) },
                    { name: "Compras", data: evolucion.map((item) => Number(item.compras || 0)) },
                    { name: "Nómina", data: evolucion.map((item) => Number(item.nomina || 0)) },
                  ]}
                  options={evolucionOptions}
                />
              ) : (
                <ReportEmptyState variant="empty" title="Sin evolución temporal" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top fincas por ventas</div>
                <Badge variante="info">{(data.rankings.top_fincas_por_ventas || []).length}</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Finca</TablaHead>
                  <TablaHead align="right">Ventas</TablaHead>
                  <TablaHead align="right">Total</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {(data.rankings.top_fincas_por_ventas || []).length ? (
                    data.rankings.top_fincas_por_ventas.map((item) => (
                      <TablaFila key={item.finca_id}>
                        <TablaCelda className="font-semibold text-slate-900">{item.finca}</TablaCelda>
                        <TablaCelda align="right">{number(item.ventas)}</TablaCelda>
                        <TablaCelda align="right">{money(item.monto_total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin datos de fincas." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-slate-900">Top clientes y proveedores</div>
                <Badge variante="info">Ranking</Badge>
              </div>
              <Tabla>
                <TablaCabecera>
                  <TablaHead>Tipo</TablaHead>
                  <TablaHead>Nombre</TablaHead>
                  <TablaHead align="right">Total</TablaHead>
                </TablaCabecera>
                <TablaCuerpo>
                  {[
                    ...(data.rankings.top_clientes || []).slice(0, 5).map((item) => ({ tipo: "Cliente", nombre: item.cliente, total: item.monto_total })),
                    ...(data.rankings.top_proveedores || []).slice(0, 5).map((item) => ({ tipo: "Proveedor", nombre: item.proveedor, total: item.monto_total })),
                  ].length ? (
                    [
                      ...(data.rankings.top_clientes || []).slice(0, 5).map((item) => ({ tipo: "Cliente", nombre: item.cliente, total: item.monto_total })),
                      ...(data.rankings.top_proveedores || []).slice(0, 5).map((item) => ({ tipo: "Proveedor", nombre: item.proveedor, total: item.monto_total })),
                    ].map((item, index) => (
                      <TablaFila key={`${item.tipo}-${item.nombre}-${index}`}>
                        <TablaCelda><Badge variante="info">{item.tipo}</Badge></TablaCelda>
                        <TablaCelda className="font-semibold text-slate-900">{item.nombre}</TablaCelda>
                        <TablaCelda align="right">{money(item.total)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin rankings disponibles." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Resumen ejecutivo por finca</div>
              <Badge variante="warning">Compras y nómina por finca: N/D</Badge>
            </div>
            <Tabla>
              <TablaCabecera>
                <TablaHead>Finca</TablaHead>
                <TablaHead align="right">Ventas</TablaHead>
                <TablaHead align="right">Compras</TablaHead>
                <TablaHead align="right">Nómina</TablaHead>
                <TablaHead align="right">Utilidad simple</TablaHead>
                <TablaHead align="right">Tareas vencidas</TablaHead>
              </TablaCabecera>
              <TablaCuerpo>
                {resumen.length ? (
                  resumen.map((item) => (
                    <TablaFila key={item.finca_id}>
                      <TablaCelda className="font-semibold text-slate-900">{item.finca}</TablaCelda>
                      <TablaCelda align="right">{money(item.ventas_total)}</TablaCelda>
                      <TablaCelda align="right">N/D</TablaCelda>
                      <TablaCelda align="right">N/D</TablaCelda>
                      <TablaCelda align="right">N/D</TablaCelda>
                      <TablaCelda align="right">{number(item.tareas_vencidas)}</TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="No hay resumen por finca." colSpan={6} />
                )}
              </TablaCuerpo>
            </Tabla>
          </div>
        </>
      ) : null}
    </ReportPanelLayout>
  );
}
