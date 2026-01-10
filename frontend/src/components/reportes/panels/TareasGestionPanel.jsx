// frontend/src/components/reportes/panels/TareasGestionPanel.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarFincasReporte,
  listarCosechasReporte,
  listarLotesReporte,
} from "../../../api/apiClient";
import useAuthStore from "../../../store/authStore";


import Boton from "../../ui/Boton";
import Select from "../../ui/Select";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import EmptyState from "../../ui/EstadoVacio";
import useToast from "../../../hooks/useToast";
import Paginador from "../../ui/Paginador";
import {
  Tabla,
  TablaCabecera,
  TablaHead,
  TablaCuerpo,
  TablaFila,
  TablaCelda,
  TablaVacia,
} from "../../ui/Tabla";

import MiniTabs from "../MiniTabs";
import TareasAnaliticoPanel from "./TareasAnaliticoPanel";

import {
  Sprout,
  Layers,
  Warehouse,
  ClipboardList,
  CalendarRange,
  FileSearch,
  Eye,
} from "lucide-react";

// util: fecha YYYY-MM-DD
const toYmd = (d) => {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// helpers fecha
const addDays = (ymd, days) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

const todayYmd = () => toYmd(new Date());

// compara YYYY-MM-DD (string) por fecha real
const maxYmd = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

const PRESETS = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "inicio", label: "Inicio de cosecha" },
  { value: "custom", label: "Personalizado" },
];

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const TIPOS = [
  { codigo: "", nombre: "Todas" },
  { codigo: "poda", nombre: "Poda" },
  { codigo: "maleza", nombre: "Control de maleza" },
  { codigo: "nutricion", nombre: "Nutrición" },
  { codigo: "fitosanitario", nombre: "Fitosanitario" },
  { codigo: "enfundado", nombre: "Enfundado" },
  { codigo: "cosecha", nombre: "Cosecha" },
];

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Asignada", label: "Asignada" },
  { value: "En progreso", label: "En progreso" },
  { value: "Completada", label: "Completada" },
  { value: "Verificada", label: "Verificada" },
  { value: "Cancelada", label: "Cancelada" },
];

export default function TareasGestionPanel({
  filtros,
  setFiltros,
  generar,
  loading,
  error,
  payload,
}) {
  const notify = useToast();
  const navigate = useNavigate();

  // catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [cosechaActivaId, setCosechaActivaId] = useState(null);

  // preset UI
  const [preset, setPreset] = useState("30d");

  // mostrar resumen SOLO cuando se haga consulta
  const [showResumen, setShowResumen] = useState(false);
  const [hasConsulted, setHasConsulted] = useState(false);

  // ✅ mini tab: analítico/detalle
  const [subTab, setSubTab] = useState("analitico");
  const user = useAuthStore((s) => s.user);


  // defaults: últimos 30 días
  const defaultDesde = useMemo(() => addDays(todayYmd(), -29), []);
  const defaultHasta = useMemo(() => todayYmd(), []);

  // filtros aplicados vs borrador (UI)
  const [applied, setApplied] = useState(() => ({
    finca_id: String(filtros?.finca_id ?? ""),
    cosecha_id: String(filtros?.cosecha_id ?? ""),
    lote_ids: filtros?.lote_ids ?? [],
    tipo_codigo: filtros?.tipo_codigo ?? "",
    estado: filtros?.estado ?? "",
    desde: filtros?.desde ?? defaultDesde,
    hasta: filtros?.hasta ?? defaultHasta,
    page: filtros?.page ?? 1,
    pageSize: filtros?.pageSize ?? 20,
  }));

  const [draft, setDraft] = useState(applied);

  // cargar lotes/cosechas por finca
  const loadFiltrosDeFinca = useCallback(async (fincaId) => {
    const [cRes, lRes] = await Promise.all([
      listarCosechasReporte(fincaId),
      listarLotesReporte(fincaId),
    ]);

    setCosechas(cRes?.data || []);
    setCosechaActivaId(cRes?.cosecha_activa_id || null);
    setLotes(lRes || []);

    return { cosecha_activa_id: cRes?.cosecha_activa_id || null };
  }, []);

  // fecha_inicio cosecha seleccionada (o activa si vacío)
  const getFechaInicioCosechaSeleccionada = useCallback(
    (draftCosechaId) => {
      const id = draftCosechaId || cosechaActivaId;
      if (!id) return null;
      const c = cosechas.find((x) => String(x.id) === String(id));
      return c?.fecha_inicio ? String(c.fecha_inicio).slice(0, 10) : null;
    },
    [cosechas, cosechaActivaId]
  );

  const computeRangeFromPreset = useCallback(
    (presetValue, draftCosechaId) => {
      const hoy = todayYmd();
      if (presetValue === "hoy") return { desde: hoy, hasta: hoy };
      if (presetValue === "7d") return { desde: addDays(hoy, -6), hasta: hoy };
      if (presetValue === "30d") return { desde: addDays(hoy, -29), hasta: hoy };

      if (presetValue === "inicio") {
        const inicio = getFechaInicioCosechaSeleccionada(draftCosechaId);
        const hoyMenos30 = addDays(hoy, -30);
        return { desde: maxYmd(inicio, hoyMenos30), hasta: hoy };
      }

      return { desde: "", hasta: hoy };
    },
    [getFechaInicioCosechaSeleccionada]
  );

  const applyPreset = useCallback(
    (presetValue) => {
      const r = computeRangeFromPreset(presetValue, draft.cosecha_id);
      setPreset(presetValue);
      setDraft((d) => ({ ...d, ...r, page: 1 }));
      setShowResumen(false);
    },
    [computeRangeFromPreset, draft.cosecha_id]
  );

  const dirty = useMemo(() => {
    return !deepEqual(
      { ...draft, page: applied.page, pageSize: applied.pageSize },
      { ...applied }
    );
  }, [draft, applied]);

  // resultado
  const result = useMemo(() => {
    return (
      payload || {
        header: null,
        stats: null,
        data: [],
        total: 0,
        page: applied.page,
        pageSize: applied.pageSize,
        totalPages: 1,
      }
    );
  }, [payload, applied.page, applied.pageSize]);

  // ✅ columnas dinámicas + Acciones
  const columns = useMemo(() => {
    const base = [
      { key: "fecha_programada", label: "Fecha" },
      { key: "lote", label: "Lote" },
      { key: "tipo", label: "Tipo" },
      { key: "estado", label: "Estado" },
      { key: "titulo", label: "Título" },
      { key: "creador", label: "Creador" },
    ];

    const t = applied.tipo_codigo;

    let cols = base;

    if (t === "poda")
      cols = [
        ...base,
        { key: "poda_tipo", label: "Tipo poda" },
        { key: "poda_plan", label: "% Plan" },
        { key: "poda_real", label: "% Real" },
        { key: "poda_desinf", label: "Desinfectadas" },
      ];

    if (t === "maleza")
      cols = [
        ...base,
        { key: "maleza_metodo", label: "Método" },
        { key: "maleza_plan", label: "% Plan" },
        { key: "maleza_real", label: "% Real" },
      ];

    if (t === "nutricion")
      cols = [
        ...base,
        { key: "nutr_metodo", label: "Método" },
        { key: "nutr_epp", label: "EPP" },
        { key: "nutr_plan", label: "% Plan" },
        { key: "nutr_real", label: "% Real" },
      ];

    if (t === "fitosanitario")
      cols = [
        ...base,
        { key: "fito_plaga", label: "Plaga/Enf." },
        { key: "fito_carencia", label: "Carencia (días)" },
        { key: "fito_epp", label: "EPP" },
      ];

    if (t === "enfundado")
      cols = [
        ...base,
        { key: "enf_material", label: "Material" },
        { key: "enf_plan", label: "% Plan" },
        { key: "enf_real", label: "% Real" },
      ];

    if (t === "cosecha")
      cols = [
        ...base,
        { key: "cos_kg_plan", label: "Kg Plan" },
        { key: "cos_kg_real", label: "Kg Real" },
        { key: "cos_centro", label: "Centro" },
        { key: "cos_total", label: "Total $" },
      ];

    // ✅ al final, acciones
    return [...cols, { key: "__acciones", label: "Acciones" }];
  }, [applied.tipo_codigo]);

  // filas UI
  const rowsUi = useMemo(() => {
    return (result?.data || []).map((r) => {
      const d = r.detalles || {};
      return {
        ...r,
        fecha_programada: r.fecha_programada ? String(r.fecha_programada).slice(0, 10) : "",
        poda_tipo: d.tipo || "",
        poda_plan: d.porcentaje_plantas_plan_pct ?? "",
        poda_real: d.porcentaje_plantas_real_pct ?? "",
        poda_desinf: d.herramientas_desinfectadas ? "Sí" : "No",
        maleza_metodo: d.metodo || "",
        maleza_plan: d.cobertura_planificada_pct ?? "",
        maleza_real: d.cobertura_real_pct ?? "",
        nutr_metodo: d.metodo_aplicacion || "",
        nutr_epp: d.epp_verificado ? "Sí" : "No",
        nutr_plan: d.porcentaje_plantas_plan_pct ?? "",
        nutr_real: d.porcentaje_plantas_real_pct ?? "",
        fito_plaga: d.plaga_enfermedad || "",
        fito_carencia: d.periodo_carencia_dias ?? "",
        fito_epp: d.epp_verificado ? "Sí" : "No",
        enf_material: d.material_funda || "",
        enf_plan: d.porcentaje_frutos_plan_pct ?? "",
        enf_real: d.porcentaje_frutos_real_pct ?? "",
        cos_kg_plan: d.kg_planificados ?? "",
        cos_kg_real: d.kg_cosechados ?? "",
        cos_centro: d.entrega?.centro_acopio || "",
        cos_total: d.total_dinero ?? "",
      };
    });
  }, [result?.data]);

  // header UI
  const headerUi = useMemo(() => {
    const finca = fincas.find((x) => String(x.id) === String(applied.finca_id));
    const cosecha =
      cosechas.find((x) => String(x.id) === String(applied.cosecha_id)) ||
      (applied.cosecha_id
        ? null
        : cosechas.find((x) => String(x.id) === String(cosechaActivaId)));

    const tipo = TIPOS.find((t) => String(t.codigo) === String(applied.tipo_codigo));

    const lotesTxt = applied.lote_ids?.length
      ? applied.lote_ids
          .map((id) => lotes.find((l) => String(l.id) === String(id))?.nombre || `#${id}`)
          .join(", ")
      : "Todos";

    const desde = applied.desde || "-";
    const hasta = applied.hasta || "-";

    return {
      finca: finca?.nombre || "-",
      lotes: lotesTxt,
      cosecha: cosecha ? `${cosecha.codigo} — ${cosecha.estado}` : "(Auto) Activa",
      tipo: tipo?.nombre || "Todas",
      rango: `${desde} → ${hasta}`,
      total: result?.total ?? 0,
    };
  }, [applied, fincas, cosechas, lotes, result?.total, cosechaActivaId]);

  // mount: cargar fincas y defaults (SIN consultar)
  useEffect(() => {
    (async () => {
      try {
        const f = await listarFincasReporte();
        setFincas(f || []);

        const fincaDefault = f?.[0]?.id ? String(f[0].id) : "";
        if (!fincaDefault) return;

        const { cosecha_activa_id } = await loadFiltrosDeFinca(fincaDefault);

        const r0 = computeRangeFromPreset("30d");
        setPreset("30d");

        const next = {
          finca_id: Number(fincaDefault),
          cosecha_id: cosecha_activa_id ? String(cosecha_activa_id) : "",
          lote_ids: [],
          tipo_codigo: "",
          estado: "",
          desde: r0.desde,
          hasta: r0.hasta,
          page: 1,
          pageSize: 20,
        };

        const nextUi = {
          finca_id: String(next.finca_id),
          cosecha_id: next.cosecha_id,
          lote_ids: next.lote_ids,
          tipo_codigo: next.tipo_codigo,
          estado: next.estado,
          desde: next.desde,
          hasta: next.hasta,
          page: next.page,
          pageSize: next.pageSize,
        };

        setApplied(nextUi);
        setDraft(nextUi);
        setFiltros(next);

        setShowResumen(false);
        setHasConsulted(false);
        setSubTab("analitico");
      } catch (e) {
        notify.error(
          "error",
          e?.response?.data?.message || e.message || "Error cargando filtros de reportes"
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeFinca = useCallback(
    async (fincaId) => {
      setShowResumen(false);
      setDraft((d) => ({ ...d, finca_id: fincaId, lote_ids: [], cosecha_id: "", page: 1 }));

      try {
        const { cosecha_activa_id } = await loadFiltrosDeFinca(fincaId);

        const nuevaCosechaId = cosecha_activa_id ? String(cosecha_activa_id) : "";
        const r = computeRangeFromPreset("30d");

        setPreset("30d");
        setDraft((d) => ({
          ...d,
          cosecha_id: nuevaCosechaId,
          desde: r.desde,
          hasta: r.hasta,
          page: 1,
        }));
      } catch {
        notify.error("error", "No se pudo cargar lotes/cosechas de la finca");
      }
    },
    [computeRangeFromPreset, loadFiltrosDeFinca, notify]
  );

  // Consultar
  const onConsultar = useCallback(async () => {
    const nextUi = { ...draft, page: 1 };
    setApplied(nextUi);

    const nextHook = {
      finca_id: Number(nextUi.finca_id),
      cosecha_id: nextUi.cosecha_id,
      lote_ids: (nextUi.lote_ids || []).map(Number).filter(Boolean),
      tipo_codigo: nextUi.tipo_codigo,
      estado: nextUi.estado,
      desde: nextUi.desde,
      hasta: nextUi.hasta,
      page: 1,
      pageSize: Number(nextUi.pageSize),
    };

    setFiltros(nextHook);

    setShowResumen(true);
    setHasConsulted(true);

    try {
      await generar(nextHook);
    } catch (e) {}
  }, [draft, generar, setFiltros]);

  const onLimpiar = useCallback(() => {
    setShowResumen(false);
    setHasConsulted(false);
    setSubTab("analitico");

    setPreset("30d");
    const r = computeRangeFromPreset("30d");

    setDraft((d) => ({
      ...d,
      tipo_codigo: "",
      estado: "",
      lote_ids: [],
      desde: r.desde,
      hasta: r.hasta,
      page: 1,
    }));
  }, [computeRangeFromPreset]);

  // paginación
  const onPageChange = useCallback(
    async (newPage) => {
      if (!hasConsulted) return;

      const nextUi = { ...applied, page: newPage };
      setApplied(nextUi);

      const nextHook = {
        finca_id: Number(nextUi.finca_id),
        cosecha_id: nextUi.cosecha_id,
        lote_ids: nextUi.lote_ids,
        tipo_codigo: nextUi.tipo_codigo,
        estado: nextUi.estado,
        desde: nextUi.desde,
        hasta: nextUi.hasta,
        page: newPage,
        pageSize: Number(nextUi.pageSize),
      };

      setFiltros(nextHook);
      await generar(nextHook);

      setShowResumen(true);
      setHasConsulted(true);
    },
    [applied, generar, hasConsulted, setFiltros]
  );

  const onPageSizeChange = useCallback(
    async (pageSize) => {
      if (!hasConsulted) return;

      const nextUi = { ...applied, pageSize: Number(pageSize), page: 1 };
      setApplied(nextUi);

      const nextHook = {
        finca_id: Number(nextUi.finca_id),
        cosecha_id: nextUi.cosecha_id,
        lote_ids: nextUi.lote_ids,
        tipo_codigo: nextUi.tipo_codigo,
        estado: nextUi.estado,
        desde: nextUi.desde,
        hasta: nextUi.hasta,
        page: 1,
        pageSize: Number(pageSize),
      };

      setFiltros(nextHook);
      await generar(nextHook);

      setShowResumen(true);
      setHasConsulted(true);
    },
    [applied, generar, hasConsulted, setFiltros]
  );

  const toggleLote = useCallback((id) => {
    const sid = String(id);
    setShowResumen(false);

    setDraft((d) => {
      const exists = (d.lote_ids || []).map(String).includes(sid);
      const next = exists ? d.lote_ids.filter((x) => String(x) !== sid) : [...(d.lote_ids || []), sid];
      return { ...d, lote_ids: next, page: 1 };
    });
  }, []);

  // ✅ redirect al detalle (cambia la ruta si tu app usa otra)
 const goToDetalleTarea = useCallback(
  (id) => {
    const base =
      user?.role === "Propietario" ? "/owner" :
      user?.role === "Tecnico" ? "/tech" :
      ""; // fallback

    navigate(`${base}/detalleTarea/${id}`);
  },
  [navigate, user?.role]
);


  if (!applied.finca_id && fincas.length === 0) {
    return <EmptyState>No hay fincas disponibles para reportes.</EmptyState>;
  }

  return (
    <div className="mt-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
          ⚠️ <strong>Error:</strong> {error}
        </div>
      )}

      {/* ✅ MiniTabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <MiniTabs tab={subTab} setTab={setSubTab} />
        {loading && <Badge variante="info">Cargando...</Badge>}
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <span className="text-lg">📑</span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  Reporte de Tareas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtros de búsqueda y rango de fechas
                </p>

                <div className="mt-2 flex items-center gap-2">
                  {dirty && <Badge variante="warning">Cambios sin aplicar</Badge>}
                  {loading && <Badge variante="info">Cargando...</Badge>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Boton onClick={onLimpiar} variante="secundario">
                Limpiar
              </Boton>
              <Boton onClick={onConsultar} disabled={!draft.finca_id || loading}>
                Consultar
              </Boton>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="Finca"
              value={draft.finca_id}
              onChange={(e) => onChangeFinca(e.target.value)}
            >
              <option value="">Seleccione</option>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </Select>

            <Select
              label="Cosecha"
              value={draft.cosecha_id}
              onChange={(e) => {
                const val = e.target.value;
                setShowResumen(false);

                if (preset === "inicio") {
                  const r = computeRangeFromPreset("inicio", val);
                  setDraft((d) => ({ ...d, cosecha_id: val, ...r, page: 1 }));
                } else {
                  setDraft((d) => ({ ...d, cosecha_id: val, page: 1 }));
                }
              }}
            >
              <option value="">(Auto) Activa</option>
              {cosechas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.estado}
                </option>
              ))}
            </Select>

            <Select
              label="Tipo de tarea"
              value={draft.tipo_codigo}
              onChange={(e) => {
                setShowResumen(false);
                setDraft((d) => ({ ...d, tipo_codigo: e.target.value, page: 1 }));
              }}
            >
              {TIPOS.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </option>
              ))}
            </Select>

            <Select
              label="Estado"
              value={draft.estado}
              onChange={(e) => {
                setShowResumen(false);
                setDraft((d) => ({ ...d, estado: e.target.value, page: 1 }));
              }}
            >
              {ESTADOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Rango rápido"
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>

            <Input
              label="Desde"
              type="date"
              value={draft.desde}
              onChange={(e) => {
                setShowResumen(false);
                setPreset("custom");
                setDraft((d) => ({ ...d, desde: e.target.value, page: 1 }));
              }}
            />

            <Input
              label="Hasta"
              type="date"
              value={draft.hasta}
              onChange={(e) => {
                setShowResumen(false);
                setPreset("custom");
                setDraft((d) => ({ ...d, hasta: e.target.value, page: 1 }));
              }}
            />
          </div>

          <div className="pt-1">
            <div className="h-px bg-slate-200" />
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Lotes (multi-selección)
              </div>

              <div className="flex gap-2">
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setShowResumen(false);
                    setDraft((d) => ({ ...d, lote_ids: [], page: 1 }));
                  }}
                  disabled={!draft.lote_ids.length}
                >
                  Todos
                </Boton>

                <Boton
                  variante="secundario"
                  onClick={() => {
                    setShowResumen(false);
                    setDraft((d) => ({
                      ...d,
                      lote_ids: lotes.map((l) => l.id),
                      page: 1,
                    }));
                  }}
                  disabled={!lotes.length}
                >
                  Seleccionar todos
                </Boton>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {lotes.length === 0 && (
                <span className="text-sm text-slate-500">
                  No hay lotes para esta finca.
                </span>
              )}

              {lotes.map((l) => {
                const active = (draft.lote_ids || []).map(String).includes(String(l.id));
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLote(l.id)}
                    className={[
                      "px-3 py-1.5 rounded-full border text-sm transition",
                      active
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {l.nombre}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-slate-600">
              {draft.lote_ids?.length
                ? `Seleccionados: ${draft.lote_ids.length}`
                : "Modo: Todos los lotes"}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ RESUMEN */}
      {showResumen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Sprout className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Finca</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {headerUi.finca}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Warehouse className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Cosecha</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {headerUi.cosecha}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Lote</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {headerUi.lotes}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Tarea</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {headerUi.tipo}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <CalendarRange className="h-5 w-5 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 uppercase">Rango</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {headerUi.rango}
                  </div>
                  <div className="text-xs text-slate-500">Total: {headerUi.total}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CONTENIDO según subTab */}
      {subTab === "analitico" ? (
        !payload ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <FileSearch className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  Analítico aún no disponible
                </div>
                <div className="text-sm text-slate-500 mt-1 max-w-xl">
                  Configura los filtros y presiona{" "}
                  <span className="font-semibold text-slate-700">Consultar</span>{" "}
                  para generar estadísticas.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <TareasAnaliticoPanel stats={result?.stats} loading={loading} />
        )
      ) : !payload ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <FileSearch className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900">
                Aún no has generado un reporte
              </div>
              <div className="text-sm text-slate-500 mt-1 max-w-xl">
                Configura los filtros y presiona{" "}
                <span className="font-semibold text-slate-700">Consultar</span>{" "}
                para ver la tabla transaccional.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-slate-800">
                Resultados ({result?.total ?? 0})
              </div>
              {loading && <Badge variante="info">Cargando...</Badge>}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filas por página</span>
              <select
                className="border border-slate-300 rounded-xl px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={applied.pageSize}
                onChange={(e) => onPageSizeChange(e.target.value)}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Tabla className="rounded-none border-0 shadow-none">
            <TablaCabecera>
              {columns.map((c) => (
                <TablaHead key={c.key} className="whitespace-nowrap">
                  {c.label}
                </TablaHead>
              ))}
            </TablaCabecera>

            <TablaCuerpo>
              {!rowsUi.length && !loading ? (
                <TablaVacia colSpan={columns.length} mensaje="No hay resultados con estos filtros." />
              ) : (
                rowsUi.map((r) => (
                  <TablaFila key={r.id}>
                    {columns.map((c) => {
                      // ✅ Acciones
                      if (c.key === "__acciones") {
                        return (
                          <TablaCelda key={c.key} className="whitespace-nowrap">
                            <Boton
                              variante="fantasma"
                              className="px-3 py-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToDetalleTarea(r.id);
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Ver
                              </span>
                            </Boton>
                          </TablaCelda>
                        );
                      }

                      if (c.key === "estado") {
                        return (
                          <TablaCelda key={c.key}>
                            <Badge variante={String(r.estado || "")}>
                              {String(r.estado || "")}
                            </Badge>
                          </TablaCelda>
                        );
                      }

                      return (
                        <TablaCelda key={c.key}>
                          {String(r[c.key] ?? "")}
                        </TablaCelda>
                      );
                    })}
                  </TablaFila>
                ))
              )}
            </TablaCuerpo>
          </Tabla>

          <Paginador
            paginaActual={result?.page ?? 1}
            totalPaginas={result?.totalPages ?? 1}
            onCambiarPagina={onPageChange}
            totalRegistros={result?.total ?? 0}
            mostrarSiempre
          />
        </div>
      )}
    </div>
  );
}
