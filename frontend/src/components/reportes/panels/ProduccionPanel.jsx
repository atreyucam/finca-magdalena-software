// frontend/src/components/reportes/panels/ProduccionPanel.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  RefreshCcw,
  Calendar,
  Sprout,
  AlertTriangle,
  Truck,
  DollarSign,
  Boxes,
  MapPinned,
  ClipboardList,
  GitCompare,
  Building2,
  Wheat,
  Layers,
  BookDashedIcon
} from "lucide-react";

import EstadoPanelVacio from "../../reportes/ui/EstadoPanelVacio";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import TarjetaDato from "../../ui/TarjetaDato";
import ApexChart from "../../ui/ApexChart";
import EstadoVacio from "../../ui/EstadoVacio";

import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../../ui/Tabla";

import ReportPanelLayout from "../ui/ReportPanelLayout";
import ReportEmptyState from "../ui/ReportEmptyState";

import {
  listarFincasReporte,
  listarCosechasReporte,
  listarLotesReporte,
  compararProduccionFincas,
  compararProduccionCosechas,
  compararProduccionLotes,
} from "../../../api/apiClient";

// -------------------------
// Utils
// -------------------------
const n0 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtNum = (v, dec = 0) =>
  new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n0(v));

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n0(v));

const fmtPct = (v, dec = 2) => `${fmtNum(v, dec)}%`;

const fmtFecha = (iso) => (iso ? iso : "-");

const toYmd = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const default30dRange = () => {
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { desde: toYmd(desde), hasta: toYmd(hoy) };
};

const badgeCumpl = (pct) => {
  const p = n0(pct);
  if (p <= 0) return "default";
  if (p < 90) return "warning";
  if (p < 110) return "info";
  return "exito";
};

const badgeMerma = (pct) => {
  const p = n0(pct);
  if (p <= 0) return "exito";
  if (p < 5) return "info";
  if (p < 12) return "warning";
  return "peligro";
};

// -------------------------
// Panel
// -------------------------
export default function ProduccionPanel({
  filtrosProduccion,
  setFiltroProduccion,
  generar, // modo normal
  limpiar, // modo normal
  loading, // modo normal
  error, // modo normal
  payload, // modo normal
}) {
  // Catalogos
  const [fincas, setFincas] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [lotes, setLotes] = useState([]);

  // UI modo
  const [modo, setModo] = useState("normal"); // "normal" | "comparar"
  const [compararPor, setCompararPor] = useState("fincas"); // "fincas" | "cosechas" | "lotes"

  // Compare state
  const [cmpLoteIds, setCmpLoteIds] = useState([]);
  const [cmpPayload, setCmpPayload] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpError, setCmpError] = useState("");

  // Filtros actuales (desde props)
  const fincaId = filtrosProduccion?.finca_id || "";
  const cosechaId = filtrosProduccion?.cosecha_id || "";
  const loteId = filtrosProduccion?.lote_id || "";

  // Defaults de rango (solo 1 vez)
  const rangoInit = useMemo(() => default30dRange(), []);
  const desde = filtrosProduccion?.desde ?? rangoInit.desde;
  const hasta = filtrosProduccion?.hasta ?? rangoInit.hasta;

  // -------------------------
  // Effects: cargar catalogos
  // -------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await listarFincasReporte();
        const list = r?.data || r || [];
        if (!mounted) return;
        setFincas(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!fincaId) {
      setCosechas([]);
      setLotes([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const [rc, rl] = await Promise.all([
          listarCosechasReporte(fincaId),
          listarLotesReporte(fincaId),
        ]);

        const cose = rc?.data || rc || [];
        const lots = rl?.data || rl || [];

        if (!mounted) return;
        setCosechas(Array.isArray(cose) ? cose : []);
        setLotes(Array.isArray(lots) ? lots : []);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fincaId]);

  // Setear fechas default (solo si faltan)
  useEffect(() => {
    if (!filtrosProduccion) return;
    const r = default30dRange();
    if (!filtrosProduccion.desde) setFiltroProduccion("desde", r.desde);
    if (!filtrosProduccion.hasta) setFiltroProduccion("hasta", r.hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset select lotes multi al cambiar finca
  useEffect(() => {
    setCmpLoteIds([]);
  }, [fincaId]);

  // Limpia compare al cambiar modo / compararPor
  useEffect(() => {
    setCmpPayload(null);
    setCmpError("");
    setCmpLoading(false);
  }, [modo, compararPor]);

  // -------------------------
  // Datos modo normal
  // -------------------------
  const resumen = payload?.resumen;
  const porLote = payload?.porLote;
  const clasif = payload?.clasificacion;
  const merma = payload?.merma;
  const logistica = payload?.logistica;
  const eventos = payload?.eventos;

  const hayDatosNormal = !!resumen;

  // -------------------------
  // Charts modo normal
  // -------------------------
  const donutLabels = useMemo(
    () => (clasif?.clasificacion || []).map((x) => x.destino),
    [clasif]
  );
  const donutSeries = useMemo(
    () => (clasif?.clasificacion || []).map((x) => n0(x.kg)),
    [clasif]
  );

  const donutOptions = useMemo(() => {
    const totalKg = n0(clasif?.total_kg_clasificado);
    return {
      chart: { toolbar: { show: false } },
      labels: donutLabels,
      legend: { position: "bottom" },
      dataLabels: { enabled: true, formatter: (val) => `${fmtNum(val, 1)}%` },
      tooltip: { y: { formatter: (val) => `${fmtNum(val, 0)} kg` } },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                formatter: () => `${fmtNum(totalKg, 0)} kg`,
              },
            },
          },
        },
      },
      stroke: { width: 2 },
    };
  }, [donutLabels, clasif]);

  const barCategories = useMemo(
    () => (merma?.causas || []).map((x) => x.causa),
    [merma]
  );

  const barSeries = useMemo(() => {
    const arr = merma?.causas || [];
    return [{ name: "Merma (kg)", data: arr.map((x) => n0(x.kg)) }];
  }, [merma]);

  const barOptions = useMemo(() => {
    return {
      chart: { toolbar: { show: false } },
      xaxis: { categories: barCategories },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (val) => `${fmtNum(val, 0)} kg` } },
      grid: { strokeDashArray: 4 },
      plotOptions: { bar: { borderRadius: 8, columnWidth: "40%" } },
      yaxis: { labels: { formatter: (v) => fmtNum(v, 0) } },
    };
  }, [barCategories]);

  // -------------------------
  // Helpers compare
  // -------------------------
  const resetCompare = () => {
    setCmpPayload(null);
    setCmpError("");
    setCmpLoading(false);
  };

  const onLimpiar = () => {
    resetCompare();

    if (modo === "normal") {
      limpiar();
      return;
    }

    // comparar: resetea filtros principales + multi
    setCmpLoteIds([]);
    setFiltroProduccion("finca_id", "");
    setFiltroProduccion("cosecha_id", "");
    setFiltroProduccion("lote_id", "");
    const r = default30dRange();
    setFiltroProduccion("desde", r.desde);
    setFiltroProduccion("hasta", r.hasta);
  };

  const fetchComparar = async () => {
    setCmpError("");
    setCmpPayload(null);

    if (!desde || !hasta) {
      setCmpError("Selecciona un rango de fechas (desde / hasta).");
      return;
    }

    // comparar cosechas/lotes requieren finca
    if ((compararPor === "cosechas" || compararPor === "lotes") && !fincaId) {
      setCmpError("Para comparar por cosechas o lotes, primero selecciona una finca.");
      return;
    }

    setCmpLoading(true);
    try {
      if (compararPor === "fincas") {
        const r = await compararProduccionFincas({ desde, hasta });
        setCmpPayload(r?.data || r);
      } else if (compararPor === "cosechas") {
        const r = await compararProduccionCosechas({ finca_id: fincaId, desde, hasta });
        setCmpPayload(r?.data || r);
      } else {
        const params = {
          finca_id: fincaId,
          desde,
          hasta,
          ...(cosechaId ? { cosecha_id: cosechaId } : {}),
          ...(cmpLoteIds.length ? { lote_ids: cmpLoteIds.join(",") } : {}),
        };
        const r = await compararProduccionLotes(params);
        setCmpPayload(r?.data || r);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo comparar producción.";
      setCmpError(String(msg));
    } finally {
      setCmpLoading(false);
    }
  };

  const onConsultar = () => {
    if (modo === "normal") return generar(); // tu función existente
    return fetchComparar();
  };

  const bloqueaConsultar = useMemo(() => {
    if (modo === "normal") return !fincaId || !desde || !hasta || loading;
    if (!desde || !hasta) return true;
    if ((compararPor === "cosechas" || compararPor === "lotes") && !fincaId) return true;
    return cmpLoading;
  }, [modo, compararPor, fincaId, desde, hasta, loading, cmpLoading]);

  const cmpItems = cmpPayload?.items || [];

  const cmpTitulo = useMemo(() => {
    if (compararPor === "fincas") return "Comparación por fincas";
    if (compararPor === "cosechas") return "Comparación por cosechas";
    return "Comparación por lotes";
  }, [compararPor]);

  const cmpColLabel = useMemo(() => {
    if (compararPor === "fincas") return "FINCA";
    if (compararPor === "cosechas") return "COSECHA";
    return "LOTE";
  }, [compararPor]);

  const cmpRowName = (it) => {
    if (compararPor === "fincas") return it.finca;
    if (compararPor === "cosechas") return it.cosecha;
    return it.lote;
  };

  const nombreFincaSel =
    fincas.find((f) => String(f.id) === String(fincaId))?.nombre ||
    (fincaId ? String(fincaId) : "");

  const nombreCosechaSel =
    cosechas.find((c) => String(c.id) === String(cosechaId))?.nombre ||
    (cosechaId ? String(cosechaId) : "");

  // -------------------------
  // META chips estándar
  // -------------------------
  const meta = useMemo(() => {
    const chips = [{ label: "Rango", value: `${desde} → ${hasta}` }];
    chips.push({ label: "Modo", value: modo === "comparar" ? "Comparar" : "Normal" });

    if (modo === "comparar") {
      chips.push({
        label: "Comparar por",
        value: compararPor === "fincas" ? "Fincas" : compararPor === "cosechas" ? "Cosechas" : "Lotes",
      });
      if (compararPor !== "fincas" && fincaId) chips.push({ label: "Finca", value: nombreFincaSel });
      if (compararPor === "lotes" && cosechaId) chips.push({ label: "Cosecha", value: nombreCosechaSel });
    } else {
      if (fincaId) chips.push({ label: "Finca", value: nombreFincaSel });
      if (cosechaId) chips.push({ label: "Cosecha", value: nombreCosechaSel });
      if (loteId) chips.push({ label: "Lote", value: String(loteId) });
    }

    return chips;
  }, [desde, hasta, modo, compararPor, fincaId, cosechaId, loteId, nombreFincaSel, nombreCosechaSel]);

  // -------------------------
  // Render
  // -------------------------
  return (
    <ReportPanelLayout
      title="Producción / Cosecha"
      description={
        modo === "normal"
          ? "KPI, lotes, clasificación, merma, logística y eventos de cosecha."
          : "Compara producción entre fincas, cosechas o lotes en un rango."
      }
      meta={meta}
      primaryAction={{
        label: modo === "comparar" ? "Comparar" : "Consultar",
        onClick: onConsultar,
        disabled: bloqueaConsultar,
        loading: modo === "comparar" ? cmpLoading : loading,
        icon: modo === "comparar" ? GitCompare : Filter,
        variant: "primario",
      }}
      secondaryAction={{
        label: "Limpiar",
        onClick: onLimpiar,
        disabled: modo === "comparar" ? cmpLoading : loading,
        icon: RefreshCcw,
        variant: "secundario", // como tu screenshot (botón azul)
      }}
      filters={
        <div
          className={[
            "grid grid-cols-1 sm:grid-cols-2 gap-3",
            modo === "comparar" ? "lg:grid-cols-5" : "lg:grid-cols-4",
          ].join(" ")}
        >
          <Select label="Modo" value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="comparar">Comparar</option>
          </Select>

          {modo === "comparar" ? (
            <Select
              label="Comparar por"
              value={compararPor}
              onChange={(e) => setCompararPor(e.target.value)}
            >
              <option value="fincas">Fincas</option>
              <option value="cosechas">Cosechas</option>
              <option value="lotes">Lotes</option>
            </Select>
          ) : null}

          <Select
            label="Finca"
            value={fincaId}
            onChange={(e) => {
              setFiltroProduccion("finca_id", e.target.value);
              setFiltroProduccion("cosecha_id", "");
              setFiltroProduccion("lote_id", "");
            }}
            disabled={modo === "comparar" && compararPor === "fincas"}
          >
            <option value="">
              {modo === "comparar" && compararPor === "fincas" ? "Todas" : "Selecciona"}
            </option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </Select>

          <Select
            label="Cosecha"
            value={cosechaId}
            onChange={(e) => setFiltroProduccion("cosecha_id", e.target.value)}
            disabled={
              !fincaId ||
              (modo === "comparar" && compararPor === "cosechas") ||
              (modo === "comparar" && compararPor === "fincas")
            }
          >
            <option value="">Todas</option>
            {cosechas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>

          {modo === "comparar" && compararPor === "lotes" ? (
            <Select
              label="Lotes (multi)"
              multiple
              value={cmpLoteIds}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                setCmpLoteIds(values.filter(Boolean));
              }}
              disabled={!fincaId}
            >
              {(lotes || []).map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.nombre}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Lote"
              value={loteId}
              onChange={(e) => setFiltroProduccion("lote_id", e.target.value)}
              disabled={!fincaId || modo === "comparar"}
            >
              <option value="">Todos</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2 lg:col-span-full">
            <Input
              label="Desde"
              type="date"
              value={desde}
              onChange={(e) => setFiltroProduccion("desde", e.target.value)}
              icono={Calendar}
            />
            <Input
              label="Hasta"
              type="date"
              value={hasta}
              onChange={(e) => setFiltroProduccion("hasta", e.target.value)}
              icono={Calendar}
            />
          </div>
        </div>
      }
      wrapResults={false} // ✅ porque el contenido ya tiene sus propias cards/tablas
      resultsClassName="space-y-4"
    >
      {/* Errores */}
      {modo === "normal" && error ? (
        <EstadoVacio tipo="error" titulo="No se pudo generar el reporte">
          {error}
        </EstadoVacio>
      ) : null}

      {modo === "comparar" && cmpError ? (
        <EstadoVacio tipo="error" titulo="No se pudo comparar producción">
          {cmpError}
        </EstadoVacio>
      ) : null}

      {/* MODO COMPARAR */}
      {modo === "comparar" ? (
        !cmpPayload ? (
          <ReportEmptyState variant="idle" title="Aún no hay comparación">
            {compararPor === "fincas" ? (
              <>
                Selecciona <b>rango</b> y presiona <b>Comparar</b> para ver todas las fincas.
              </>
            ) : compararPor === "cosechas" ? (
              <>
                Selecciona <b>finca</b> + <b>rango</b> y presiona <b>Comparar</b>.
              </>
            ) : (
              <>
                Selecciona <b>finca</b> + <b>rango</b>. Opcional: <b>cosecha</b> y <b>lotes</b> (multi).
                Luego <b>Comparar</b>.
              </>
            )}
          </ReportEmptyState>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                {compararPor === "fincas" ? (
                  <Building2 size={18} />
                ) : compararPor === "cosechas" ? (
                  <Wheat size={18} />
                ) : (
                  <Layers size={18} />
                )}
                {cmpTitulo}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variante="info">{cmpItems.length} filas</Badge>
                <Badge variante="default">
                  {fmtFecha(cmpPayload?.filtros?.desde)} — {fmtFecha(cmpPayload?.filtros?.hasta)}
                </Badge>
                {compararPor !== "fincas" && fincaId ? (
                  <Badge variante="exito">Finca: {nombreFincaSel}</Badge>
                ) : null}
                {compararPor === "lotes" && cosechaId ? (
                  <Badge variante="info">Cosecha: {nombreCosechaSel}</Badge>
                ) : null}
              </div>
            </div>

            <Tabla>
              <TablaCabecera>
                <TablaHead>{cmpColLabel}</TablaHead>
                <TablaHead align="right">KG PLAN</TablaHead>
                <TablaHead align="right">KG COSECH</TablaHead>
                <TablaHead align="center">CUMPL.</TablaHead>
                <TablaHead align="right">MERMA</TablaHead>
                <TablaHead align="center">% MERMA</TablaHead>
                <TablaHead align="right">GAB NETAS</TablaHead>
                <TablaHead align="right">$ TOTAL</TablaHead>
                <TablaHead align="right">$ / KG</TablaHead>
              </TablaCabecera>

              <TablaCuerpo>
                {cmpItems.length ? (
                  cmpItems.map((it, idx) => (
                    <TablaFila key={`${cmpRowName(it) || "row"}-${idx}`}>
                      <TablaCelda className="font-semibold text-slate-900">
                        {cmpRowName(it) || "-"}
                      </TablaCelda>
                      <TablaCelda align="right">{fmtNum(it.kg_planificados, 0)}</TablaCelda>
                      <TablaCelda align="right">{fmtNum(it.kg_cosechados, 0)}</TablaCelda>
                      <TablaCelda align="center">
                        <Badge variante={badgeCumpl(it.cumplimiento_pct)}>
                          {fmtPct(it.cumplimiento_pct, 2)}
                        </Badge>
                      </TablaCelda>
                      <TablaCelda align="right">{fmtNum(it.kg_merma, 0)}</TablaCelda>
                      <TablaCelda align="center">
                        <Badge variante={badgeMerma(it.merma_pct)}>
                          {fmtPct(it.merma_pct, 2)}
                        </Badge>
                      </TablaCelda>
                      <TablaCelda align="right">{fmtNum(it.gabetas_netas, 0)}</TablaCelda>
                      <TablaCelda align="right" className="font-semibold text-slate-900">
                        {fmtMoney(it.total_dinero)}
                      </TablaCelda>
                      <TablaCelda align="right">{fmtNum(it.precio_promedio_kg, 4)}</TablaCelda>
                    </TablaFila>
                  ))
                ) : (
                  <TablaVacia mensaje="Sin datos para comparar en el rango seleccionado." colSpan={9} />
                )}
              </TablaCuerpo>
            </Tabla>

            {compararPor === "lotes" ? (
              <div className="text-xs text-slate-500">
                Tip: si no seleccionas <b>Lotes (multi)</b>, el backend compara <b>todos</b> los lotes de la finca
                (y si elegiste cosecha, filtra por esa cosecha).
              </div>
            ) : null}
          </div>
        )
      ) : null}

      {/* MODO NORMAL */}
      {modo === "normal" ? (
        !hayDatosNormal ? (
         <EstadoPanelVacio tipo="calendario" icono={BookDashedIcon} titulo="Aún no hay consulta">
    Selecciona <b>finca</b>, rango de <b>fechas</b> y presiona <b>Consultar</b>.
  </EstadoPanelVacio>
) : (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <TarjetaDato
                titulo="KG cosechados"
                valor={fmtNum(resumen?.produccion?.kg_cosechados, 0)}
                subtitulo={`Plan: ${fmtNum(resumen?.produccion?.kg_planificados, 0)} · Cumpl.: ${fmtPct(
                  resumen?.produccion?.cumplimiento_pct,
                  2
                )}`}
                icono={Sprout}
                color="verde"
              />

              <TarjetaDato
                titulo="Merma (kg)"
                valor={fmtNum(resumen?.merma?.kg_rechazados, 0)}
                subtitulo={`${fmtPct(resumen?.merma?.merma_pct, 2)} del cosechado`}
                icono={AlertTriangle}
                color="ambar"
              />

              <TarjetaDato
                titulo="Gabetas netas"
                valor={fmtNum(resumen?.logistica?.gabetas_netas, 0)}
                subtitulo={`Ent: ${fmtNum(resumen?.logistica?.gabetas_entregadas, 0)} · Dev: ${fmtNum(
                  resumen?.logistica?.gabetas_devueltas,
                  0
                )}`}
                icono={Truck}
                color="azul"
              />

              <TarjetaDato
                titulo="Total dinero"
                valor={fmtMoney(resumen?.economico?.total_dinero)}
                subtitulo={`Precio prom.: ${fmtNum(resumen?.economico?.precio_promedio_kg, 4)} / kg`}
                icono={DollarSign}
                color="violeta"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-extrabold text-slate-900">Clasificación (kg)</div>
                  <Badge variante="info">{fmtNum(clasif?.total_kg_clasificado, 2)} kg</Badge>
                </div>

                {donutSeries?.length ? (
                  <ApexChart type="donut" series={donutSeries} options={donutOptions} height={320} />
                ) : (
                  <EstadoVacio tipo="info">Sin datos de clasificación.</EstadoVacio>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-extrabold text-slate-900">Merma por causa (kg)</div>
                  <Badge variante="warn">{fmtNum(merma?.total_kg_merma, 2)} kg</Badge>
                </div>

                {barSeries?.[0]?.data?.length ? (
                  <ApexChart type="bar" series={barSeries} options={barOptions} height={320} />
                ) : (
                  <EstadoVacio tipo="info">Sin datos de merma.</EstadoVacio>
                )}
              </div>
            </div>

            {/* Producción por lote */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold">
                <Boxes size={18} /> Producción por lote
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>LOTE</TablaHead>
                  <TablaHead align="right">KG PLAN</TablaHead>
                  <TablaHead align="right">KG COSECH</TablaHead>
                  <TablaHead align="center">CUMPL.</TablaHead>
                  <TablaHead align="right">MERMA</TablaHead>
                  <TablaHead align="right">$ TOTAL</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {(porLote?.lotes || []).length ? (
                    porLote.lotes.map((l) => (
                      <TablaFila key={l.lote_id}>
                        <TablaCelda className="font-semibold text-slate-900">{l.lote}</TablaCelda>
                        <TablaCelda align="right">{fmtNum(l.kg_planificados, 0)}</TablaCelda>
                        <TablaCelda align="right">{fmtNum(l.kg_cosechados, 0)}</TablaCelda>
                        <TablaCelda align="center">
                          <Badge variante={badgeCumpl(l.cumplimiento_pct)}>
                            {fmtPct(l.cumplimiento_pct, 2)}
                          </Badge>
                        </TablaCelda>
                        <TablaCelda align="right">{fmtNum(l.kg_merma, 0)}</TablaCelda>
                        <TablaCelda align="right" className="font-semibold text-slate-900">
                          {fmtMoney(l.total_dinero)}
                        </TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin datos por lote." colSpan={6} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            {/* Logística */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold">
                <MapPinned size={18} /> Logística por centro
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>CENTRO</TablaHead>
                  <TablaHead align="right">ENTREGADAS</TablaHead>
                  <TablaHead align="right">DEVUELTAS</TablaHead>
                  <TablaHead align="right">NETAS</TablaHead>
                  <TablaHead align="right">% DEVOLUCIÓN</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {(logistica?.centros || []).length ? (
                    logistica.centros.map((c, idx) => (
                      <TablaFila key={`${c.centro}-${idx}`}>
                        <TablaCelda className="font-semibold text-slate-900">{c.centro}</TablaCelda>
                        <TablaCelda align="right">{fmtNum(c.gabetas_entregadas, 0)}</TablaCelda>
                        <TablaCelda align="right">{fmtNum(c.gabetas_devueltas, 0)}</TablaCelda>
                        <TablaCelda align="right">{fmtNum(c.gabetas_netas, 0)}</TablaCelda>
                        <TablaCelda align="right">{fmtPct(c.devolucion_pct, 2)}</TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin datos de logística." colSpan={5} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>

            {/* Eventos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold">
                <ClipboardList size={18} /> Eventos (tareas de cosecha)
              </div>

              <Tabla>
                <TablaCabecera>
                  <TablaHead>FECHA</TablaHead>
                  <TablaHead>LOTE</TablaHead>
                  <TablaHead align="center">ESTADO</TablaHead>
                  <TablaHead align="right">KG</TablaHead>
                  <TablaHead align="right">MERMA</TablaHead>
                  <TablaHead>CENTRO</TablaHead>
                  <TablaHead align="right">$</TablaHead>
                </TablaCabecera>

                <TablaCuerpo>
                  {(eventos?.eventos || []).length ? (
                    eventos.eventos.map((e) => (
                      <TablaFila key={e.tarea_id}>
                        <TablaCelda>{fmtFecha(e.fecha)}</TablaCelda>
                        <TablaCelda className="font-semibold text-slate-900">{e.lote}</TablaCelda>
                        <TablaCelda align="center">
                          <Badge variante={(e.estado || "").toLowerCase()}>{e.estado}</Badge>
                        </TablaCelda>
                        <TablaCelda align="right">{fmtNum(e.kg_cosechados, 0)}</TablaCelda>
                        <TablaCelda align="right">
                          {fmtNum(e.kg_merma, 0)}{" "}
                          <span className="text-xs text-slate-400">({fmtPct(e.merma_pct, 2)})</span>
                        </TablaCelda>
                        <TablaCelda>{e.centro_acopio || "-"}</TablaCelda>
                        <TablaCelda align="right" className="font-semibold text-slate-900">
                          {fmtMoney(e.total_dinero)}
                        </TablaCelda>
                      </TablaFila>
                    ))
                  ) : (
                    <TablaVacia mensaje="Sin eventos en el rango seleccionado." colSpan={7} />
                  )}
                </TablaCuerpo>
              </Tabla>
            </div>
          </div>
        )
      ) : null}
    </ReportPanelLayout>
  );
}
