// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, AlertTriangle, Boxes } from "lucide-react";

import useDashboard from "../hooks/useDashboard";
import { listarFincasReporte } from "../api/apiClient";
import useAuthStore from "../store/authStore";

import Boton from "../components/ui/Boton";
import Badge from "../components/ui/Badge";
import TarjetaDato from "../components/ui/TarjetaDato";
import ApexChart from "../components/ui/ApexChart";
import EstadoVacio from "../components/ui/EstadoVacio";
import MultiSelectChips from "../components/ui/MultiSelectChips";

import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../components/ui/Tabla";

// -------------------------
// helpers
// -------------------------
const toYmd = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const n0 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const getNombreUsuario = (user) => {
  if (!user) return "Usuario";
  return user?.nombre || user?.nombres || user?.name || user?.fullName || user?.correo || "Usuario";
};

// Mapea estados -> variantes de tu Badge UI
const badgeEstado = (estado) => {
  if (estado === "Verificada") return "success";
  if (estado === "Cancelada") return "danger";
  if (estado === "En progreso") return "info";
  if (estado === "Completada") return "violeta";
  if (estado === "Asignada") return "azul";
  if (estado === "Pendiente") return "warning";
  return "gris";
};

const fmtCantidadUnidad = (cantidad, unidadCodigo) => {
  const c = n0(cantidad);
  const u = String(unidadCodigo || "").trim();
  return u ? `${c} ${u}` : `${c}`;
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const nombre = getNombreUsuario(user);

  // filtros
  const [fincasOpts, setFincasOpts] = useState([]);
  const [fincaIds, setFincaIds] = useState([]);
  const [soloActiva, setSoloActiva] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const fincas = await listarFincasReporte();
        const arr = Array.isArray(fincas) ? fincas : Array.isArray(fincas?.items) ? fincas.items : [];
        if (!alive) return;

        setFincasOpts(arr);

        // default primera finca
        if (!fincaIds.length && arr.length) {
          setFincaIds([Number(arr[0].id)]);
        }
      } catch {
        if (!alive) return;
        setFincasOpts([]);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fincasOptionsUI = useMemo(
    () => (fincasOpts || []).map((f) => ({ value: Number(f.id), label: f.nombre })),
    [fincasOpts]
  );

  const params = useMemo(() => {
    const p = {};
    if (fincaIds?.length) p.finca_ids = fincaIds.join(",");
    p.solo_cosecha_activa = String(!!soloActiva);
    return p;
  }, [fincaIds, soloActiva]);

  const { data, loading, error } = useDashboard(params);
  const isFirstLoading = loading && !data;

  // Normalización UI
  const header = data?.header || {};
  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const tareas = data?.tareas || {};
  const inv = data?.inventario?.resumen || null;

  // Donut tareas por estado
  const tareasPorEstado = charts?.tareas_por_estado || {};
  const orderEstados = ["Pendiente", "Asignada", "En progreso", "Completada", "Verificada", "Cancelada"];
  const donutEstados = orderEstados.map((k) => n0(tareasPorEstado?.[k]));
  const donutLabels = orderEstados;

  // Barras vencidas 14 días
  const vencidas14 = Array.isArray(charts?.vencidas_ult_14_dias) ? charts.vencidas_ult_14_dias : [];
  const vencidasCats = vencidas14.map((x) => x.dia);
  const vencidasSerie = vencidas14.map((x) => n0(x.vencidas));

  // Donut alertas inventario
  const alertasInv = charts?.alertas_inventario || {};
  const donutAlertasLabels = ["Sin stock", "Bajo mínimo", "FEFO próximo"];
  const donutAlertas = [n0(alertasInv?.sin_stock), n0(alertasInv?.bajo_minimo), n0(alertasInv?.fefo_proximo)];

  // ✅ Detalle alertas inventario (API)
  const invAlertas = inv?.alertas_detalle || {};
  const invSinStock = Array.isArray(invAlertas?.sin_stock) ? invAlertas.sin_stock : [];
  const invBajoMin = Array.isArray(invAlertas?.bajo_minimo) ? invAlertas.bajo_minimo : [];
  const invFefo = Array.isArray(invAlertas?.fefo_proximo) ? invAlertas.fefo_proximo : [];

  // acciones
  const limpiar = () => {
    const firstId = fincasOpts?.[0]?.id ? Number(fincasOpts[0].id) : null;
    setFincaIds(firstId ? [firstId] : []);
    setSoloActiva(true);
  };

  return (
    <section className="-m-4 sm:-m-6 lg:-m-8 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            {/* Título + bienvenida */}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Dashboard</h1>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-base sm:text-lg font-semibold text-slate-800">
                    Bienvenido, <span className="text-emerald-700">{nombre}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">Indicadores rápidos de tareas e inventario</span>
                </div>

                {header?.rango?.default_ultimos_30_dias ? <Badge variante="info">Últimos 30 días</Badge> : null}
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-8">
                  <MultiSelectChips
                    label="Fincas"
                    value={fincaIds}
                    onChange={(vals) => {
                      if (!vals?.length && fincasOpts?.length) {
                        setFincaIds([Number(fincasOpts[0].id)]);
                        return;
                      }
                      setFincaIds(vals);
                    }}
                    options={fincasOptionsUI}
                    placeholder="Selecciona una o varias fincas"
                    tip={null}
                    maxChips={6}
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Cosecha</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={soloActiva}
                      onChange={(e) => setSoloActiva(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Solo cosecha activa
                  </label>
                </div>

                <div className="lg:col-span-1 flex gap-2 justify-start lg:justify-end">
                  <Boton variante="outline" onClick={limpiar}>
                    Limpiar
                  </Boton>
                </div>
              </div>
            </div>

            {/* Errores */}
            {error ? (
              <EstadoVacio tipo="error" titulo="No se pudo cargar el dashboard">
                {error}
              </EstadoVacio>
            ) : null}
          </div>
        </div>

        {/* Loading inicial */}
        {isFirstLoading ? (
          <EstadoVacio tipo="info" titulo="Cargando dashboard...">
            Consultando indicadores y construyendo el resumen.
          </EstadoVacio>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <TarjetaDato titulo="Total tareas" valor={n0(kpis.total_tareas)} icono={ClipboardList} color="gris" />
          <TarjetaDato titulo="Pendientes" valor={n0(kpis.pendientes)} icono={AlertTriangle} color="ambar" />
          <TarjetaDato titulo="En progreso" valor={n0(kpis.en_progreso)} icono={ClipboardList} color="azul" />
          <TarjetaDato titulo="Verificadas" valor={n0(kpis.verificadas)} icono={CheckCircle2} color="violeta" />
          <TarjetaDato titulo="Vencidas" valor={n0(kpis.vencidas)} icono={AlertTriangle} color="rojo" />
          <TarjetaDato
            titulo="Alertas inventario"
            valor={n0(kpis.alertas_inventario)}
            icono={Boxes}
            color="ambar"
            subtitulo={inv?.header?.nota || "Inventario global"}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Tareas por estado</h3>
              <Badge variante="info">Donut</Badge>
            </div>
            <ApexChart
              type="donut"
              height={280}
              series={donutEstados}
              options={{
                labels: donutLabels,
                legend: { position: "bottom" },
                dataLabels: { enabled: true },
                stroke: { width: 2 },
              }}
              className="mt-3"
            />
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Vencidas últimos 14 días</h3>
              <Badge variante="info">Barras</Badge>
            </div>

            {vencidasCats.length ? (
              <ApexChart
                type="bar"
                height={280}
                series={[{ name: "Vencidas", data: vencidasSerie }]}
                options={{
                  chart: { toolbar: { show: false } },
                  xaxis: { categories: vencidasCats },
                  dataLabels: { enabled: false },
                  stroke: { width: 2 },
                }}
                className="mt-3"
              />
            ) : (
              <div className="mt-4">
                <EstadoVacio tipo="info" titulo="Sin vencidas en los últimos 14 días">
                  No hay datos para graficar en este rango.
                </EstadoVacio>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Alertas inventario</h3>
              <Badge variante="info">Donut</Badge>
            </div>
            <ApexChart
              type="donut"
              height={280}
              series={donutAlertas}
              options={{
                labels: donutAlertasLabels,
                legend: { position: "bottom" },
                dataLabels: { enabled: true },
                stroke: { width: 2 },
              }}
              className="mt-3"
            />
          </div>
        </div>

        {/* ✅ Detalle alertas inventario (incluye FEFO table) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Detalle alertas inventario</h3>
              <p className="text-xs text-slate-500 mt-1">
                FEFO en los próximos <b>{n0(inv?.header?.fefo_dias || 30)}</b> días.
              </p>
            </div>
            <Badge variante="info">Inventario global</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* FEFO PROXIMO */}
            <div className="lg:col-span-12">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">FEFO próximo</h4>
                <Badge variante="warning">{invFefo.length} lote(s)</Badge>
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>Ítem</TablaHead>
                  <TablaHead>Código lote</TablaHead>
                  <TablaHead>Vence</TablaHead>
                  <TablaHead align="right">Cantidad</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {invFefo.length ? (
                    invFefo.map((x) => {
                      const cantidad = x.cantidad_actual ?? x.stock ?? x.cantidad ?? 0;

                      // ✅ Unidad: NO viene hoy en tu API.
                      // Si backend te manda unidad, ideal: x.unidad.codigo (o x.unidad_codigo)
                      // Si no, fallback: mostrar solo cantidad.
                      const unidadCodigo =
                        x?.unidad?.codigo || x?.unidad_codigo || x?.unidad || "";

                      return (
                        <TablaFila key={x.lote_id || `${x.item_id}-${x.codigo_lote}-${x.fecha_vencimiento}`}>
                          <TablaCelda nowrap={false} className="font-medium text-slate-900">
                            {x.item || "-"}
                          </TablaCelda>
                          <TablaCelda>{x.codigo_lote || "-"}</TablaCelda>
                          <TablaCelda>{x.fecha_vencimiento || "-"}</TablaCelda>
                          <TablaCelda align="right">{fmtCantidadUnidad(cantidad, unidadCodigo)}</TablaCelda>
                        </TablaFila>
                      );
                    })
                  ) : (
                    <TablaVacia mensaje="No hay lotes próximos a vencer (FEFO)." colSpan={4} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            {/* SIN STOCK */}
            <div className="lg:col-span-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">Sin stock</h4>
                <Badge variante="info">{invSinStock.length}</Badge>
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>Ítem</TablaHead>
                  <TablaHead align="right">Stock</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {invSinStock.length ? (
                    invSinStock.map((i) => {
                      const stock = i.stock_actual ?? i.stock ?? 0;
                      const unidadCodigo = i?.unidad?.codigo || i?.unidad_codigo || i?.unidad || "";
                      return (
                        <TablaFila key={i.item_id || i.id}>
                          <TablaCelda nowrap={false} className="font-medium text-slate-900">
                            {i.item || i.nombre || "-"}
                          </TablaCelda>
                          <TablaCelda align="right">{fmtCantidadUnidad(stock, unidadCodigo)}</TablaCelda>
                        </TablaFila>
                      );
                    })
                  ) : (
                    <TablaVacia mensaje="No hay ítems sin stock." colSpan={2} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            {/* BAJO MÍNIMO */}
            <div className="lg:col-span-6">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">Bajo mínimo</h4>
                <Badge variante="info">{invBajoMin.length}</Badge>
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>Ítem</TablaHead>
                  <TablaHead align="right">Stock</TablaHead>
                  <TablaHead align="right">Mínimo</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {invBajoMin.length ? (
                    invBajoMin.map((i) => {
                      const stock = i.stock_actual ?? i.stock ?? 0;
                      const min = i.stock_minimo ?? 0;
                      const unidadCodigo = i?.unidad?.codigo || i?.unidad_codigo || i?.unidad || "";
                      return (
                        <TablaFila key={i.item_id || i.id}>
                          <TablaCelda nowrap={false} className="font-medium text-slate-900">
                            {i.item || i.nombre || "-"}
                          </TablaCelda>
                          <TablaCelda align="right">{fmtCantidadUnidad(stock, unidadCodigo)}</TablaCelda>
                          <TablaCelda align="right">{fmtCantidadUnidad(min, unidadCodigo)}</TablaCelda>
                        </TablaFila>
                      );
                    })
                  ) : (
                    <TablaVacia mensaje="No hay ítems bajo mínimo." colSpan={3} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>
          </div>
        </div>

        {/* Tablas tareas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Tareas de hoy</h3>
              <Badge variante="info">{header?.hoy || toYmd(new Date())}</Badge>
            </div>

            <Tabla>
              <TablaCabecera>
                <TablaHead>Finca</TablaHead>
                <TablaHead>Lote</TablaHead>
                <TablaHead>Tipo</TablaHead>
                <TablaHead>Estado</TablaHead>
              </TablaCabecera>

              <TablaCuerpo>
                {Array.isArray(tareas?.hoy) && tareas.hoy.length ? (
                  tareas.hoy.map((t) => (
                    <TablaFila key={t.id}>
                      <TablaCelda nowrap={false} className="font-medium text-slate-900">
                        {t.finca || "-"}
                      </TablaCelda>
                      <TablaCelda>{t.lote || "-"}</TablaCelda>
                      <TablaCelda>
                        <Badge variante="info">{t.tipo || "-"}</Badge>
                      </TablaCelda>
                      <TablaCelda>
                        <Badge variante={badgeEstado(t.estado)}>{t.estado}</Badge>
                      </TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="No hay tareas programadas para hoy." colSpan={4} />
                )}
              </TablaCuerpo>
            </Tabla>
          </div>

          <div className="lg:col-span-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Pendientes críticos</h3>
              <Badge variante="warning">Vencidas / próximas</Badge>
            </div>

            <Tabla>
              <TablaCabecera>
                <TablaHead>Finca</TablaHead>
                <TablaHead>Lote</TablaHead>
                <TablaHead>Tipo</TablaHead>
                <TablaHead>Fecha</TablaHead>
                <TablaHead>Estado</TablaHead>
              </TablaCabecera>

              <TablaCuerpo>
                {Array.isArray(tareas?.pendientes_criticos) && tareas.pendientes_criticos.length ? (
                  tareas.pendientes_criticos.map((t) => (
                    <TablaFila key={t.id}>
                      <TablaCelda nowrap={false} className="font-medium text-slate-900">
                        {t.finca || "-"}
                      </TablaCelda>
                      <TablaCelda>{t.lote || "-"}</TablaCelda>
                      <TablaCelda>
                        <Badge variante="info">{t.tipo || "-"}</Badge>
                      </TablaCelda>
                      <TablaCelda>{t.fecha_programada ? String(t.fecha_programada).slice(0, 10) : "-"}</TablaCelda>
                      <TablaCelda>
                        <div className="flex items-center gap-2">
                          <Badge variante={badgeEstado(t.estado)}>{t.estado}</Badge>
                          {t.es_vencida ? <Badge variante="warning">Vencida</Badge> : null}
                        </div>
                      </TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="No hay críticos pendientes." colSpan={5} />
                )}
              </TablaCuerpo>
            </Tabla>
          </div>
        </div>

        {/* Resumen por finca */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Resumen por finca</h3>
            <Badge variante="info">{header?.rango?.default_ultimos_30_dias ? "Últimos 30 días" : "Rango"}</Badge>
          </div>

          <Tabla>
            <TablaCabecera>
              <TablaHead>Finca</TablaHead>
              <TablaHead align="center">Pendientes</TablaHead>
              <TablaHead align="center">En progreso</TablaHead>
              <TablaHead align="center">Completadas</TablaHead>
              <TablaHead align="center">Verificadas</TablaHead>
              <TablaHead align="center">Canceladas</TablaHead>
              <TablaHead align="center">Vencidas</TablaHead>
            </TablaCabecera>

            <TablaCuerpo>
              {Array.isArray(tareas?.resumen_por_finca) && tareas.resumen_por_finca.length ? (
                tareas.resumen_por_finca.map((r) => (
                  <TablaFila key={r.finca_id}>
                    <TablaCelda nowrap={false} className="font-medium text-slate-900">
                      {r.finca}
                      {r.cosecha_activa_id ? (
                        <span className="ml-2">
                          <Badge variante="info">Cosecha #{r.cosecha_activa_id}</Badge>
                        </span>
                      ) : null}
                    </TablaCelda>

                    <TablaCelda align="center">{n0(r.pendientes)}</TablaCelda>
                    <TablaCelda align="center">{n0(r.en_progreso)}</TablaCelda>
                    <TablaCelda align="center">{n0(r.completadas)}</TablaCelda>
                    <TablaCelda align="center">{n0(r.verificadas)}</TablaCelda>
                    <TablaCelda align="center">{n0(r.canceladas)}</TablaCelda>
                    <TablaCelda align="center">
                      {n0(r.vencidas) ? <Badge variante="warning">{n0(r.vencidas)}</Badge> : "0"}
                    </TablaCelda>
                  </TablaFila>
                ))
              ) : (
                <TablaVacia mensaje="No hay resumen por finca." colSpan={7} />
              )}
            </TablaCuerpo>
          </Tabla>

          {loading && data ? (
            <div className="mt-4">
              <EstadoVacio tipo="info" titulo="Actualizando dashboard...">
                Consultando cambios recientes.
              </EstadoVacio>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
