// frontend/src/components/reportes/panels/inventarioResumenPanel.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Package,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSearch,
} from "lucide-react";

import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Boton from "../../../components/ui/Boton";
import Badge from "../../../components/ui/Badge";
import EstadoVacio from "../../../components/ui/EstadoVacio";
import EstadoPanelVacio from "../../../components/reportes/ui/EstadoPanelVacio";
import TarjetaDato from "../../../components/ui/TarjetaDato";
import Paginador from "../../../components/ui/Paginador";
import ApexChart from "../../../components/ui/ApexChart";

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
} from "../../../components/ui/Tabla";

import {
  reporteInventarioResumen,
  reporteInventarioStock,
  reporteInventarioFefo,
  reporteInventarioPrestamos,
} from "../../../api/apiClient";

// =========================
// Utils
// =========================
const toYmd = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (ymd, days) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + Number(days || 0));
  return toYmd(d);
};

const defaultDesdeHasta30 = () => {
  const hoy = new Date();
  const hasta = toYmd(hoy);
  const desde = toYmd(new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000));
  return { desde, hasta };
};

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const asText = (v) => {
  if (v == null) return "—";
  if (typeof v === "object") return v.nombre || v.codigo || "—";
  return String(v);
};

const daysBetween = (a, b) => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
};

// =========================
// Panel
// =========================
export default function InventarioResumenPanel({ titulo = "Inventario" }) {
  const baseRange = useMemo(() => defaultDesdeHasta30(), []);

  // filtros
  const [f, setF] = useState({
    categoria: "",
    q: "",
    fefo_dias: 30,
    desde: baseRange.desde,
    hasta: baseRange.hasta,
    estado_stock: "",
  });

  // paginaciones separadas
  const [pageStock, setPageStock] = useState(1);
  const [pageFefo, setPageFefo] = useState(1);
  const [pagePrest, setPagePrest] = useState(1);
  const pageSize = 20;

  // data
  const [resumen, setResumen] = useState(null);
  const [stock, setStock] = useState(null);
  const [fefo, setFefo] = useState(null);
  const [prestamos, setPrestamos] = useState(null);

  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState(null);

  const setFiltro = useCallback((k, v) => setF((prev) => ({ ...prev, [k]: v })), []);

  const limpiar = useCallback(() => {
    const r = defaultDesdeHasta30();
    setF({
      categoria: "",
      q: "",
      fefo_dias: 30,
      desde: r.desde,
      hasta: r.hasta,
      estado_stock: "",
    });
    setPageStock(1);
    setPageFefo(1);
    setPagePrest(1);

    setResumen(null);
    setStock(null);
    setFefo(null);
    setPrestamos(null);

    setError(null);
    setHasRun(false);
  }, []);

  const cargarTodo = useCallback(
    async (override = {}) => {
      setLoading(true);
      setError(null);

      try {
        const merged = { ...f, ...override };

        const paramsResumen = {
          categoria: merged.categoria || "",
          q: merged.q || "",
          fefo_dias: merged.fefo_dias || 30,
          desde: merged.desde || "",
          hasta: merged.hasta || "",
        };

        const paramsStock = {
          categoria: merged.categoria || "",
          q: merged.q || "",
          estado_stock: merged.estado_stock || "",
          page: pageStock,
          pageSize,
        };

        const paramsFefo = {
          fefo_dias: merged.fefo_dias || 30,
          q: merged.q || "",
          page: pageFefo,
          pageSize,
        };

        const paramsPrest = {
          categoria: merged.categoria || "",
          q: merged.q || "",
          page: pagePrest,
          pageSize,
        };

        const [r1, r2, r3, r4] = await Promise.all([
          reporteInventarioResumen(paramsResumen),
          reporteInventarioStock(paramsStock),
          reporteInventarioFefo(paramsFefo),
          reporteInventarioPrestamos(paramsPrest),
        ]);

        setResumen(r1);
        setStock(r2);
        setFefo(r3);
        setPrestamos(r4);
        setHasRun(true);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Error al consultar inventario.");
        setResumen(null);
        setStock(null);
        setFefo(null);
        setPrestamos(null);
        setHasRun(true);
      } finally {
        setLoading(false);
      }
    },
    [f, pageStock, pageFefo, pagePrest]
  );

  // cuando cambie paginación => recarga (para simplicidad recargamos todo)
  useEffect(() => {
    if (!hasRun) return;
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageStock, pageFefo, pagePrest]);

  // =========================
  // Charts (Apex) - opciones
  // =========================
  const chartMovSeries = useMemo(() => {
    const s = resumen?.stats;
    if (!s) return [0, 0];
    return [safeNum(s.movimientos_entradas), safeNum(s.movimientos_salidas)];
  }, [resumen]);

  const chartAlertasSeries = useMemo(() => {
    const s = resumen?.stats;
    if (!s) return [0, 0, 0];
    return [safeNum(s.items_sin_stock), safeNum(s.items_bajo_minimo), safeNum(s.lotes_por_vencer)];
  }, [resumen]);

  const donutOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      legend: { position: "bottom" },
      dataLabels: { enabled: true },
      labels: ["Sin stock", "Bajo mínimo", "Por vencer"],
      stroke: { width: 2, colors: ["#fff"] },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false } },
      xaxis: { categories: ["Entradas", "Salidas"] },
      dataLabels: { enabled: false },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
    }),
    []
  );

  // =========================
  // UI helpers
  // =========================
  const estadoStockBadge = (estado) => {
    const s = String(estado || "").toLowerCase();
    if (s.includes("sin")) return <Badge variante="cancelada">Sin stock</Badge>;
    if (s.includes("bajo")) return <Badge variante="pendiente">Bajo mínimo</Badge>;
    if (s.includes("ok")) return <Badge variante="completada">OK</Badge>;
    return <Badge variante="info">{estado || "—"}</Badge>;
  };

  const badgeMovimiento = (tipo) => {
    const t = String(tipo || "").toLowerCase().replaceAll("_", " ");
    if (t.includes("entrada")) return <Badge variante="entrada">{tipo}</Badge>;
    if (t.includes("salida")) return <Badge variante="salida">{tipo}</Badge>;
    return <Badge variante="info">{tipo || "—"}</Badge>;
  };

  const header = resumen?.header;

  const meta = useMemo(() => {
    const cat = f.categoria || "Todas";
    const rango = `${f.desde || "-"} — ${f.hasta || "-"}`;
    const fefoTxt = `${f.fefo_dias || 30} días`;
    const stockTxt = f.estado_stock ? f.estado_stock : "Todos";
    return [
      { label: "Categoría", value: cat },
      { label: "Rango", value: rango },
      { label: "FEFO", value: fefoTxt },
      { label: "Stock", value: stockTxt },
    ];
  }, [f]);

  // =========================
  // Filters JSX
  // =========================
  const filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <Select
            label="Categoría"
            value={f.categoria}
            onChange={(e) => {
              setFiltro("categoria", e.target.value);
              setPageStock(1);
              setPagePrest(1);
              setHasRun(false);
            }}
          >
            <option value="">Todas</option>
            <option value="Insumo">Insumo</option>
            <option value="Herramienta">Herramienta</option>
            <option value="Equipo">Equipo</option>
          </Select>
        </div>

        <div className="md:col-span-4">
          <Input
            label="Buscar"
            placeholder="Nombre del ítem..."
            value={f.q}
            onChange={(e) => {
              setFiltro("q", e.target.value);
              setPageStock(1);
              setPageFefo(1);
              setPagePrest(1);
              setHasRun(false);
            }}
          />
        </div>

        <div className="md:col-span-2">
          <Select
            label="FEFO (días)"
            value={f.fefo_dias}
            onChange={(e) => {
              setFiltro("fefo_dias", Number(e.target.value));
              setPageFefo(1);
              setHasRun(false);
            }}
          >
            <option value={7}>7</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Select
            label="Estado stock"
            value={f.estado_stock}
            onChange={(e) => {
              setFiltro("estado_stock", e.target.value);
              setPageStock(1);
              setHasRun(false);
            }}
          >
            <option value="">Todos</option>
            <option value="critico">Crítico (sin stock)</option>
            <option value="bajo_minimo">Bajo mínimo</option>
            <option value="ok">OK</option>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Input
            label="Desde"
            type="date"
            value={f.desde}
            onChange={(e) => {
              setFiltro("desde", e.target.value);
              setHasRun(false);
            }}
          />
        </div>

        <div className="md:col-span-3">
          <Input
            label="Hasta"
            type="date"
            value={f.hasta}
            onChange={(e) => {
              setFiltro("hasta", e.target.value);
              setHasRun(false);
            }}
          />
        </div>

        <div className="md:col-span-6 flex items-end gap-2">
          <Boton
            variante="outline"
            onClick={() => {
              const r = defaultDesdeHasta30();
              setFiltro("desde", r.desde);
              setFiltro("hasta", r.hasta);
              setHasRun(false);
            }}
          >
            Últimos 30 días
          </Boton>

          <Boton
            variante="outline"
            onClick={() => {
              const hoy = toYmd(new Date());
              setFiltro("desde", addDays(hoy, -7));
              setFiltro("hasta", hoy);
              setHasRun(false);
            }}
          >
            Últimos 7 días
          </Boton>
        </div>
      </div>

      {header?.nota ? (
        <div className="text-xs text-slate-500">
          <b className="text-slate-700">Nota:</b> {header.nota}
        </div>
      ) : null}
    </div>
  );

  // =========================
  // Results JSX
  // =========================
  const resumenStats = resumen?.stats;

  const showEmptyAfterRun =
    hasRun &&
    !loading &&
    !error &&
    (safeNum(stock?.total) === 0) &&
    (safeNum(fefo?.total) === 0) &&
    (safeNum(prestamos?.total) === 0) &&
    !resumenStats;

  const results = (
    <div className="space-y-4">
      {/* Error */}
      {error ? (
        <EstadoVacio tipo="error" titulo="No se pudo generar el reporte">
          {error}
        </EstadoVacio>
      ) : null}

      {/* Idle */}
      {!hasRun ? (
        <EstadoPanelVacio tipo="calendario" titulo="Listo para consultar" icono={FileSearch}>
          Usa los filtros y presiona <b>Consultar</b> para cargar el reporte de inventario.
        </EstadoPanelVacio>
      ) : null}

      {/* Empty (después de consultar) */}
      {showEmptyAfterRun ? (
        <ReportEmptyState variant="empty" title="No se encontraron datos">
          Prueba ajustando el rango de fechas, cambiando la categoría o borrando el texto de búsqueda.
        </ReportEmptyState>
      ) : null}

      {/* ===== RESUMEN (cards) ===== */}
      {hasRun && resumenStats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <TarjetaDato
              titulo="Ítems sin stock"
              valor={safeNum(resumenStats.items_sin_stock)}
              subtitulo="Crítico"
              icono={ShieldAlert}
              color="rojo"
              onClick={() => setFiltro("estado_stock", "critico")}
            />
            <TarjetaDato
              titulo="Bajo mínimo"
              valor={safeNum(resumenStats.items_bajo_minimo)}
              subtitulo="Alerta"
              icono={AlertTriangle}
              color="ambar"
              onClick={() => setFiltro("estado_stock", "bajo_minimo")}
            />
            <TarjetaDato
              titulo="Lotes por vencer"
              valor={safeNum(resumenStats.lotes_por_vencer)}
              subtitulo={`FEFO ${f.fefo_dias} días`}
              icono={Package}
              color="violeta"
            />
            <TarjetaDato
              titulo="Préstamos activos"
              valor={safeNum(resumenStats.prestamos_activos)}
              subtitulo="Herramientas/Equipos"
              icono={ClipboardList}
              color="azul"
            />
            <TarjetaDato
              titulo="Entradas"
              valor={safeNum(resumenStats.movimientos_entradas)}
              subtitulo="En rango"
              icono={ArrowDownCircle}
              color="verde"
            />
            <TarjetaDato
              titulo="Salidas"
              valor={safeNum(resumenStats.movimientos_salidas)}
              subtitulo="En rango"
              icono={ArrowUpCircle}
              color="rojo"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">Alertas</div>
              <ApexChart type="donut" height={280} options={donutOptions} series={chartAlertasSeries} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900 mb-2">Movimientos (rango)</div>
              <ApexChart
                type="bar"
                height={280}
                options={barOptions}
                series={[{ name: "Movimientos", data: chartMovSeries }]}
              />
            </div>
          </div>
        </>
      ) : null}

      {/* ===== STOCK ===== */}
      {hasRun ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-base font-extrabold text-slate-900">Stock</div>
            <div className="text-xs text-slate-500">
              Total: <b className="text-slate-900">{stock?.total ?? 0}</b>
            </div>
          </div>

          <Tabla>
            <TablaCabecera>
              <TablaHead>Ítem</TablaHead>
              <TablaHead>Categoría</TablaHead>
              <TablaHead>Unidad</TablaHead>
              <TablaHead align="right">Stock</TablaHead>
              <TablaHead align="right">Mínimo</TablaHead>
              <TablaHead>Estado</TablaHead>
              <TablaHead>Último mov.</TablaHead>
            </TablaCabecera>

            <TablaCuerpo>
              {(stock?.data || []).length === 0 ? (
                <TablaVacia mensaje="No hay ítems para mostrar con estos filtros." colSpan={7} />
              ) : (
                (stock.data || []).map((r) => (
                  <TablaFila key={r.id}>
                    <TablaCelda className="font-semibold text-slate-900">{r.nombre}</TablaCelda>
                    <TablaCelda>{r.categoria}</TablaCelda>
                    <TablaCelda>{asText(r.unidad)}</TablaCelda>
                    <TablaCelda align="right">{r.stock_actual}</TablaCelda>
                    <TablaCelda align="right">{r.stock_minimo}</TablaCelda>
                    <TablaCelda>{estadoStockBadge(r.estado)}</TablaCelda>
                    <TablaCelda>
                      {r.ultimo_movimiento?.fecha ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500">
                            {new Date(r.ultimo_movimiento.fecha).toLocaleString("es-EC")}
                          </span>
                          {badgeMovimiento(r.ultimo_movimiento.tipo)}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TablaCelda>
                  </TablaFila>
                ))
              )}
            </TablaCuerpo>
          </Tabla>

          <Paginador
            paginaActual={stock?.page || pageStock}
            totalPaginas={stock?.totalPages || 1}
            totalRegistros={stock?.total || 0}
            onCambiarPagina={(p) => setPageStock(p)}
            mostrarSiempre
          />
        </div>
      ) : null}

      {/* ===== FEFO + PRÉSTAMOS ===== */}
      {hasRun ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* FEFO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-base font-extrabold text-slate-900">FEFO</div>
              <div className="text-xs text-slate-500">
                Ventana: <b className="text-slate-900">{f.fefo_dias} días</b> · Total:{" "}
                <b className="text-slate-900">{fefo?.total ?? 0}</b>
              </div>
            </div>

            <Tabla>
              <TablaCabecera>
                <TablaHead>Ítem</TablaHead>
                <TablaHead>Lote</TablaHead>
                <TablaHead>Vence</TablaHead>
                <TablaHead align="right">Cantidad</TablaHead>
              </TablaCabecera>

              <TablaCuerpo>
                {(fefo?.data || []).length === 0 ? (
                  <TablaVacia mensaje="No hay lotes por vencer en este rango." colSpan={4} />
                ) : (
                  (fefo.data || []).map((r) => {
                    const dias = r.fecha_vencimiento ? daysBetween(new Date(), r.fecha_vencimiento) : null;
                    return (
                      <TablaFila key={r.id}>
                        <TablaCelda className="font-semibold text-slate-900">
                          {r.item_nombre || asText(r.item)}
                        </TablaCelda>
                        <TablaCelda>{r.codigo_lote_proveedor || "—"}</TablaCelda>
                        <TablaCelda>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{r.fecha_vencimiento}</span>
                            {typeof dias === "number" ? (
                              <Badge variante={dias <= 7 ? "cancelada" : "pendiente"}>{dias} días</Badge>
                            ) : null}
                          </div>
                        </TablaCelda>
                        <TablaCelda align="right">{r.cantidad_actual ?? r.cantidad}</TablaCelda>
                      </TablaFila>
                    );
                  })
                )}
              </TablaCuerpo>
            </Tabla>

            <Paginador
              paginaActual={fefo?.page || pageFefo}
              totalPaginas={fefo?.totalPages || 1}
              totalRegistros={fefo?.total || 0}
              onCambiarPagina={(p) => setPageFefo(p)}
              mostrarSiempre
            />
          </div>

          {/* PRÉSTAMOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-base font-extrabold text-slate-900">Préstamos</div>
              <div className="text-xs text-slate-500">
                Total: <b className="text-slate-900">{prestamos?.total ?? 0}</b>
              </div>
            </div>

            <Tabla>
              <TablaCabecera>
                <TablaHead>Ítem</TablaHead>
                <TablaHead>Usuario</TablaHead>
                <TablaHead>Salida</TablaHead>
                <TablaHead>Estado</TablaHead>
              </TablaCabecera>

              <TablaCuerpo>
                {(prestamos?.data || []).length === 0 ? (
                  <TablaVacia mensaje="No hay préstamos activos con estos filtros." colSpan={4} />
                ) : (
                  (prestamos.data || []).map((r) => {
                    const diasPrest = r.fecha_salida ? daysBetween(r.fecha_salida, new Date()) : null;
                    return (
                      <TablaFila key={r.id}>
                        <TablaCelda className="font-semibold text-slate-900">
                          {r.item_nombre || asText(r.item)}
                        </TablaCelda>
                        <TablaCelda>{asText(r.usuario)}</TablaCelda>
                        <TablaCelda>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-600">
                              {r.fecha_salida ? new Date(r.fecha_salida).toLocaleString("es-EC") : "—"}
                            </span>
                            {typeof diasPrest === "number" ? (
                              <Badge variante={diasPrest >= 7 ? "pendiente" : "info"}>{diasPrest} días</Badge>
                            ) : null}
                          </div>
                        </TablaCelda>
                        <TablaCelda>
                          <Badge variante={String(r.estado || "").toLowerCase()}>{r.estado || "—"}</Badge>
                        </TablaCelda>
                      </TablaFila>
                    );
                  })
                )}
              </TablaCuerpo>
            </Tabla>

            <Paginador
              paginaActual={prestamos?.page || pagePrest}
              totalPaginas={prestamos?.totalPages || 1}
              totalRegistros={prestamos?.total || 0}
              onCambiarPagina={(p) => setPagePrest(p)}
              mostrarSiempre
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <ReportPanelLayout
      title={titulo}
      description={header?.nota || "Inventario global (según tu esquema actual)."}
      meta={meta}
      primaryAction={{
        label: "Consultar",
        onClick: () => cargarTodo(),
        disabled: loading,
        loading,
      }}
      secondaryAction={{
        label: "Limpiar",
        onClick: limpiar,
        disabled: loading,
        variant: "outline",
      }}
      filters={filters}
      wrapResults
    >
      {results}
    </ReportPanelLayout>
  );
}
