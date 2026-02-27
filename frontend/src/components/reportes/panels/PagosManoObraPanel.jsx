// frontend/src/components/reportes/panels/PagosManoObraPanel.jsx
import { useMemo, useState, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Receipt,
  RefreshCw,
  FileSearch,
} from "lucide-react";

import Boton from "../../ui/Boton";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import TarjetaDato from "../../ui/TarjetaDato";
import Paginador from "../../ui/Paginador";
import ApexChart from "../../ui/ApexChart";
import EstadoPanelVacio from "../../reportes/ui/EstadoPanelVacio";

import ReportPanelLayout from "../ui/ReportPanelLayout";
import ReportEmptyState from "../ui/ReportEmptyState";

import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../../ui/Tabla";

import { reporteManoObraResumen, reporteManoObraDetalle } from "../../../api/apiClient";

// ==========================
// Helpers
// ==========================
const toYmd = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return toYmd(d);
};

const money = (n) => {
  const x = Number(n || 0);
  return x.toLocaleString("es-EC", { style: "currency", currency: "USD" });
};

const fmtRango = (inicio, fin) => {
  if (!inicio || !fin) return "-";
  const a = new Date(`${inicio}T00:00:00`);
  const b = new Date(`${fin}T00:00:00`);
  const opt = { day: "2-digit", month: "short", year: "numeric" };
  return `${a.toLocaleDateString("es-EC", opt)} - ${b.toLocaleDateString("es-EC", opt)}`;
};

const safeStr = (v) => (v == null ? "" : String(v));

export default function PagosManoObraPanel({ titulo = "Mano de obra" }) {
  // defaults: últimos 30 días
  const hoy = useMemo(() => toYmd(new Date()), []);
  const hace30 = useMemo(() => addDays(hoy, -30), [hoy]);

  const [filtros, setFiltros] = useState({
    desde: hace30,
    hasta: hoy,
    estado: "", // "" | "Borrador" | "Aprobada"
    q: "", // búsqueda local
    page: 1,
    limit: 10,
  });

  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState(null);

  const [resumen, setResumen] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const setFiltro = useCallback((k, v) => setFiltros((p) => ({ ...p, [k]: v })), []);

  const paramsBackend = useMemo(() => {
    const p = {
      desde: filtros.desde,
      hasta: filtros.hasta,
      page: filtros.page,
      limit: filtros.limit,
    };
    if (filtros.estado) p.estado = filtros.estado;
    return p;
  }, [filtros.desde, filtros.hasta, filtros.estado, filtros.page, filtros.limit]);

  const cargar = useCallback(
    async (override = {}) => {
      setLoading(true);
      setError(null);
      try {
        const merged = { ...paramsBackend, ...override };
        const [r1, r2] = await Promise.all([
          reporteManoObraResumen(merged),
          reporteManoObraDetalle(merged),
        ]);
        setResumen(r1);
        setDetalle(r2);
        setHasRun(true);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Error al generar reporte.");
        setResumen(null);
        setDetalle(null);
        setHasRun(true);
      } finally {
        setLoading(false);
      }
    },
    [paramsBackend]
  );

  // ✅ NO cargamos automático: queda “idle” hasta consultar
  // Si lo quieres automático como antes, descomenta:
  // useEffect(() => { cargar({ page: 1 }); }, []);

  const onGenerar = () => {
    setFiltros((p) => ({ ...p, page: 1 }));
    cargar({ ...paramsBackend, page: 1 });
  };

  const onLimpiar = () => {
    const reset = {
      desde: hace30,
      hasta: hoy,
      estado: "",
      q: "",
      page: 1,
      limit: 10,
    };
    setFiltros(reset);
    setResumen(null);
    setDetalle(null);
    setError(null);
    setHasRun(false);
  };

  const onCambiarPagina = (p) => {
    setFiltro("page", p);
    cargar({ ...paramsBackend, page: p });
  };

  // ==========================
  // Búsqueda local
  // ==========================
  const rowsFiltradas = useMemo(() => {
    const rows = detalle?.rows || [];
    const q = safeStr(filtros.q).trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const t = r?.trabajador || {};
      const nombre = `${t.nombres || ""} ${t.apellidos || ""}`.toLowerCase();
      const cedula = safeStr(t.cedula).toLowerCase();
      const comp = safeStr(r.comprobante).toLowerCase();
      const mp = safeStr(r.metodo_pago).toLowerCase();
      const mpo = safeStr(r.metodo_pago_otro).toLowerCase();
      return nombre.includes(q) || cedula.includes(q) || comp.includes(q) || mp.includes(q) || mpo.includes(q);
    });
  }, [detalle, filtros.q]);

  const totalPaginas = useMemo(() => {
    const total = Number(detalle?.meta?.total || 0);
    const limit = Number(detalle?.meta?.limit || filtros.limit || 10);
    return Math.max(1, Math.ceil(total / limit));
  }, [detalle?.meta?.total, detalle?.meta?.limit, filtros.limit]);

  // ==========================
  // ApexCharts
  // ==========================
  const apexBaseOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
      },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 3 },
      stroke: { curve: "smooth", width: 2 },
      tooltip: { y: { formatter: (val) => money(val) } },
      yaxis: {
        labels: {
          formatter: (v) => {
            const x = Number(v || 0);
            if (Math.abs(x) >= 1000) return `${Math.round(x / 100) / 10}k`;
            return `${Math.round(x)}`;
          },
        },
      },
      legend: { show: true },
    }),
    []
  );

  const serieSemana = useMemo(() => resumen?.series_total_por_semana ?? [], [resumen?.series_total_por_semana]);
  const barras = useMemo(() => resumen?.barras_base_ajustes_total ?? [], [resumen?.barras_base_ajustes_total]);
  const pieMetodos = useMemo(() => resumen?.metodos_pago ?? [], [resumen?.metodos_pago]);
  const topTrab = useMemo(() => resumen?.top_trabajadores ?? [], [resumen?.top_trabajadores]);

  const catSemana = useMemo(() => serieSemana.map((x) => x.semana_iso), [serieSemana]);
  const catBarras = useMemo(() => barras.map((x) => x.semana_iso), [barras]);
  const catTop = useMemo(() => topTrab.map((x) => x.nombre), [topTrab]);

  const seriesTotalSemana = useMemo(
    () => [{ name: "Total", data: serieSemana.map((x) => Number(x.total || 0)) }],
    [serieSemana]
  );

  const seriesBaseAjustesTotal = useMemo(
    () => [
      { name: "Base", data: barras.map((x) => Number(x.base || 0)) },
      { name: "Ajustes", data: barras.map((x) => Number(x.ajustes || 0)) },
      { name: "Total", data: barras.map((x) => Number(x.total || 0)) },
    ],
    [barras]
  );

  const seriesPieMetodos = useMemo(() => pieMetodos.map((x) => Number(x.total || 0)), [pieMetodos]);
  const labelsPieMetodos = useMemo(() => pieMetodos.map((x) => `${x.metodo} (${x.count})`), [pieMetodos]);

  const seriesTopTrab = useMemo(
    () => [{ name: "Total", data: topTrab.map((x) => Number(x.total || 0)) }],
    [topTrab]
  );

  const meta = useMemo(
    () => [
      { label: "Rango", value: `${filtros.desde} — ${filtros.hasta}` },
      { label: "Estado", value: filtros.estado || "Todos" },
      { label: "Página", value: String(filtros.page) },
    ],
    [filtros.desde, filtros.hasta, filtros.estado, filtros.page]
  );

  // ==========================
  // UI: Filtros
  // ==========================
  const filters = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <Input label="Desde" type="date" value={filtros.desde} onChange={(e) => setFiltro("desde", e.target.value)} />
      <Input label="Hasta" type="date" value={filtros.hasta} onChange={(e) => setFiltro("hasta", e.target.value)} />

      <Select label="Estado" value={filtros.estado} onChange={(e) => setFiltro("estado", e.target.value)}>
        <option value="">Todos</option>
        <option value="Borrador">Borrador</option>
        <option value="Aprobada">Aprobada</option>
      </Select>

      <Input
        label="Buscar (local)"
        placeholder="Nombre, cédula, comprobante..."
        value={filtros.q}
        onChange={(e) => setFiltro("q", e.target.value)}
      />

    </div>
  );

  // ==========================
  // UI: Results
  // ==========================
  const showEmptyAfterRun =
    hasRun && !loading && !error && !resumen?.kpis && !(detalle?.rows || []).length;

  return (
    <ReportPanelLayout
      title={titulo}
      description="KPIs + gráficos + detalle paginado (Borrador/Aprobada)."
      meta={meta}
      primaryAction={{
        label: "Consultar",
        onClick: onGenerar,
        disabled: loading,
        loading,
        icon: BarChart3,
      }}
      secondaryAction={{
        label: "Limpiar",
        onClick: onLimpiar,
        disabled: loading,
        icon: RefreshCw,
        variant: "outline",
      }}
      filters={filters}
      wrapResults
    >
      {/* Error */}
      {error ? (
        <ReportEmptyState variant="error" title="No se pudo generar el reporte">
          {error}
        </ReportEmptyState>
      ) : null}

      {/* Idle */}
      {!hasRun && !loading && !error ? (
        <EstadoPanelVacio tipo="calendario" titulo="Listo para consultar" icono={FileSearch}>
          Configura el rango, estado y presiona <b>Consultar</b> para ver KPIs, gráficos y detalle.
        </EstadoPanelVacio>
      ) : null}

      {/* Empty */}
      {showEmptyAfterRun ? (
        <ReportEmptyState variant="empty" title="No se encontraron datos">
          Prueba ampliando el rango de fechas o quitando el filtro de estado.
        </ReportEmptyState>
      ) : null}

      {/* KPI Cards */}
      {resumen?.kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaDato
            titulo="Monto total"
            valor={money(resumen.kpis.monto_total)}
            subtitulo={`${resumen.kpis.pagos_registros} pagos · ${resumen.kpis.semanas} semanas`}
            icono={DollarSign}
            color="verde"
          />
          <TarjetaDato
            titulo="Trabajadores"
            valor={resumen.kpis.trabajadores_unicos}
            subtitulo="Únicos en el rango"
            icono={Users}
            color="azul"
          />
          <TarjetaDato
            titulo="Monto base"
            valor={money(resumen.kpis.monto_base)}
            subtitulo={`Ajustes neto: ${money(resumen.kpis.ajustes_neto)}`}
            icono={Receipt}
            color="violeta"
          />
          <TarjetaDato
            titulo="Rango"
            valor="Semanas"
            subtitulo={`Desde ${filtros.desde} hasta ${filtros.hasta}`}
            icono={Calendar}
            color="gris"
          />
        </div>
      ) : null}

      {/* Gráficos */}
      {resumen ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Línea total por semana */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Total por semana</div>
              <Badge variante="info">{serieSemana.length} puntos</Badge>
            </div>

            {serieSemana.length ? (
              <ApexChart
                type="line"
                height={280}
                series={seriesTotalSemana}
                options={{ ...apexBaseOptions, xaxis: { categories: catSemana } }}
              />
            ) : (
              <ReportEmptyState variant="empty" title="Sin datos para graficar">
                No hay semanas dentro del rango seleccionado.
              </ReportEmptyState>
            )}
          </div>

          {/* Barras base/ajustes/total */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Base vs Ajustes vs Total</div>
              <Badge variante="info">{barras.length} semanas</Badge>
            </div>

            {barras.length ? (
              <ApexChart
                type="bar"
                height={280}
                series={seriesBaseAjustesTotal}
                options={{
                  ...apexBaseOptions,
                  chart: { ...apexBaseOptions.chart, stacked: false },
                  plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
                  xaxis: { categories: catBarras },
                }}
              />
            ) : (
              <ReportEmptyState variant="empty" title="Sin datos para graficar">
                No hay información para este rango.
              </ReportEmptyState>
            )}
          </div>

          {/* Donut métodos de pago */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Métodos de pago</div>
              <Badge variante="info">{pieMetodos.length} tipos</Badge>
            </div>

            {pieMetodos.length ? (
              <ApexChart
                type="donut"
                height={280}
                series={seriesPieMetodos}
                options={{
                  ...apexBaseOptions,
                  labels: labelsPieMetodos,
                  legend: { position: "bottom" },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: "62%",
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: "Total",
                            formatter: () => {
                              const sum = pieMetodos.reduce((a, x) => a + Number(x.total || 0), 0);
                              return money(sum);
                            },
                          },
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <ReportEmptyState variant="empty" title="Sin datos para graficar">
                No hay pagos dentro del rango.
              </ReportEmptyState>
            )}
          </div>

          {/* Top trabajadores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-extrabold text-slate-900">Top trabajadores</div>
              <Badge variante="info">{topTrab.length} items</Badge>
            </div>

            {topTrab.length ? (
              <ApexChart
                type="bar"
                height={280}
                series={seriesTopTrab}
                options={{
                  ...apexBaseOptions,
                  plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "60%" } },
                  xaxis: { categories: catTop },
                }}
              />
            ) : (
              <ReportEmptyState variant="empty" title="Sin top para mostrar">
                No hay trabajadores con pagos en el rango.
              </ReportEmptyState>
            )}
          </div>
        </div>
      ) : null}

      {/* Tabla detalle */}
      {hasRun ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="font-extrabold text-slate-900">Detalle de pagos</div>
            <div className="flex items-center gap-2">
              <Badge variante="info">Total: {detalle?.meta?.total ?? 0}</Badge>
              {loading ? <Badge variante="info">Cargando…</Badge> : null}
            </div>
          </div>

          <Tabla className="border-0 shadow-none rounded-none">
            <TablaCabecera>
              <TablaHead>Semana</TablaHead>
              <TablaHead>Trabajador</TablaHead>
              <TablaHead align="right">Base</TablaHead>
              <TablaHead align="right">Ajustes</TablaHead>
              <TablaHead align="right">Total</TablaHead>
              <TablaHead>Método</TablaHead>
              <TablaHead>Comprobante</TablaHead>
              <TablaHead align="center">Días</TablaHead>
              <TablaHead align="center">Estado</TablaHead>
            </TablaCabecera>

            <TablaCuerpo>
              {!rowsFiltradas.length ? (
                <TablaVacia mensaje="No hay registros con esos filtros/búsqueda." colSpan={9} />
              ) : (
                rowsFiltradas.map((r) => {
                  const t = r.trabajador || {};
                  const s = r.semana || {};
                  const metodo =
                    r.metodo_pago === "Otro"
                      ? `Otro: ${r.metodo_pago_otro || "-"}`
                      : r.metodo_pago || "-";

                  const badgeEstado =
                    String(s.estado || "").toLowerCase() === "aprobada" ? "exito" : "borrador";

                  return (
                    <TablaFila key={r.detalle_id}>
                      <TablaCelda>
                        <div className="font-semibold text-slate-900">{s.semana_iso || "-"}</div>
                        <div className="text-xs text-slate-500">{fmtRango(s.fecha_inicio, s.fecha_fin)}</div>
                      </TablaCelda>

                      <TablaCelda nowrap={false}>
                        <div className="font-semibold text-slate-900">
                          {t.nombres} {t.apellidos}
                        </div>
                        <div className="text-xs text-slate-500">CI: {t.cedula}</div>
                      </TablaCelda>

                      <TablaCelda align="right" className="font-semibold text-slate-900">
                        {money(r.monto_base)}
                      </TablaCelda>

                      <TablaCelda align="right">
                        <span className="font-semibold text-slate-900">{money(r.ajustes_neto)}</span>
                      </TablaCelda>

                      <TablaCelda align="right" className="font-extrabold text-slate-900">
                        {money(r.monto_total)}
                      </TablaCelda>

                      <TablaCelda nowrap={false}>
                        <div className="text-sm text-slate-800 font-medium">{metodo}</div>
                      </TablaCelda>

                      <TablaCelda>
                        <div className="text-sm font-semibold text-slate-900">{r.comprobante || "-"}</div>
                      </TablaCelda>

                      <TablaCelda align="center">
                        <Badge variante="info">{Array.isArray(r.dias) ? r.dias.length : 0}</Badge>
                      </TablaCelda>

                      <TablaCelda align="center">
                        <Badge variante={badgeEstado}>{s.estado || "-"}</Badge>
                      </TablaCelda>
                    </TablaFila>
                  );
                })
              )}
            </TablaCuerpo>
          </Tabla>

          <Paginador
            paginaActual={Number(detalle?.meta?.page || filtros.page || 1)}
            totalPaginas={totalPaginas}
            totalRegistros={Number(detalle?.meta?.total || 0)}
            onCambiarPagina={onCambiarPagina}
            mostrarSiempre
          />
        </div>
      ) : null}
    </ReportPanelLayout>
  );
}
